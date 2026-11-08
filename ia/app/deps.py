"""Dependências do FastAPI para autenticação.

Lê o token do cabeçalho `Authorization: Bearer <token>` e devolve o usuário.
- `usuario_atual`: obriga login (401 se não houver token válido).
- `usuario_opcional`: devolve o usuário se logado, senão None (rota pública
  que apenas vincula a triagem quando há login).
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.core.security import ler_token
from app.db.session import get_db
from app.models.usuario import Usuario


def _extrair_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    partes = authorization.split()
    if len(partes) == 2 and partes[0].lower() == "bearer":
        return partes[1]
    return authorization


def usuario_atual(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Usuario:
    token = _extrair_token(authorization)
    usuario_id = ler_token(token) if token else None
    if usuario_id is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Faça login para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    usuario = crud.obter_usuario(db, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida.")
    return usuario


def usuario_opcional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Usuario | None:
    token = _extrair_token(authorization)
    usuario_id = ler_token(token) if token else None
    if usuario_id is None:
        return None
    return crud.obter_usuario(db, usuario_id)
