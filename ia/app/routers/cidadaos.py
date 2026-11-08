"""CRUD de cidadãos (as pessoas atendidas) e suas triagens."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.schemas import CidadaoCreate, CidadaoOut, CidadaoUpdate, TriagemOut

router = APIRouter(prefix="/cidadaos", tags=["cidadãos"])


@router.post("", response_model=CidadaoOut, status_code=status.HTTP_201_CREATED)
def criar(dados: CidadaoCreate, db: Session = Depends(get_db)) -> CidadaoOut:
    return crud.criar_cidadao(db, dados)


@router.get("", response_model=list[CidadaoOut])
def listar(limite: int = 100, offset: int = 0, db: Session = Depends(get_db)) -> list[CidadaoOut]:
    return crud.listar_cidadaos(db, limite=limite, offset=offset)


@router.get("/{cidadao_id}", response_model=CidadaoOut)
def obter(cidadao_id: int, db: Session = Depends(get_db)) -> CidadaoOut:
    cidadao = crud.obter_cidadao(db, cidadao_id)
    if cidadao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cidadão não encontrado.")
    return cidadao


@router.put("/{cidadao_id}", response_model=CidadaoOut)
def atualizar(cidadao_id: int, dados: CidadaoUpdate, db: Session = Depends(get_db)) -> CidadaoOut:
    cidadao = crud.obter_cidadao(db, cidadao_id)
    if cidadao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cidadão não encontrado.")
    return crud.atualizar_cidadao(db, cidadao, dados)


@router.delete("/{cidadao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(cidadao_id: int, db: Session = Depends(get_db)) -> None:
    cidadao = crud.obter_cidadao(db, cidadao_id)
    if cidadao is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cidadão não encontrado.")
    crud.remover_cidadao(db, cidadao)


@router.get("/{cidadao_id}/triagens", response_model=list[TriagemOut])
def triagens_do_cidadao(cidadao_id: int, db: Session = Depends(get_db)) -> list[TriagemOut]:
    if crud.obter_cidadao(db, cidadao_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cidadão não encontrado.")
    return crud.listar_triagens_do_cidadao(db, cidadao_id)
