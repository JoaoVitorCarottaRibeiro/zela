"""Varredura: aplica o motor de PII em textos, dicionários e arquivos.

Serve para a AUDITORIA DO PROTÓTIPO (evidência pedida na GS): rodar sobre o
código/fluxos da Zela e mostrar onde há dado sensível e se ele estaria protegido.
"""
from __future__ import annotations

from pathlib import Path

from app.seguranca import pii
from app.seguranca.auditoria import auditoria
from app.seguranca.pii import Achado


def escanear_texto(texto: str, origem: str = "texto", registrar: bool = True) -> list[Achado]:
    """Procura PII em um texto. Opcionalmente registra na auditoria central."""
    achados = pii.detectar(texto)
    if registrar:
        auditoria.registrar_scan(origem, achados)
    return achados


def escanear_dict(dados: dict, origem: str = "payload", registrar: bool = True) -> list[Achado]:
    """Procura PII nos valores de um dicionário (ex.: corpo de uma requisição)."""
    achados: list[Achado] = []
    for chave, valor in dados.items():
        achados.extend(pii.detectar(f"{chave}: {valor}"))
    if registrar:
        auditoria.registrar_scan(origem, achados)
    return achados


def escanear_arquivo(caminho: str | Path, registrar: bool = True) -> list[Achado]:
    """Procura PII no conteúdo de um arquivo de texto/código."""
    p = Path(caminho)
    try:
        conteudo = p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    return escanear_texto(conteudo, origem=p.name, registrar=registrar)


def escanear_diretorio(
    raiz: str | Path,
    extensoes: tuple[str, ...] = (".py", ".txt", ".log", ".md", ".json"),
    registrar: bool = True,
) -> dict[str, list[Achado]]:
    """Varre um diretório e devolve {arquivo: achados} só dos que têm PII."""
    raiz = Path(raiz)
    relatorio: dict[str, list[Achado]] = {}
    for p in raiz.rglob("*"):
        if p.is_file() and p.suffix in extensoes:
            achados = escanear_arquivo(p, registrar=registrar)
            if achados:
                relatorio[str(p)] = achados
    return relatorio
