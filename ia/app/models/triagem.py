"""Triagem — um atendimento de triagem registrado (o coração do domínio).

Guarda o que a pessoa relatou e o resultado (nível + orientação), de onde veio o
resultado (regras/IA) e por qual canal a pessoa chegou.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Canal, Nivel

if TYPE_CHECKING:
    from app.models.cidadao import Cidadao
    from app.models.encaminhamento import Encaminhamento
    from app.models.usuario import Usuario


class Triagem(Base):
    __tablename__ = "triagens"

    id: Mapped[int] = mapped_column(primary_key=True)
    cidadao_id: Mapped[int | None] = mapped_column(
        ForeignKey("cidadaos.id", ondelete="CASCADE"), nullable=True, index=True,
    )
    # Dono da triagem (quando feita por um usuário logado).
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    # CPF informado numa triagem de urgência (convidado, sem login). NÃO autentica:
    # serve só para, mais tarde, vincular esta triagem à conta quando o dono do CPF
    # fizer login (provando que é ele). Até lá, usuario_id fica nulo.
    cpf_informado: Mapped[str | None] = mapped_column(String(11), nullable=True, index=True)

    canal: Mapped[Canal] = mapped_column(SAEnum(Canal, name="canal"), default=Canal.app)
    sintomas: Mapped[str] = mapped_column(Text)
    idade_informada: Mapped[int | None] = mapped_column(Integer, nullable=True)

    nivel: Mapped[Nivel] = mapped_column(SAEnum(Nivel, name="nivel"))
    orientacao: Mapped[str] = mapped_column(Text)
    justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    origem: Mapped[str] = mapped_column(String(40), default="ia")

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cidadao: Mapped["Cidadao | None"] = relationship(back_populates="triagens")
    usuario: Mapped["Usuario | None"] = relationship(back_populates="triagens")
    encaminhamentos: Mapped[list["Encaminhamento"]] = relationship(
        back_populates="triagem",
        cascade="all, delete-orphan",
    )
