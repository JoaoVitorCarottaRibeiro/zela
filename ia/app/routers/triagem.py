"""Triagem: recebe sintomas e devolve nível de risco + orientação.

Importante (ética): a IA ORIENTA e PRIORIZA — não diagnostica nem prescreve.
A lógica fica em app/services/triagem_service.py.
"""
from fastapi import APIRouter

from app.schemas import EntradaTriagem, ResultadoTriagem
from app.services import triagem_service

router = APIRouter(prefix="/triagem", tags=["triagem"])


@router.post("", response_model=ResultadoTriagem)
def triar(entrada: EntradaTriagem) -> ResultadoTriagem:
    return triagem_service.triar(entrada)
