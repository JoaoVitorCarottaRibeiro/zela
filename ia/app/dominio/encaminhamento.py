"""Regra de encaminhamento: para onde cada nível de triagem leva.

Puro (só valores do domínio). verde -> casa, amarelo -> UBS, vermelho -> SAMU.
"""
from __future__ import annotations

from app.dominio.enums import Destino, Nivel

DESTINO_POR_NIVEL: dict[Nivel, Destino] = {
    Nivel.verde: Destino.casa,
    Nivel.amarelo: Destino.ubs,
    Nivel.vermelho: Destino.samu,
}


def destino_para(nivel: Nivel) -> Destino:
    """Destino do encaminhamento para um nível de risco."""
    return DESTINO_POR_NIVEL[nivel]
