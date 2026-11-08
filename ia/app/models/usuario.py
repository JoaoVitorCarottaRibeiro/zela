"""Usuário — conta de acesso do cidadão (cadastro + login).

Guarda os dados do cadastro e o hash da senha (nunca a senha em texto).
Login pode ser por CPF ou por e-mail (e-mail é opcional).
"""
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ficha_medica import FichaMedica
    from app.models.triagem import Triagem


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome_completo: Mapped[str] = mapped_column(String(160))
    data_nascimento: Mapped[date] = mapped_column(Date)
    # CPF só com dígitos (11). Único no sistema.
    cpf: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    # E-mail é opcional; quando preenchido, é único.
    email: Mapped[str | None] = mapped_column(
        String(160), unique=True, index=True, nullable=True
    )
    senha_hash: Mapped[str] = mapped_column(String(255))

    # Gênero e identidade de gênero (opcionais). Relevantes clinicamente e para
    # um atendimento respeitoso. Guardados como texto curto (valor controlado).
    genero: Mapped[str | None] = mapped_column(String(30), nullable=True)
    identidade_genero: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Endereço (opcional) — preenchido via CEP (ViaCEP) no cadastro. Usado como
    # base do mapa quando a localização atual não está disponível.
    cep: Mapped[str | None] = mapped_column(String(8), nullable=True)
    logradouro: Mapped[str | None] = mapped_column(String(160), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(120), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(120), nullable=True)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    triagens: Mapped[list["Triagem"]] = relationship(back_populates="usuario")
    ficha: Mapped["FichaMedica | None"] = relationship(
        back_populates="usuario", uselist=False, cascade="all, delete-orphan"
    )
