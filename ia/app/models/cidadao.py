"""Cidadão — a pessoa da comunidade atendida pela Zela.

Observação de privacidade: nome/telefone são PII. No projeto usamos SEMPRE dados
fictícios (o briefing proíbe dados reais). A proteção desses campos é o tema da
disciplina de Cybersecurity.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.triagem import Triagem


class Cidadao(Base):
    __tablename__ = "cidadaos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    idade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cidade: Mapped[str] = mapped_column(String(120), default="São Paulo")
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    triagens: Mapped[list["Triagem"]] = relationship(
        back_populates="cidadao",
        cascade="all, delete-orphan",
    )
