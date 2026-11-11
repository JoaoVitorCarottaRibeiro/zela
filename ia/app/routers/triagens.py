"""Triagens persistidas (recurso com histórico no banco).

Diferença para /triagem (singular): aquele é a triagem rápida, sem gravar nada
(usada offline-first pelo app). Este registra a triagem e já abre o encaminhamento.

Quando a requisição vem de um usuário logado, a triagem fica vinculada a ele e
aparece em "Resultados" (GET /triagens/minhas).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.deps import usuario_atual, usuario_opcional
from app.models.usuario import Usuario
from app.schemas import TriagemCreate, TriagemOut

router = APIRouter(prefix="/triagens", tags=["triagens"])


@router.post(
    "",
    response_model=TriagemOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Cidadão informado não existe."},
        422: {"description": "Sintomas insuficientes (regra do domínio)."},
    },
)
def criar(
    dados: TriagemCreate,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(usuario_opcional),
) -> TriagemOut:
    if dados.cidadao_id is not None and crud.obter_cidadao(db, dados.cidadao_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cidadão informado não existe.")
    return crud.criar_triagem(
        db,
        dados,
        usuario_id=usuario.id if usuario else None,
        # CPF de urgência só vale para convidado (sem login). Logado ignora.
        cpf_informado=dados.cpf_informado if usuario is None else None,
    )


@router.get("/minhas", response_model=list[TriagemOut])
def minhas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
) -> list[TriagemOut]:
    """Triagens do usuário logado — alimenta a página de Resultados."""
    return crud.listar_triagens_do_usuario(db, usuario.id)


@router.get("", response_model=list[TriagemOut])
def listar(limite: int = 100, offset: int = 0, db: Session = Depends(get_db)) -> list[TriagemOut]:
    return crud.listar_triagens(db, limite=limite, offset=offset)


@router.get(
    "/{triagem_id}",
    response_model=TriagemOut,
    responses={404: {"description": "Triagem não encontrada."}},
)
def obter(triagem_id: int, db: Session = Depends(get_db)) -> TriagemOut:
    triagem = crud.obter_triagem(db, triagem_id)
    if triagem is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Triagem não encontrada.")
    return triagem
