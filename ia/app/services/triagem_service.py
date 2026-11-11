"""Lógica de triagem: rede de segurança por regras + IA (Gemini), com fallback offline.

Ética: o Zela ORIENTA e PRIORIZA, nunca diagnostica nem prescreve.
Regra de ouro: um sinal de alerta (vermelho) detectado pelas regras NUNCA é
rebaixado pela IA. A IA só decide entre verde e amarelo (e pode subir para vermelho).
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field

from app.core.config import settings
from app.dominio.triagem import classificar_por_sinais
from app.schemas import EntradaTriagem, MensagemConversa, Nivel, ResultadoTriagem

logger = logging.getLogger(__name__)

PROMPT_SISTEMA = (
    "Você é o Zela, um assistente de TRIAGEM de saúde para comunidades. "
    "Você NÃO é médico: você ORIENTA e PRIORIZA, nunca diagnostica nem indica remédio. "
    "Fale em português simples, como um agente comunitário de saúde falaria, pensando "
    "em alguém que pode não saber ler bem. Classifique o caso em um nível: "
    "'verde' (pode cuidar em casa com orientação), "
    "'amarelo' (deve procurar a UBS com prioridade) ou "
    "'vermelho' (emergência: telessaúde ou SAMU 192). "
    "Na dúvida entre dois níveis, escolha o mais grave. "
    "Responda SEMPRE em JSON com os campos: nivel, orientacao, justificativa."
)


def triar_por_regras(entrada: EntradaTriagem) -> ResultadoTriagem:
    """Rede de segurança: aplica as REGRAS DO DOMÍNIO (app/dominio/triagem.py) e
    embrulha o resultado no DTO da API. Funciona offline e é determinística."""
    c = classificar_por_sinais(entrada.sintomas)
    return ResultadoTriagem(
        nivel=c.nivel,
        orientacao=c.orientacao,
        justificativa=c.justificativa,
        origem=c.origem,
    )


def triar_com_ia(entrada: EntradaTriagem, tentativas: int = 3) -> ResultadoTriagem | None:
    """Chama o Gemini (free tier). Retorna None se a IA não estiver disponível.

    Tenta algumas vezes: o free tier às vezes responde 503 (alta demanda).
    """
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("Pacote google-genai não instalado; usando as regras.")
        return None

    client = genai.Client(api_key=settings.gemini_api_key)
    idade = f" Idade: {entrada.idade}." if entrada.idade is not None else ""
    config = types.GenerateContentConfig(
        system_instruction=PROMPT_SISTEMA,
        response_mime_type="application/json",
        temperature=0.2,
    )

    for tentativa in range(1, tentativas + 1):
        try:
            resposta = client.models.generate_content(
                model=settings.gemini_model,
                contents=f"Sintomas: {entrada.sintomas}.{idade}",
                config=config,
            )
            dados = json.loads(resposta.text)
            return ResultadoTriagem(
                nivel=Nivel(dados["nivel"]),
                orientacao=dados["orientacao"],
                justificativa=dados.get("justificativa"),
                origem="ia",
            )
        except Exception as e:
            # Sem rede, limite estourado, 503 de alta demanda ou resposta inválida.
            logger.warning(
                "Falha ao chamar o Gemini (tentativa %d/%d): %s", tentativa, tentativas, e
            )
            if tentativa < tentativas:
                time.sleep(1.5)
    return None


def triar(entrada: EntradaTriagem) -> ResultadoTriagem:
    """Fluxo principal. A rede de segurança tem a palavra final na emergência."""
    regra = triar_por_regras(entrada)
    if regra.nivel == Nivel.vermelho:
        return regra  # segurança: sinal de alerta nunca é rebaixado pela IA

    ia = triar_com_ia(entrada)
    return ia if ia is not None else regra


# ===========================================================================
# Triagem CONVERSACIONAL: a IA faz perguntas antes de concluir (senso crítico)
# ===========================================================================

MAX_PERGUNTAS_PADRAO = 3

PROMPT_CONVERSA = (
    "Você é o Zela, um assistente de TRIAGEM de saúde para comunidades, conversando "
    "com a pessoa como um agente comunitário de saúde. Você NÃO é médico: você ORIENTA "
    "e PRIORIZA, nunca diagnostica nem indica remédio. Fale em português simples e "
    "acolhedor, pensando em alguém que pode não saber ler bem.\n\n"
    "TOM E VÍNCULO (seja humana e acolhedora, não robótica):\n"
    "- Na sua PRIMEIRA fala da conversa, cumprimente a pessoa com carinho, usando o "
    "primeiro nome dela quando ele for informado (ex.: 'Oi, Maria! Tudo bem?'), e "
    "responda a cumprimentos ('tudo bem?') com naturalidade, demonstrando cuidado "
    "ANTES de seguir para a orientação.\n"
    "- Uma frase calorosa basta: é uma conversa de saúde, acolha sem enrolar.\n"
    "- Nas falas seguintes, continue gentil e próxima, chamando a pessoa pelo nome de "
    "vez em quando, mas sem repetir a saudação a cada mensagem.\n\n"
    "RACIOCÍNIO (tenha senso crítico, não exagere a gravidade):\n"
    "- Antes de classificar, pese: início (súbito ou gradual), há quanto tempo, "
    "intensidade, sintomas associados (febre, falta de ar, vômito...) e a idade.\n"
    "- NÃO suba o nível só por falta de informação. Se faltar um dado importante para "
    "decidir com segurança, FAÇA UMA PERGUNTA em vez de concluir.\n"
    "- Um sintoma leve, isolado e muito recente (ex.: uma dor de cabeça leve que começou "
    "agora, sem outros sinais) normalmente é 'verde' (cuidar em casa e observar) — não "
    "encaminhe para a UBS por precaução exagerada.\n"
    "- A idade AUMENTA a cautela (bebês com menos de 3 meses e idosos de 65+ merecem mais "
    "atenção), mas nunca rebaixa um sinal de alerta.\n\n"
    "SINAIS DE EMERGÊNCIA (dor no peito, falta de ar, convulsão, desmaio, sangramento "
    "intenso, lábios roxos, suspeita de AVC/infarto, intoxicação): classifique como "
    "'vermelho' IMEDIATAMENTE, sem fazer mais perguntas.\n\n"
    "A cada rodada, responda SEMPRE em JSON, em um destes dois formatos:\n"
    '1) Para perguntar: {"acao":"perguntar","pergunta":"UMA pergunta curta e objetiva",'
    '"sugestoes":["opção curta","opção curta"]}\n'
    "   - Faça UMA pergunta por vez. Dê de 2 a 4 sugestões de resposta rápida quando "
    'fizer sentido (ex.: "Sim","Não","Não sei","Hoje").\n'
    '2) Para concluir: {"acao":"concluir","nivel":"verde|amarelo|vermelho",'
    '"orientacao":"o que fazer, em linguagem simples","justificativa":"por que esse nível"}\n\n'
    "Conclua assim que tiver informação suficiente; não faça perguntas desnecessárias."
)


@dataclass
class PassoConversa:
    """Resultado de uma rodada da conversa: ou uma pergunta, ou a conclusão."""
    estado: str  # "pergunta" | "concluido"
    pergunta: str | None = None
    sugestoes: list[str] = field(default_factory=list)
    resultado: ResultadoTriagem | None = None
    resumo: str = ""


def _texto_do_usuario(historico: list[MensagemConversa]) -> str:
    """Junta tudo o que a pessoa disse até agora (o quadro de sintomas)."""
    return " ".join(
        m.texto.strip() for m in historico if m.autor == "usuario" and m.texto.strip()
    )


def _perguntas_feitas(historico: list[MensagemConversa]) -> int:
    return sum(1 for m in historico if m.autor == "zela")


def conversar(
    historico: list[MensagemConversa],
    idade: int | None = None,
    contexto_foto: str | None = None,
    nome: str | None = None,
    max_perguntas: int = MAX_PERGUNTAS_PADRAO,
) -> PassoConversa:
    """Uma rodada da triagem conversacional.

    1) Rede de segurança: se as regras já detectam emergência -> conclui vermelho
       na hora, sem perguntar (regra de ouro).
    2) Senão, tenta a IA: ela pergunta mais ou conclui com senso crítico.
    3) Sem IA (offline) ou falha: conclui pelas regras (degradação segura).
    """
    texto = _texto_do_usuario(historico)
    resumo = texto or "(sem descrição)"
    regra = triar_por_regras(EntradaTriagem(sintomas=resumo, idade=idade))

    # 1) Emergência detectada pelas regras: nunca adia nem rebaixa.
    if regra.nivel == Nivel.vermelho:
        return PassoConversa(estado="concluido", resultado=regra, resumo=resumo)

    # 2) IA conversacional (senso crítico + perguntas).
    ia = conversar_com_ia(
        historico,
        idade=idade,
        contexto_foto=contexto_foto,
        nome=nome,
        perguntas_feitas=_perguntas_feitas(historico),
        max_perguntas=max_perguntas,
    )
    if ia is not None:
        return ia

    # 3) Offline / falha: conclui pelas regras (cauteloso).
    return PassoConversa(estado="concluido", resultado=regra, resumo=resumo)


def conversar_com_ia(
    historico: list[MensagemConversa],
    idade: int | None,
    contexto_foto: str | None,
    perguntas_feitas: int,
    max_perguntas: int,
    nome: str | None = None,
    tentativas: int = 3,
) -> PassoConversa | None:
    """Chama o Gemini para conduzir a conversa. Retorna None se indisponível."""
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("Pacote google-genai não instalado; usando as regras.")
        return None

    deve_concluir = perguntas_feitas >= max_perguntas

    linhas: list[str] = []
    if nome:
        linhas.append(f"[Primeiro nome da pessoa]: {nome}")
    if contexto_foto:
        linhas.append(f"[Análise da foto enviada pela pessoa]: {contexto_foto}")
    if idade is not None:
        linhas.append(f"[Idade da pessoa]: {idade} anos.")
    for m in historico:
        quem = "Pessoa" if m.autor == "usuario" else "Zela"
        linhas.append(f"{quem}: {m.texto}")
    if perguntas_feitas == 0:
        linhas.append(
            "(Esta é a sua PRIMEIRA fala nesta conversa — cumprimente a pessoa com "
            "carinho, pelo nome se souber, antes de seguir.)"
        )
    linhas.append(
        "Agora você já pode concluir: dê o resultado final."
        if deve_concluir
        else f"Você ainda pode fazer no máximo {max_perguntas - perguntas_feitas} pergunta(s) "
        "antes de concluir."
    )
    conteudo = "\n".join(linhas)

    client = genai.Client(api_key=settings.gemini_api_key)
    config = types.GenerateContentConfig(
        system_instruction=PROMPT_CONVERSA,
        response_mime_type="application/json",
        temperature=0.2,
    )

    for tentativa in range(1, tentativas + 1):
        try:
            resposta = client.models.generate_content(
                model=settings.gemini_model, contents=conteudo, config=config
            )
            dados = json.loads(resposta.text)
            resumo = _texto_do_usuario(historico) or "(sem descrição)"

            if dados.get("acao") == "perguntar" and not deve_concluir:
                pergunta = (dados.get("pergunta") or "").strip()
                sugestoes = [
                    s.strip()
                    for s in dados.get("sugestoes", [])
                    if isinstance(s, str) and s.strip()
                ][:4]
                if pergunta:
                    return PassoConversa(
                        estado="pergunta", pergunta=pergunta, sugestoes=sugestoes, resumo=resumo
                    )

            # Concluir (inclui o caso de deve_concluir).
            return PassoConversa(
                estado="concluido",
                resultado=ResultadoTriagem(
                    nivel=Nivel(dados["nivel"]),
                    orientacao=dados["orientacao"],
                    justificativa=dados.get("justificativa"),
                    origem="ia",
                ),
                resumo=resumo,
            )
        except Exception as e:  # sem rede, limite, 503 ou JSON inválido
            logger.warning(
                "Falha na conversa com o Gemini (tentativa %d/%d): %s",
                tentativa, tentativas, e,
            )
            if tentativa < tentativas:
                time.sleep(1.5)
    return None
