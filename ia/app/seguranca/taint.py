"""Pilar 2 — Taint Analysis (análise de contaminação).

Rastreia o caminho do dado sensível: ENTRADA → PROCESSAMENTO → SAÍDA. Se um dado
"contaminado" (com PII) chega a uma SAÍDA INSEGURA (log, resposta de API, tela,
banco sem proteção) SEM ter sido sanitizado antes, o fluxo é BLOQUEADO e o
vazamento é registrado na auditoria.

Modelo clássico de taint: `fontes` marcam o dado como contaminado (tainted);
`sanitizadores` limpam (redigem o PII); `sumidouros` (sinks) são os pontos de
saída, uns seguros, outros não. Puro: só depende da stdlib e do pilar de PII.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum

from app.seguranca import pii
from app.seguranca.pii import Achado, Severidade


class Fonte(str, Enum):
    """De onde o dado sensível entra na solução."""

    usuario = "entrada_do_usuario"
    voz = "transcricao_de_voz"
    foto = "analise_de_foto"
    banco = "leitura_do_banco"
    externo = "api_externa"


class Sumidouro(str, Enum):
    """Para onde o dado pode sair. Alguns são inseguros por natureza."""

    log = "log"
    resposta_api = "resposta_de_api"
    tela = "tela"
    banco_sem_protecao = "banco_sem_protecao"
    # Saídas consideradas seguras:
    banco_cifrado = "banco_cifrado"
    canal_autorizado = "canal_autorizado"  # ex.: resposta ao próprio dono, autenticado


SUMIDOUROS_INSEGUROS = {
    Sumidouro.log,
    Sumidouro.resposta_api,
    Sumidouro.tela,
    Sumidouro.banco_sem_protecao,
}


class VazamentoBloqueado(Exception):
    """Levantada quando um dado contaminado tentaria sair sem proteção."""


@dataclass
class Rotulado:
    """Um valor com seu 'carimbo' de contaminação (tainted)."""

    valor: str
    fonte: Fonte
    contaminado: bool = True
    sanitizado: bool = False
    achados: list[Achado] = field(default_factory=list)

    @property
    def perigoso(self) -> bool:
        """Contaminado, ainda tem PII e não foi sanitizado."""
        return self.contaminado and bool(self.achados) and not self.sanitizado


@dataclass
class Vazamento:
    """Registro de auditoria de uma tentativa de saída de dado sensível."""

    fonte: Fonte
    sumidouro: Sumidouro
    tipos: list[str]
    severidade: Severidade
    bloqueado: bool
    quando: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )
    detalhe: str = ""

    def como_dict(self) -> dict:
        return {
            "fonte": self.fonte.value,
            "sumidouro": self.sumidouro.value,
            "tipos": self.tipos,
            "severidade": self.severidade.value,
            "bloqueado": self.bloqueado,
            "quando": self.quando,
            "detalhe": self.detalhe,
        }


_ORDEM_SEV = {
    Severidade.baixa: 1,
    Severidade.media: 2,
    Severidade.alta: 3,
    Severidade.critica: 4,
}


def _pior_severidade(achados: list[Achado]) -> Severidade:
    if not achados:
        return Severidade.baixa
    return max((a.severidade for a in achados), key=lambda s: _ORDEM_SEV[s])


class Rastreador:
    """Acompanha os fluxos e guarda a auditoria dos vazamentos (bloqueados ou não).

    Uso típico:
        r = Rastreador()
        dado = r.marcar("Meu CPF é 000.000.000-00", Fonte.usuario)
        r.enviar(dado, Sumidouro.log)          # -> bloqueia (PII indo pro log)
        seguro = r.sanitizar(dado)             # redige o PII
        r.enviar(seguro, Sumidouro.log)         # -> passa (já está limpo)
    """

    def __init__(self) -> None:
        self.vazamentos: list[Vazamento] = []
        self.fluxos_analisados = 0

    # -- fonte --------------------------------------------------------------
    def marcar(self, valor: str, fonte: Fonte) -> Rotulado:
        """Marca a entrada como contaminada e já mapeia o PII que ela carrega."""
        self.fluxos_analisados += 1
        achados = pii.detectar(valor or "")
        return Rotulado(valor=valor, fonte=fonte, achados=achados)

    # -- sanitizador --------------------------------------------------------
    def sanitizar(self, dado: Rotulado) -> Rotulado:
        """Limpa o dado (redige o PII). Depois disso ele pode sair com segurança."""
        limpo = pii.mascarar(dado.valor, dado.achados)
        return Rotulado(
            valor=limpo,
            fonte=dado.fonte,
            contaminado=dado.contaminado,
            sanitizado=True,
            achados=[],
        )

    # -- sumidouro ----------------------------------------------------------
    def enviar(self, dado: Rotulado, sumidouro: Sumidouro, detalhe: str = "") -> str:
        """Tenta mandar o dado para uma saída. Bloqueia se for perigoso e inseguro.

        Retorna o valor que de fato "sairia". Se bloquear, levanta
        VazamentoBloqueado — mas o registro de auditoria é gravado de qualquer forma.
        """
        inseguro = sumidouro in SUMIDOUROS_INSEGUROS
        if dado.perigoso and inseguro:
            tipos = sorted({a.rotulo for a in dado.achados})
            vaz = Vazamento(
                fonte=dado.fonte,
                sumidouro=sumidouro,
                tipos=tipos,
                severidade=_pior_severidade(dado.achados),
                bloqueado=True,
                detalhe=detalhe or f"PII em texto claro indo para {sumidouro.value}",
            )
            self.vazamentos.append(vaz)
            raise VazamentoBloqueado(
                f"Vazamento bloqueado: {', '.join(tipos)} tentou sair por "
                f"'{sumidouro.value}' sem proteção."
            )
        # Saída permitida (dado limpo, ou sumidouro seguro).
        if dado.contaminado and bool(dado.achados) and not inseguro:
            # Saiu, mas por um canal seguro — registra como protegido (não bloqueado).
            self.vazamentos.append(
                Vazamento(
                    fonte=dado.fonte,
                    sumidouro=sumidouro,
                    tipos=sorted({a.rotulo for a in dado.achados}),
                    severidade=_pior_severidade(dado.achados),
                    bloqueado=False,
                    detalhe=detalhe or f"Saída por canal seguro ({sumidouro.value})",
                )
            )
        return dado.valor

    def enviar_protegido(self, dado: Rotulado, sumidouro: Sumidouro) -> str:
        """Atalho correto: sanitiza antes de enviar para uma saída insegura.

        É o padrão que o código da Zela deve usar ao logar/responder dados do cidadão.
        """
        seguro = self.sanitizar(dado) if dado.perigoso else dado
        return self.enviar(seguro, sumidouro)

    # -- métricas -----------------------------------------------------------
    def resumo(self) -> dict:
        bloqueados = [v for v in self.vazamentos if v.bloqueado]
        return {
            "fluxos_analisados": self.fluxos_analisados,
            "vazamentos_bloqueados": len(bloqueados),
            "saidas_protegidas": len(self.vazamentos) - len(bloqueados),
        }
