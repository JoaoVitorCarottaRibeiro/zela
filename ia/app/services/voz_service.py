"""Voz: transcrever (áudio -> texto, via Gemini) e falar (texto -> áudio, via Piper offline)."""
from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path

from app.core.config import settings
from app.schemas import ResultadoTranscricao

logger = logging.getLogger(__name__)


def transcrever(dados: bytes, mime: str) -> ResultadoTranscricao:
    """Converte o áudio em texto. Online usa o Gemini (multimodal)."""
    if not settings.gemini_api_key:
        return ResultadoTranscricao(texto="", origem="indisponivel")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("google-genai não instalado; transcrição indisponível.")
        return ResultadoTranscricao(texto="", origem="indisponivel")

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        resposta = client.models.generate_content(
            model=settings.gemini_model,
            contents=[
                types.Part.from_bytes(data=dados, mime_type=mime),
                "Transcreva este áudio em português. Responda apenas o texto falado.",
            ],
        )
        return ResultadoTranscricao(texto=(resposta.text or "").strip(), origem="ia")
    except Exception as e:
        logger.warning("Falha ao transcrever: %s", e)
        return ResultadoTranscricao(texto="", origem="erro")


def falar(texto: str) -> bytes | None:
    """Gera áudio (WAV) com o Piper, que roda OFFLINE.

    Requer PIPER_BIN e PIPER_VOICE no .env. Retorna None se não estiver configurado
    (o router responde com uma mensagem clara nesse caso).
    """
    binario, voz = settings.piper_bin, settings.piper_voice
    if not binario or not voz or not Path(binario).exists() or not Path(voz).exists():
        return None

    # Grava num arquivo temporário e lê de volta. No Windows, pedir o WAV pela
    # saída padrão (--output_file -) corrompe o áudio (conversão de \n -> \r\n),
    # o que vira chiado. Via arquivo o WAV sai íntegro.
    saida = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            saida = tmp.name
        subprocess.run(
            [binario, "--model", voz, "--output_file", saida],
            input=texto.encode("utf-8"),
            capture_output=True,
            check=True,
        )
        return Path(saida).read_bytes()
    except Exception as e:
        logger.warning("Falha ao gerar voz com o Piper: %s", e)
        return None
    finally:
        if saida:
            try:
                os.unlink(saida)
            except OSError:
                pass
