"""Encaminhamento — o destino gerado a partir de uma triagem.

Uma triagem pode gerar um ou mais encaminhamentos (ex.: UBS agora, retorno depois).
É o que liga a orientação a uma ação acompanhável (fila da UBS, SAMU, telessaúde).
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Destino, StatusEncaminhamento

if TYPE_CHECKING:
    from app.models.triagem import Triagem


class Encaminhamento(Base):
    __tablename__ = "encaminhamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    triagem_id: Mapped[int] = mapped_column(
        ForeignKey("triagens.id", ondelete="CASCADE"), index=True,
    )

    destino: Mapped[Destino] = mapped_column(SAEnum(Destino, name="destino"))
    status: Mapped[StatusEncaminhamento] = mapped_column(
        SAEnum(StatusEncaminhamento, name="status_encaminhamento"),
        default=StatusEncaminhamento.aberto,
    )
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    triagem: Mapped["Triagem"] = relationship(back_populates="encaminhamentos")
