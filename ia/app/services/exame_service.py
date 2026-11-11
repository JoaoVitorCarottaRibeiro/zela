"""Entenda seu exame: a IA lê um resultado de exame (imagem ou PDF) e EXPLICA
em linguagem simples.

Ética (igual ao resto da Zela, reforçada aqui porque é dado sensível): a IA
EXPLICA e ORIENTA, NUNCA diagnostica, NUNCA indica remédio e NUNCA diz que está
tudo bem / que não precisa de médico. Usa só a faixa de referência impressa no
próprio exame — não inventa valores de memória.
"""
from __future__ import annotations

import json
import logging
import time

from app.core.config import settings
from app.schemas import ItemExame, Nivel, ResultadoExame

logger = logging.getLogger(__name__)

PROMPT_EXAME = (
    "Você é o Zela ajudando uma pessoa de comunidade a ENTENDER um resultado de exame "
    "de saúde. Você NÃO é médico: você EXPLICA em linguagem simples e acolhedora, nunca "
    "diagnostica, nunca indica remédio e NUNCA diz que está tudo bem ou que não precisa "
    "de médico.\n\n"
    "Leia o exame enviado (imagem ou PDF). Extraia os itens/marcadores que conseguir ler "
    "com clareza (ex.: Hemoglobina, Glicose, Colesterol, TSH). Para cada item:\n"
    "- Use SOMENTE o valor e a FAIXA DE REFERÊNCIA que estão impressos no próprio exame. "
    "NÃO invente faixas de referência de memória; se o exame não trouxer a faixa, deixe o "
    "campo de referência vazio e marque a situação como 'atencao'.\n"
    "- Classifique 'situacao': 'dentro' (dentro da faixa do exame), 'fora' (fora da faixa) "
    "ou 'atencao' (limítrofe, ou você não teve certeza da leitura).\n"
    "- Em 'explicacao', diga em UMA frase simples o que aquele item mede.\n"
    "Se a imagem estiver ruim ou não for um exame, diga isso no resumo e devolva itens vazios.\n\n"
    "SEGURANÇA: fale com cuidado e acolhimento. Se algum item estiver fora da faixa ou você "
    "estiver em dúvida, oriente a pessoa a procurar um profissional de saúde (precisa_cuidado "
    "= true). NUNCA tranquilize dizendo que está tudo normal — mesmo com tudo dentro da faixa, "
    "lembre que só um profissional interpreta o exame por completo.\n\n"
    "Responda SEMPRE em JSON: {\"itens\":[{\"nome\":\"\",\"valor\":\"\",\"referencia\":\"\","
    "\"situacao\":\"dentro|fora|atencao\",\"explicacao\":\"\"}],\"resumo\":\"visão geral curta, "
    "acolhedora e em linguagem simples\",\"precisa_cuidado\":true|false,\"nivel\":\"verde|amarelo|vermelho\"}\n"
    "'nivel': 'verde' se tudo dentro da faixa (ainda assim recomende levar o exame ao "
    "profissional), 'amarelo' se houver algo fora que mereça procurar a UBS, 'vermelho' só se "
    "houver um valor muito alterado que peça avaliação com urgência."
)

_CAUTELA = (
    "Não consegui ler o exame agora. Tente uma foto mais nítida, com boa luz, ou um PDF. "
    "Na dúvida, leve o exame a um profissional de saúde."
)


def _texto(v: object) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def analisar(dados: bytes, mime: str, tentativas: int = 3) -> ResultadoExame:
    if not settings.gemini_api_key:
        return ResultadoExame(
            resumo="A leitura de exames está indisponível neste ambiente.",
            origem="indisponivel",
        )
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("google-genai não instalado; leitura de exame indisponível.")
        return ResultadoExame(resumo="A leitura de exames está indisponível.", origem="indisponivel")

    client = genai.Client(api_key=settings.gemini_api_key)
    config = types.GenerateContentConfig(
        system_instruction=PROMPT_EXAME,
        response_mime_type="application/json",
        temperature=0.2,
    )

    for tentativa in range(1, tentativas + 1):
        try:
            resposta = client.models.generate_content(
                model=settings.gemini_model,
                contents=[
                    types.Part.from_bytes(data=dados, mime_type=mime),
                    "Leia e explique este exame em linguagem simples.",
                ],
                config=config,
            )
            d = json.loads(resposta.text)

            itens: list[ItemExame] = []
            for it in d.get("itens", []):
                if not isinstance(it, dict):
                    continue
                situacao = it.get("situacao")
                if situacao not in ("dentro", "fora", "atencao"):
                    situacao = "atencao"
                itens.append(
                    ItemExame(
                        nome=_texto(it.get("nome")) or "Item do exame",
                        valor=_texto(it.get("valor")),
                        referencia=_texto(it.get("referencia")),
                        situacao=situacao,
                        explicacao=_texto(it.get("explicacao")) or "",
                    )
                )

            nivel = None
            if d.get("nivel") in ("verde", "amarelo", "vermelho"):
                nivel = Nivel(d["nivel"])

            tem_fora = any(i.situacao in ("fora", "atencao") for i in itens)
            return ResultadoExame(
                itens=itens,
                resumo=_texto(d.get("resumo")) or "Aqui está o que consegui ler do seu exame.",
                precisa_cuidado=bool(d.get("precisa_cuidado", False)) or tem_fora,
                nivel=nivel,
                origem="ia",
            )
        except Exception as e:
            logger.warning("Falha ao analisar exame (tentativa %d/%d): %s", tentativa, tentativas, e)
            if tentativa < tentativas:
                time.sleep(1.5)

    return ResultadoExame(resumo=_CAUTELA, precisa_cuidado=True, origem="erro")
