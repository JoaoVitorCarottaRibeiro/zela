"""Entenda seu exame: a IA lê uma foto/PDF e explica em linguagem simples.
Recurso só para usuário logado (dado de saúde é sensível).

LGPD: entender é livre (é o dado da própria pessoa), mas GUARDAR exige o
consentimento explícito dela. Por isso `/analisar` não salva nada — só explica;
quem salva é `/salvar`, chamado quando a pessoa pede. E `DELETE /{id}` permite
revogar (apagar do histórico).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.deps import usuario_atual
from app.models.usuario import Usuario
from app.schemas import ExameAnaliseOut, ResultadoExame
from app.services import exame_service

router = APIRouter(prefix="/exame", tags=["exame"])


@router.post("/analisar", response_model=ResultadoExame)
async def analisar(
    arquivo: UploadFile,
    usuario: Usuario = Depends(usuario_atual),
) -> ResultadoExame:
    """Lê o exame e explica. NÃO guarda nada — só a pessoa pedindo (em /salvar)."""
    dados = await arquivo.read()
    mime = arquivo.content_type or "application/octet-stream"
    return exame_service.analisar(dados, mime)


@router.post("/salvar", response_model=ExameAnaliseOut, status_code=status.HTTP_201_CREATED)
def salvar(
    resultado: ResultadoExame,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
) -> ExameAnaliseOut:
    """Guarda no histórico uma análise que a pessoa autorizou salvar."""
    return crud.criar_exame(db, usuario.id, resultado)


@router.get("/meus", response_model=list[ExameAnaliseOut])
def meus(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
) -> list[ExameAnaliseOut]:
    """Histórico de análises de exame do usuário logado (página Resultados)."""
    return crud.listar_exames_do_usuario(db, usuario.id)


@router.delete("/{exame_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover(
    exame_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
) -> None:
    """Apaga um exame do histórico (direito de revogação, LGPD). Só o dono."""
    exame = crud.obter_exame(db, exame_id)
    if exame is None or exame.usuario_id != usuario.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exame não encontrado.")
    crud.remover_exame(db, exame)
