"""Ficha médica (pré-atendimento da IA) — do próprio usuário logado.

Dado de saúde é sensível (LGPD): só o dono acessa e grava a sua ficha. A ficha
contextualiza a triagem (será usada pela IA numa etapa seguinte).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.deps import usuario_atual
from app.models.usuario import Usuario
from app.schemas import FichaMedicaIn, FichaMedicaOut

router = APIRouter(prefix="/ficha", tags=["ficha"])


@router.get("", response_model=FichaMedicaOut | None)
def obter(
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
) -> FichaMedicaOut | None:
    """Devolve a ficha do usuário logado, ou null se ele ainda não preencheu."""
    return crud.obter_ficha(db, usuario.id)


@router.put("", response_model=FichaMedicaOut)
def salvar(
    entrada: FichaMedicaIn,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
) -> FichaMedicaOut:
    """Cria ou atualiza a ficha médica do usuário logado."""
    return crud.salvar_ficha(db, usuario, entrada.dados)
