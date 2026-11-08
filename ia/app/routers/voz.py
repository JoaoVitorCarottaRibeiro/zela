"""Voz: transcrever (fala -> texto) e falar (texto -> áudio)."""
from fastapi import APIRouter, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.schemas import ResultadoTranscricao
from app.services import voz_service

router = APIRouter(prefix="/voz", tags=["voz"])


class TextoFalar(BaseModel):
    texto: str


@router.post("/transcrever", response_model=ResultadoTranscricao)
async def transcrever(audio: UploadFile) -> ResultadoTranscricao:
    dados = await audio.read()
    return voz_service.transcrever(dados, audio.content_type or "audio/ogg")


@router.post("/falar")
def falar(entrada: TextoFalar):
    audio = voz_service.falar(entrada.texto)
    if audio is None:
        return {
            "status": "piper_nao_configurado",
            "detalhe": "Configure PIPER_BIN e PIPER_VOICE no .env para gerar voz offline.",
            "texto": entrada.texto,
        }
    return Response(content=audio, media_type="audio/wav")
