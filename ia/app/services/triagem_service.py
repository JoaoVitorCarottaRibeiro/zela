"""Lógica de triagem: rede de segurança por regras + IA (Gemini), com fallback offline.

Ética: o Zela ORIENTA e PRIORIZA, nunca diagnostica nem prescreve.
Regra de ouro: um sinal de alerta (vermelho) detectado pelas regras NUNCA é
rebaixado pela IA. A IA só decide entre verde e amarelo (e pode subir para vermelho).
"""
from __future__ import annotations

import json
import logging
import time

from app.core.config import settings
from app.schemas import EntradaTriagem, Nivel, ResultadoTriagem

logger = logging.getLogger(__name__)

# Sinais de alerta -> emergência imediata, mesmo offline.
SINAIS_VERMELHOS = [
    "dor no peito", "falta de ar", "não consigo respirar", "nao consigo respirar",
    "convuls", "desmai", "desacord", "sangramento intenso", "muito sangue",
    "lábios roxos", "labios roxos", "rigidez na nuca", "derrame", "avc", "infarto",
    "veneno", "overdose", "se matar", "suicíd", "suicid",
]

# Sintomas que merecem avaliação na UBS.
SINAIS_AMARELOS = [
    "febre", "vômito", "vomito", "diarreia", "dor forte", "corte fundo",
    "queda", "fratura", "desidrat", "pressão alta", "pressao alta",
    "gestante", "grávida", "gravida", "recém-nascido", "recem",
]

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


def _contem(texto: str, termos: list[str]) -> bool:
    t = texto.lower()
    return any(termo in t for termo in termos)


def triar_por_regras(entrada: EntradaTriagem) -> ResultadoTriagem:
    """Triagem só por palavras-chave. Funciona offline e é a rede de segurança."""
    if _contem(entrada.sintomas, SINAIS_VERMELHOS):
        return ResultadoTriagem(
            nivel=Nivel.vermelho,
            orientacao="Isso pode ser grave. Procure ajuda agora: ligue para o SAMU 192 "
            "ou vá ao serviço de emergência mais próximo.",
            justificativa="Sinal de alerta identificado nas palavras informadas.",
            origem="regras(sinal de alerta)",
        )
    if _contem(entrada.sintomas, SINAIS_AMARELOS):
        return ResultadoTriagem(
            nivel=Nivel.amarelo,
            orientacao="É bom passar na UBS. Vou te colocar na fila com prioridade e "
            "orientar o que fazer até lá.",
            justificativa="Sintoma que merece avaliação na UBS.",
            origem="regras",
        )
    return ResultadoTriagem(
        nivel=Nivel.amarelo,
        orientacao="Na dúvida, o mais seguro é passar na UBS. Me conte um pouco mais "
        "para eu entender melhor.",
        justificativa="Sem sinais claros; mantido em nível de cautela.",
        origem="regras",
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
