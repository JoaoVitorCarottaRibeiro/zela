"""Orquestra os três pilares: PII → Taint → Risco Cidadão.

É a camada que o router chama. Junta detectar (pilar 1), rastrear/bloquear
(pilar 2) e traduzir para o cidadão (pilar 3), alimentando a auditoria/painel.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.seguranca import pii, risco
from app.seguranca.auditoria import auditoria
from app.seguranca.pii import Achado, Severidade
from app.seguranca.taint import (
    Fonte,
    Rastreador,
    Sumidouro,
    VazamentoBloqueado,
)

_ORDEM_SEV = {
    Severidade.baixa: 1,
    Severidade.media: 2,
    Severidade.alta: 3,
    Severidade.critica: 4,
}


@dataclass
class ResultadoScan:
    texto_original_protegido: str  # já mascarado (nunca devolvemos o PII cru)
    achados: list[Achado]
    alertas: list[risco.AlertaRisco]


def escanear_e_traduzir(texto: str, origem: str = "entrada") -> ResultadoScan:
    """Pilar 1 + 3: acha PII e gera os alertas de Risco Cidadão (1 por tipo)."""
    achados = pii.detectar(texto)
    auditoria.registrar_scan(origem, achados)

    alertas: list[risco.AlertaRisco] = []
    vistos: set = set()
    for a in sorted(achados, key=lambda x: _ORDEM_SEV[x.severidade], reverse=True):
        if a.tipo in vistos:
            continue
        vistos.add(a.tipo)
        alertas.append(
            risco.traduzir(
                achado_tecnico=f"{a.rotulo} encontrado em {origem}",
                tipo=a.tipo,
                severidade=a.severidade,
            )
        )
    return ResultadoScan(
        texto_original_protegido=pii.mascarar(texto, achados),
        achados=achados,
        alertas=alertas,
    )


@dataclass
class PassoDemo:
    titulo: str
    detalhe: str
    seguro: bool


@dataclass
class ResultadoDemo:
    passos: list[PassoDemo]
    bloqueado: bool
    saida_insegura: str  # o que teria vazado (mascarado, para o print)
    saida_segura: str  # o que de fato sai, protegido
    alertas: list[risco.AlertaRisco]


def demonstrar_vazamento(
    texto: str,
    fonte: Fonte = Fonte.usuario,
    sumidouro: Sumidouro = Sumidouro.log,
) -> ResultadoDemo:
    """Roda o taint de ponta a ponta para a EVIDÊNCIA pedida na GS.

    Entrada contaminada → tenta sair por um canal inseguro (bloqueia) → sanitiza →
    sai protegida. Cada passo vira uma linha que o painel mostra.
    """
    rastreador = Rastreador()
    passos: list[PassoDemo] = []

    dado = rastreador.marcar(texto, fonte)
    passos.append(
        PassoDemo(
            "1. Entrada marcada como sensível (tainted)",
            f"Origem: {fonte.value}. Dados sensíveis: "
            + (", ".join(sorted({a.rotulo for a in dado.achados})) or "nenhum"),
            seguro=not dado.perigoso,
        )
    )

    bloqueado = False
    try:
        rastreador.enviar(dado, sumidouro)
        passos.append(
            PassoDemo(
                f"2. Tentativa de saída por '{sumidouro.value}'",
                "Nada sensível para bloquear — passou direto.",
                seguro=True,
            )
        )
    except VazamentoBloqueado as e:
        bloqueado = True
        passos.append(
            PassoDemo(
                f"2. Tentativa de saída por '{sumidouro.value}' — BLOQUEADA",
                str(e),
                seguro=False,
            )
        )

    seguro = rastreador.sanitizar(dado)
    passos.append(
        PassoDemo(
            "3. Dado sanitizado (PII redigido)",
            seguro.valor,
            seguro=True,
        )
    )
    saida = rastreador.enviar(seguro, sumidouro)
    passos.append(
        PassoDemo(
            f"4. Saída por '{sumidouro.value}' — permitida",
            "Agora é seguro: o PII foi protegido antes de sair.",
            seguro=True,
        )
    )

    # Auditoria + alertas de Risco Cidadão.
    for vaz in rastreador.vazamentos:
        auditoria.registrar_vazamento(vaz)
    traduzido = escanear_e_traduzir(texto, origem=fonte.value)

    return ResultadoDemo(
        passos=passos,
        bloqueado=bloqueado,
        saida_insegura=pii.mascarar(texto),
        saida_segura=saida,
        alertas=traduzido.alertas,
    )
