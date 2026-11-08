"""Encaminhamentos: acompanhamento da fila (UBS, SAMU, telessaúde, casa).

A UBS usa isto para ver e atualizar o status de cada encaminhamento aberto.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.models.enums import StatusEncaminhamento
from app.schemas import EncaminhamentoOut, EncaminhamentoUpdate

router = APIRouter(prefix="/encaminhamentos", tags=["encaminhamentos"])


@router.get("", response_model=list[EncaminhamentoOut])
def listar(
    status: StatusEncaminhamento | None = None,
    limite: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> list[EncaminhamentoOut]:
    return crud.listar_encaminhamentos(db, status=status, limite=limite, offset=offset)


@router.get("/{encaminhamento_id}", response_model=EncaminhamentoOut)
def obter(encaminhamento_id: int, db: Session = Depends(get_db)) -> EncaminhamentoOut:
    enc = crud.obter_encaminhamento(db, encaminhamento_id)
    if enc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encaminhamento não encontrado.")
    return enc


@router.patch("/{encaminhamento_id}", response_model=EncaminhamentoOut)
def atualizar(
    encaminhamento_id: int,
    dados: EncaminhamentoUpdate,
    db: Session = Depends(get_db),
) -> EncaminhamentoOut:
    enc = crud.obter_encaminhamento(db, encaminhamento_id)
    if enc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encaminhamento não encontrado.")
    return crud.atualizar_encaminhamento(db, enc, dados)
