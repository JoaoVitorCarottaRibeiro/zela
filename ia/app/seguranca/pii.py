"""Pilar 1 — Mapeamento de PII.

Motor de regras (regex + validação) que encontra DADOS PESSOAIS SENSÍVEIS no que
a Zela processa: CPF, Cartão SUS (CNS), RG, telefone, e-mail, CEP, data de
nascimento, SENHAS e TERMOS DE SAÚDE (o dado mais sensível da Zela).

Puro: só depende da biblioteca padrão. Não sabe o que é HTTP, banco ou IA — por
isso serve tanto para escanear texto da API quanto para redigir logs.

Ética/LGPD: a demonstração usa SEMPRE dados fictícios (ex.: CPF 000.000.000-00),
como o briefing da GS exige. O objetivo é PROTEGER, nunca coletar.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class TipoPII(str, Enum):
    """Categorias de dado pessoal que o motor reconhece."""

    cpf = "cpf"
    cns = "cns"  # Cartão Nacional de Saúde (SUS)
    rg = "rg"
    telefone = "telefone"
    email = "email"
    cep = "cep"
    data_nascimento = "data_nascimento"
    senha = "senha"
    saude = "saude"  # sintomas, diagnósticos, CID, medicamentos


class Severidade(str, Enum):
    """O quanto o vazamento desse dado machuca o cidadão."""

    baixa = "baixa"
    media = "media"
    alta = "alta"
    critica = "critica"


# Peso de cada tipo (usado no indicador de Risco Cidadão e na ordenação).
SEVERIDADE_POR_TIPO: dict[TipoPII, Severidade] = {
    TipoPII.cpf: Severidade.alta,
    TipoPII.cns: Severidade.alta,
    TipoPII.rg: Severidade.alta,
    TipoPII.telefone: Severidade.media,
    TipoPII.email: Severidade.media,
    TipoPII.cep: Severidade.baixa,
    TipoPII.data_nascimento: Severidade.media,
    TipoPII.senha: Severidade.critica,
    TipoPII.saude: Severidade.critica,  # dado sensível especial (LGPD art. 11)
}

ROTULO_HUMANO: dict[TipoPII, str] = {
    TipoPII.cpf: "CPF",
    TipoPII.cns: "Cartão SUS (CNS)",
    TipoPII.rg: "RG",
    TipoPII.telefone: "telefone",
    TipoPII.email: "e-mail",
    TipoPII.cep: "CEP",
    TipoPII.data_nascimento: "data de nascimento",
    TipoPII.senha: "senha",
    TipoPII.saude: "dado de saúde",
}


@dataclass(frozen=True)
class Achado:
    """Uma ocorrência de PII encontrada no texto (dado puro, imutável)."""

    tipo: TipoPII
    severidade: Severidade
    inicio: int
    fim: int
    trecho_mascarado: str

    @property
    def rotulo(self) -> str:
        return ROTULO_HUMANO[self.tipo]


# --------------------------------------------------------------------------
# Padrões
# --------------------------------------------------------------------------

# CPF FORMATADO (com pontos/traço) — sempre é CPF, mesmo fictício (000.000.000-00).
_CPF_FORMATADO = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
# CPF "cru" (11 dígitos seguidos) — só conta se os dígitos verificadores batem,
# para não confundir com qualquer número de 11 dígitos.
_CPF_CRU = re.compile(r"\b\d{11}\b")

_CNS = re.compile(r"\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b")  # 15 dígitos
_RG = re.compile(r"\b\d{1,2}\.\d{3}\.\d{3}-[\dxX]\b")
_TELEFONE = re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_CEP = re.compile(r"\b\d{5}-\d{3}\b")
_DATA = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")

# Senha em campos nomeados: senha=..., "password": "...", pwd: ...
_SENHA = re.compile(
    r"(?i)\b(?:senha|password|passwd|pwd)\b\s*[:=]\s*[\"']?([^\s\"',}]{3,})"
)

# Termos clínicos sensíveis (dado de saúde — categoria especial da LGPD).
_TERMOS_SAUDE = [
    "hiv", "aids", "soropositiv", "câncer", "cancer", "tumor", "quimioterapia",
    "diabetes", "hipertens", "depress", "ansiedade", "esquizofren", "bipolar",
    "gestante", "grávida", "gravida", "gravidez", "aborto", "tuberculose",
    "hepatite", "sífilis", "sifilis", "dst", "ist", "psiquiátric", "psiquiatric",
    "laudo", "diagnóstico", "diagnostico", "medicament", "hemograma", "glicemia",
]
_SAUDE = re.compile(r"(?i)\b(" + "|".join(_TERMOS_SAUDE) + r")\w*")

# CID-10 (ex.: "CID J45", "J45.0") — código de diagnóstico.
_CID = re.compile(r"(?i)\bcid[\s-]?\d*\s?[A-Z]\d{2}(?:\.\d)?\b|\b[A-TV-Z]\d{2}\.\d\b")


def cpf_valido(digitos: str) -> bool:
    """Valida os dígitos verificadores do CPF (algoritmo oficial da Receita)."""
    n = re.sub(r"\D", "", digitos)
    if len(n) != 11 or n == n[0] * 11:
        return False
    for i in (9, 10):
        soma = sum(int(n[j]) * ((i + 1) - j) for j in range(i))
        dv = (soma * 10) % 11 % 10
        if dv != int(n[i]):
            return False
    return True


def _mascarar_trecho(trecho: str) -> str:
    """Mostra só o começo e o fim (ex.: 'jo***@***.com', '000***-00')."""
    limpo = trecho.strip()
    if len(limpo) <= 4:
        return "***"
    return f"{limpo[:2]}***{limpo[-2:]}"


def _sem_sobreposicao(achados: list[Achado]) -> list[Achado]:
    """Remove achados contidos dentro de outro (evita contar o mesmo trecho 2x)."""
    ordenados = sorted(achados, key=lambda a: (a.inicio, -(a.fim - a.inicio)))
    resultado: list[Achado] = []
    ocupado: list[tuple[int, int]] = []
    for a in ordenados:
        if any(ini <= a.inicio and a.fim <= fim for ini, fim in ocupado):
            continue
        resultado.append(a)
        ocupado.append((a.inicio, a.fim))
    return resultado


def detectar(texto: str) -> list[Achado]:
    """Encontra todas as ocorrências de PII no texto. Lista vazia se não houver."""
    if not texto:
        return []

    achados: list[Achado] = []

    def _add(tipo: TipoPII, ini: int, fim: int, trecho: str) -> None:
        achados.append(
            Achado(tipo, SEVERIDADE_POR_TIPO[tipo], ini, fim, _mascarar_trecho(trecho))
        )

    for m in _CPF_FORMATADO.finditer(texto):
        _add(TipoPII.cpf, m.start(), m.end(), m.group())
    for m in _CPF_CRU.finditer(texto):
        # 11 dígitos crus: só é CPF se validar (ou for padrão de teste repetido).
        bruto = m.group()
        if cpf_valido(bruto) or bruto == bruto[0] * 11:
            _add(TipoPII.cpf, m.start(), m.end(), bruto)
    for m in _CNS.finditer(texto):
        _add(TipoPII.cns, m.start(), m.end(), m.group())
    for m in _RG.finditer(texto):
        _add(TipoPII.rg, m.start(), m.end(), m.group())
    for m in _EMAIL.finditer(texto):
        _add(TipoPII.email, m.start(), m.end(), m.group())
    for m in _CEP.finditer(texto):
        _add(TipoPII.cep, m.start(), m.end(), m.group())
    for m in _DATA.finditer(texto):
        _add(TipoPII.data_nascimento, m.start(), m.end(), m.group())
    for m in _TELEFONE.finditer(texto):
        # Evita capturar CPF/CNS/CEP já cobertos: exige ao menos 8 dígitos "de telefone".
        so_digitos = re.sub(r"\D", "", m.group())
        if 8 <= len(so_digitos) <= 13:
            _add(TipoPII.telefone, m.start(), m.end(), m.group())
    for m in _SENHA.finditer(texto):
        _add(TipoPII.senha, m.start(1), m.end(1), m.group(1))
    for m in _SAUDE.finditer(texto):
        _add(TipoPII.saude, m.start(), m.end(), m.group())
    for m in _CID.finditer(texto):
        _add(TipoPII.saude, m.start(), m.end(), m.group())

    return _sem_sobreposicao(achados)


def contem_pii(texto: str) -> bool:
    """True se o texto tem qualquer dado pessoal sensível."""
    return bool(detectar(texto))


def mascarar(texto: str, achados: list[Achado] | None = None) -> str:
    """Devolve o texto com todo PII REDIGIDO (ex.: '[CPF]', '[dado de saúde]').

    É a sanitização usada antes de logar/responder — torna o dado seguro.
    """
    if not texto:
        return texto
    if achados is None:
        achados = detectar(texto)
    if not achados:
        return texto
    # Substitui de trás para frente para não bagunçar os índices.
    resultado = texto
    for a in sorted(achados, key=lambda x: x.inicio, reverse=True):
        resultado = resultado[: a.inicio] + f"[{a.rotulo} protegido]" + resultado[a.fim :]
    return resultado


# "redigir" é o nome que o pilar de taint usa para sanitizar.
redigir = mascarar
