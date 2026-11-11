"""Enums do domínio — a fonte de verdade agora vive em app/dominio/enums.py.

Mantido aqui como reexport para a infraestrutura (modelos ORM) e para os schemas
continuarem importando de `app.models.enums` sem quebrar.
"""
from app.dominio.enums import Canal, Destino, Nivel, StatusEncaminhamento

__all__ = ["Nivel", "Canal", "Destino", "StatusEncaminhamento"]
