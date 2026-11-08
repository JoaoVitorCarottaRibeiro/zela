"""Visão: analisa uma foto (ferida, pele, receita) e descreve o risco."""
from fastapi import APIRouter, UploadFile

from app.schemas import ResultadoVisao
from app.services import visao_service

router = APIRouter(prefix="/visao", tags=["visao"])


@router.post("/analisar", response_model=ResultadoVisao)
async def analisar(foto: UploadFile) -> ResultadoVisao:
    dados = await foto.read()
    return visao_service.analisar(dados, foto.content_type or "image/jpeg")
