"""Regras de negócio da TRIAGEM — rede de segurança por palavras-chave.

Puro: depende só da biblioteca padrão e dos valores do domínio. Não sabe o que é
HTTP nem banco. É a "regra de ouro" da Zela: um sinal de alerta vira vermelho e
a IA nunca pode rebaixar.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.dominio.enums import Nivel
from app.dominio.erros import RegraViolada

# Sinais de alerta -> emergência imediata, mesmo offline.
SINAIS_VERMELHOS = [
    "dor no peito", "falta de ar", "não consigo respirar", "nao consigo respirar",
    "convuls", "desmai", "desacord", "sangramento intenso", "muito sangue",
    "lábios roxos", "labios roxos", "rigidez na nuca", "derrame", "avc", "infarto",
    "veneno", "overdose", "se matar", "suicíd", "suicid",
]

# Sintomas que merecem avaliação na UBS.
SINAIS_AMARELOS = [
    "febre", "vômito", "vomito", "diarreia", "dor forte", "corte fundo",
    "queda", "fratura", "desidrat", "pressão alta", "pressao alta",
    "gestante", "grávida", "gravida", "recém-nascido", "recem",
]


@dataclass(frozen=True)
class Classificacao:
    """Resultado da triagem por regras (dado puro do domínio)."""
    nivel: Nivel
    orientacao: str
    justificativa: str
    origem: str


def validar_sintomas(texto: str) -> str:
    """Regra do domínio: a triagem precisa de uma descrição mínima.

    Levanta RegraViolada (vira 422 na API) se vier vazio ou curto demais.
    """
    t = (texto or "").strip()
    if len(t) < 3:
        raise RegraViolada("Conte um pouco mais sobre o que você está sentindo.")
    return t


def _contem(texto: str, termos: list[str]) -> bool:
    t = texto.lower()
    return any(termo in t for termo in termos)


def classificar_por_sinais(sintomas: str) -> Classificacao:
    """Classifica o risco só pelas palavras-chave (offline, determinístico)."""
    if _contem(sintomas, SINAIS_VERMELHOS):
        return Classificacao(
            nivel=Nivel.vermelho,
            orientacao="Isso pode ser grave. Procure ajuda agora: ligue para o SAMU 192 "
            "ou vá ao serviço de emergência mais próximo.",
            justificativa="Sinal de alerta identificado nas palavras informadas.",
            origem="regras(sinal de alerta)",
        )
    if _contem(sintomas, SINAIS_AMARELOS):
        return Classificacao(
            nivel=Nivel.amarelo,
            orientacao="É bom passar na UBS. Vou te colocar na fila com prioridade e "
            "orientar o que fazer até lá.",
            justificativa="Sintoma que merece avaliação na UBS.",
            origem="regras",
        )
    return Classificacao(
        nivel=Nivel.amarelo,
        orientacao="Na dúvida, o mais seguro é passar na UBS. Me conte um pouco mais "
        "para eu entender melhor.",
        justificativa="Sem sinais claros; mantido em nível de cautela.",
        origem="regras",
    )
