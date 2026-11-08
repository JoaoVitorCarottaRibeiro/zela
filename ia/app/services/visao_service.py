"""Visão: analisa uma foto e descreve o risco em linguagem simples.

Ética: descreve e PRIORIZA, nunca diagnostica nem prescreve.
Em qualquer falha, cai num resultado cauteloso (amarelo) — nunca deixa sem resposta.
"""
from __future__ import annotations

import json
import logging
import time

from app.core.config import settings
from app.schemas import Nivel, ResultadoVisao

logger = logging.getLogger(__name__)

PROMPT_VISAO = (
    "Você é o Zela. Analise a FOTO enviada por um morador de comunidade "
    "(pode ser uma ferida, mancha na pele, olho, ou uma receita/caixa de remédio). "
    "Descreva em português simples o que você vê, SEM diagnosticar e SEM indicar remédio, "
    "e classifique o risco: 'verde' (dá para acompanhar em casa), "
    "'amarelo' (procurar a UBS) ou 'vermelho' (emergência). "
    "Na dúvida, escolha o mais grave. "
    "Responda SEMPRE em JSON com os campos: descricao, risco."
)

_CAUTELA = "Não consegui analisar a foto agora. Na dúvida, o mais seguro é procurar a UBS."


def _cautela(origem: str) -> ResultadoVisao:
    return ResultadoVisao(descricao=_CAUTELA, risco=Nivel.amarelo, origem=origem)


def analisar(dados: bytes, mime: str, tentativas: int = 3) -> ResultadoVisao:
    if not settings.gemini_api_key:
        return _cautela("indisponivel")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("google-genai não instalado; visão indisponível.")
        return _cautela("indisponivel")

    client = genai.Client(api_key=settings.gemini_api_key)
    config = types.GenerateContentConfig(
        system_instruction=PROMPT_VISAO,
        response_mime_type="application/json",
        temperature=0.2,
    )

    for tentativa in range(1, tentativas + 1):
        try:
            resposta = client.models.generate_content(
                model=settings.gemini_model,
                contents=[
                    types.Part.from_bytes(data=dados, mime_type=mime),
                    "Analise esta foto.",
                ],
                config=config,
            )
            d = json.loads(resposta.text)
            return ResultadoVisao(
                descricao=d["descricao"],
                risco=Nivel(d["risco"]),
                origem="ia",
            )
        except Exception as e:
            logger.warning("Falha na visão (tentativa %d/%d): %s", tentativa, tentativas, e)
            if tentativa < tentativas:
                time.sleep(1.5)
    return _cautela("erro")
