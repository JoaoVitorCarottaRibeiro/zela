"""Análise de exame salva no histórico do usuário.

Guarda o resultado da leitura de um exame (o resumo + os itens lidos) para
aparecer em "Resultados". Dado de saúde é sensível (LGPD): só o próprio usuário
acessa as suas análises. O nível fica como texto simples (verde/amarelo/vermelho)
para não depender de um tipo enum no banco.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class ExameAnalise(Base):
    __tablename__ = "exames_analises"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    resumo: Mapped[str] = mapped_column(Text)
    # Lista de itens lidos (nome, valor, referencia, situacao, explicacao).
    itens: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    precisa_cuidado: Mapped[bool] = mapped_column(Boolean, default=False)
    nivel: Mapped[str | None] = mapped_column(String(10), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    usuario: Mapped["Usuario"] = relationship()
