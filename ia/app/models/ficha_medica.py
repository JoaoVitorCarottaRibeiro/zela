"""Ficha médica (pré-atendimento da IA) — uma por usuário.

Guarda as respostas do questionário clínico que contextualiza a triagem. As
respostas ficam num JSON estruturado (`dados`), porque o questionário tem muitos
campos e grupos (checkboxes) e tende a evoluir. Dado de saúde é sensível (LGPD):
só o próprio usuário acessa a sua ficha.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class FichaMedica(Base):
    __tablename__ = "fichas_medicas"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, index=True
    )
    # Respostas do questionário (seções 1 a 7 do documento de referência).
    dados: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    usuario: Mapped["Usuario"] = relationship(back_populates="ficha")
