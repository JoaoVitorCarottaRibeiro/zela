"""Auditoria do protótipo (evidência da GS — Cybersecurity).

Roda a varredura de PII sobre fluxos fictícios da Zela e sobre o próprio código,
e demonstra o Taint Analysis bloqueando um vazamento. Gera um relatório no
terminal (ótimo para print) — SEM mostrar nenhum dado sensível em claro.

Uso (dentro de ia/):   python seguranca_scan.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# Console do Windows costuma ser cp1252; força UTF-8 para os acentos/emojis.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.seguranca import scanner, servico  # noqa: E402
from app.seguranca.auditoria import auditoria  # noqa: E402
from app.seguranca.taint import Fonte, Sumidouro  # noqa: E402

# Fluxos FICTÍCIOS que imitam o que a Zela processa (voz, conversa, exame).
FLUXOS = {
    "triagem (voz)": "Meu nome é Maria, meu CPF é 000.000.000-00 e estou com dor no peito.",
    "conversa": "Telefone (11) 99999-0000, e-mail maria@exemplo.com, tenho diabetes.",
    "exame": "Laudo: hemograma alterado. Cartão SUS 000 0000 0000 0000.",
    "login (log inseguro)": 'usuario=maria senha=segredo123',
}


def barra() -> None:
    print("=" * 72)


def main() -> None:
    barra()
    print(" AUDITORIA DE SEGURANÇA DA ZELA — Mapeamento de PII + Taint Analysis")
    print(" (dados fictícios; o relatório nunca imprime o dado sensível em claro)")
    barra()

    print("\n[1] MAPEAMENTO DE PII NOS FLUXOS\n")
    for origem, texto in FLUXOS.items():
        achados = scanner.escanear_texto(texto, origem=origem)
        rotulos = ", ".join(sorted({a.rotulo for a in achados})) or "nenhum"
        print(f"  • {origem:22} -> {len(achados):>2} achado(s): {rotulos}")

    print("\n[2] TAINT ANALYSIS — tentativa de vazamento para o LOG\n")
    demo = servico.demonstrar_vazamento(
        FLUXOS["login (log inseguro)"], Fonte.usuario, Sumidouro.log
    )
    for p in demo.passos:
        print(f"  {'OK ' if p.seguro else 'BLOQ'} | {p.titulo}")
        print(f"        {p.detalhe}")
    print(f"\n  Vazamento bloqueado? {'SIM' if demo.bloqueado else 'não'}")
    print(f"  O que SAIRIA sem proteção (mascarado): {demo.saida_insegura}")
    print(f"  O que de fato sai (protegido):          {demo.saida_segura}")

    print("\n[3] TRADUÇÃO PARA O CIDADÃO (Risco Cidadão)\n")
    for a in demo.alertas:
        print(f"  ⚠️  {a.titulo}  [risco {a.severidade.value}]")
        print(f"      {a.mensagem}")
        print(f"      → {a.recomendacao}")

    print("\n[4] VARREDURA DO CÓDIGO (procura PII acidental em .py/.md/.log)\n")
    relatorio = scanner.escanear_diretorio(Path(__file__).resolve().parent / "app")
    if relatorio:
        for arquivo, achados in relatorio.items():
            tipos = ", ".join(sorted({a.rotulo for a in achados}))
            print(f"  • {arquivo}: {tipos}")
    else:
        print("  Nenhum PII em texto claro no código. 👍")

    print("\n[5] INDICADOR DE RISCO CIDADÃO (o que o painel mostra)\n")
    ind = auditoria.indicador()
    for k, v in ind.items():
        print(f"  {k:24}: {v}")
    barra()
    print(" Fim. Abra o painel visual em:  http://localhost:8000/seguranca/painel")
    barra()


if __name__ == "__main__":
    main()
