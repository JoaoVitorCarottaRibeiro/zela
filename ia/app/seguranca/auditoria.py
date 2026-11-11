"""Auditoria central + indicador de "Risco Cidadão".

Guarda em memória o que o módulo de segurança viu (achados de PII e vazamentos
bloqueados) e calcula o INDICADOR que o painel mostra. É proposital que seja em
memória: é um protótipo de demonstração (a GS pede evidências/painel, não um SIEM).

Nota de privacidade: aqui NUNCA entra o dado sensível em si — só o TIPO
(ex.: "CPF"), a severidade e se foi bloqueado. A auditoria é, ela mesma, segura.
"""
from __future__ import annotations

import threading
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.seguranca.pii import Achado, Severidade
from app.seguranca.taint import Vazamento

_ORDEM_SEV = {
    Severidade.baixa: 1,
    Severidade.media: 2,
    Severidade.alta: 3,
    Severidade.critica: 4,
}


@dataclass
class Evento:
    """Uma linha da auditoria (sem nenhum dado sensível)."""

    tipo_evento: str  # "scan" | "vazamento_bloqueado" | "saida_protegida"
    descricao: str
    severidade: Severidade
    quando: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )

    def como_dict(self) -> dict:
        return {
            "tipo_evento": self.tipo_evento,
            "descricao": self.descricao,
            "severidade": self.severidade.value,
            "quando": self.quando,
        }


class Auditoria:
    """Registro thread-safe dos eventos de segurança e cálculo do Risco Cidadão."""

    def __init__(self, limite: int = 200) -> None:
        self._eventos: list[Evento] = []
        self._limite = limite
        self._lock = threading.Lock()
        self.pii_detectados = 0
        self.vazamentos_bloqueados = 0
        self.saidas_protegidas = 0
        self.vazamentos_confirmados = 0  # dado sensível que saiu SEM proteção (falha)

    def registrar_vazamento_confirmado(self, descricao: str, severidade: Severidade) -> None:
        """Registra uma falha real: PII saiu sem proteção (o escudo não conteve)."""
        with self._lock:
            self.vazamentos_confirmados += 1
            self._adicionar(Evento("vazamento_confirmado", descricao, severidade))

    def registrar_scan(self, origem: str, achados: list[Achado]) -> None:
        if not achados:
            return
        sev = max((a.severidade for a in achados), key=lambda s: _ORDEM_SEV[s])
        tipos = sorted({a.rotulo for a in achados})
        with self._lock:
            self.pii_detectados += len(achados)
            self._adicionar(
                Evento(
                    "scan",
                    f"{len(achados)} dado(s) sensível(is) encontrado(s) em {origem}: "
                    + ", ".join(tipos),
                    sev,
                )
            )

    def registrar_vazamento(self, vaz: Vazamento) -> None:
        with self._lock:
            if vaz.bloqueado:
                self.vazamentos_bloqueados += 1
                self._adicionar(
                    Evento(
                        "vazamento_bloqueado",
                        f"Vazamento bloqueado: {', '.join(vaz.tipos)} iria para "
                        f"'{vaz.sumidouro.value}' (origem: {vaz.fonte.value}).",
                        vaz.severidade,
                    )
                )
            else:
                self.saidas_protegidas += 1
                self._adicionar(
                    Evento(
                        "saida_protegida",
                        f"Saída protegida: {', '.join(vaz.tipos)} por "
                        f"'{vaz.sumidouro.value}'.",
                        vaz.severidade,
                    )
                )

    def _adicionar(self, ev: Evento) -> None:
        self._eventos.append(ev)
        if len(self._eventos) > self._limite:
            self._eventos = self._eventos[-self._limite :]

    def eventos(self, n: int = 50) -> list[dict]:
        with self._lock:
            return [e.como_dict() for e in reversed(self._eventos[-n:])]

    def indicador(self) -> dict:
        """O indicador de Risco Cidadão mostrado no painel.

        Um vazamento BLOQUEADO é um SUCESSO do escudo (o dado não saiu). Só conta
        como falha um vazamento CONFIRMADO: dado sensível que saiu sem proteção.
        """
        with self._lock:
            tratados = self.vazamentos_bloqueados + self.saidas_protegidas
            total = tratados + self.vazamentos_confirmados
            # % dos fluxos de risco que foram efetivamente protegidos.
            protecao = 100 if total == 0 else round(tratados / total * 100)
            nivel = self._nivel(tratados, self.vazamentos_confirmados)
            contagem = Counter(e.severidade.value for e in self._eventos)
            return {
                "nivel_risco": nivel,
                "protecao_percentual": protecao,
                "pii_detectados": self.pii_detectados,
                "vazamentos_bloqueados": self.vazamentos_bloqueados,
                "saidas_protegidas": self.saidas_protegidas,
                "vazamentos_confirmados": self.vazamentos_confirmados,
                "por_severidade": dict(contagem),
                "total_eventos": len(self._eventos),
            }

    @staticmethod
    def _nivel(tratados: int, confirmados: int) -> str:
        if confirmados > 0:
            return "critico"  # dado sensível saiu sem proteção
        if tratados == 0:
            return "tranquilo"  # nada sensível em trânsito
        return "protegido"  # houve risco, mas o escudo conteve tudo

    def zerar(self) -> None:
        """Limpa a auditoria (usado nos testes e para recomeçar uma demonstração)."""
        with self._lock:
            self._eventos.clear()
            self.pii_detectados = 0
            self.vazamentos_bloqueados = 0
            self.saidas_protegidas = 0
            self.vazamentos_confirmados = 0


# Instância única usada pela aplicação (o painel lê daqui).
auditoria = Auditoria()
