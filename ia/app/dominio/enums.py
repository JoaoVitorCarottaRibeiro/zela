"""Valores do domínio da Zela — fonte única de verdade (domínio).

Os modelos (infra/ORM) e a API (schemas) reexportam daqui.
"""
from enum import Enum


class Nivel(str, Enum):
    """Semáforo da triagem."""
    verde = "verde"        # resolver em casa com orientação
    amarelo = "amarelo"    # ir à UBS, com prioridade
    vermelho = "vermelho"  # emergência: telessaúde ou SAMU 192


class Canal(str, Enum):
    """Por onde a pessoa chegou até a Zela (acesso multi-porta)."""
    app = "app"
    voz = "voz"       # ligação / URA 0800
    foto = "foto"
    totem = "totem"   # totem comunitário
    acs = "acs"       # visita do agente comunitário de saúde


class Destino(str, Enum):
    """Para onde a triagem encaminha."""
    casa = "casa"
    ubs = "ubs"
    telessaude = "telessaude"
    samu = "samu"


class StatusEncaminhamento(str, Enum):
    aberto = "aberto"
    em_andamento = "em_andamento"
    concluido = "concluido"
    cancelado = "cancelado"
