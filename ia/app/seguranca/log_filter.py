"""Filtro que REDIGE PII antes de qualquer coisa chegar aos logs.

É a aplicação prática do taint no ponto de saída mais comum (e mais esquecido):
o log. Instalado no logger raiz, ele garante que um CPF ou dado de saúde nunca
apareça em texto claro em `uvicorn`/arquivos de log — mesmo que alguém esqueça de
sanitizar. Seguro: só altera o TEXTO do log, nunca a resposta da API.
"""
from __future__ import annotations

import logging

from app.seguranca import pii


class FiltroPII(logging.Filter):
    """Mascara PII na mensagem já formatada do log."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            mensagem = record.getMessage()
        except Exception:
            return True
        if pii.contem_pii(mensagem):
            record.msg = pii.mascarar(mensagem)
            record.args = ()
        return True


def instalar_filtro_pii() -> None:
    """Liga o filtro no logger raiz e nos handlers do uvicorn (idempotente)."""
    filtro = FiltroPII()
    alvos = [logging.getLogger()]
    for nome in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        alvos.append(logging.getLogger(nome))
    for logger in alvos:
        if not any(isinstance(f, FiltroPII) for f in logger.filters):
            logger.addFilter(filtro)
        for handler in logger.handlers:
            if not any(isinstance(f, FiltroPII) for f in handler.filters):
                handler.addFilter(filtro)
