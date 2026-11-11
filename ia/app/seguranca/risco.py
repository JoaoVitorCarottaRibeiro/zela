"""Pilar 3 — Tradução via IA: de "falha técnica" para "Risco Cidadão".

Pega um achado técnico de segurança (ex.: "CPF em texto claro no log") e o traduz
em um alerta que QUALQUER pessoa entende: o que é, por que importa para VOCÊ, e o
que foi feito. Usa o mesmo Gemini da triagem; se a IA não estiver disponível, cai
em um texto-modelo (offline), então o painel nunca fica mudo.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.core.config import settings
from app.seguranca.pii import ROTULO_HUMANO, Severidade, TipoPII

logger = logging.getLogger(__name__)

PROMPT_RISCO = (
    "Você é o setor de segurança da Zela explicando um risco de dados para o "
    "CIDADÃO comum (que pode não saber ler bem), não para um técnico. "
    "Receba uma falha técnica e devolva um alerta curto, calmo e claro. "
    "Nunca repita o dado sensível em si. "
    "Responda SEMPRE em JSON com os campos: "
    "titulo (curtíssimo), mensagem (1-2 frases simples sobre o risco para a pessoa), "
    "recomendacao (o que a Zela faz para proteger)."
)

# Severidade -> rótulo amigável no painel.
_ROTULO_SEVERIDADE = {
    Severidade.baixa: "baixo",
    Severidade.media: "médio",
    Severidade.alta: "alto",
    Severidade.critica: "crítico",
}


@dataclass
class AlertaRisco:
    """Um alerta de Risco Cidadão, pronto para o painel."""

    titulo: str
    mensagem: str
    recomendacao: str
    severidade: Severidade
    achado_tecnico: str

    def como_dict(self) -> dict:
        return {
            "titulo": self.titulo,
            "mensagem": self.mensagem,
            "recomendacao": self.recomendacao,
            "severidade": self.severidade.value,
            "severidade_rotulo": _ROTULO_SEVERIDADE[self.severidade],
            "achado_tecnico": self.achado_tecnico,
        }


# --------------------------------------------------------------------------
# Textos-modelo (offline) — garantem o painel mesmo sem internet/IA.
# --------------------------------------------------------------------------
_MODELO_POR_TIPO: dict[TipoPII, tuple[str, str, str]] = {
    TipoPII.cpf: (
        "Seu CPF estava exposto",
        "Seu CPF apareceu em um lugar que não deveria. Com ele, alguém poderia se "
        "passar por você.",
        "A Zela escondeu o número antes que ele fosse guardado ou mostrado.",
    ),
    TipoPII.senha: (
        "Uma senha estava à mostra",
        "Uma senha apareceu em texto aberto. Senhas nunca devem ficar visíveis.",
        "A Zela apagou a senha do registro na hora.",
    ),
    TipoPII.saude: (
        "Uma informação de saúde sua estava exposta",
        "Um dado da sua saúde apareceu onde não devia. Isso é muito pessoal e "
        "protegido por lei.",
        "A Zela ocultou essa informação antes de sair da triagem.",
    ),
    TipoPII.cns: (
        "Seu Cartão SUS estava exposto",
        "O número do seu Cartão SUS apareceu em um lugar inseguro.",
        "A Zela escondeu o número para proteger seu histórico de saúde.",
    ),
    TipoPII.telefone: (
        "Seu telefone estava exposto",
        "Seu número de telefone apareceu onde não devia e poderia receber golpes.",
        "A Zela ocultou o número do registro.",
    ),
    TipoPII.email: (
        "Seu e-mail estava exposto",
        "Seu e-mail apareceu em um lugar inseguro e poderia receber golpes.",
        "A Zela ocultou o e-mail do registro.",
    ),
}
_MODELO_PADRAO = (
    "Um dado pessoal seu estava exposto",
    "Uma informação pessoal sua apareceu onde não deveria.",
    "A Zela protegeu esse dado antes que ele saísse.",
)


def traduzir(
    achado_tecnico: str,
    tipo: TipoPII,
    severidade: Severidade,
) -> AlertaRisco:
    """Traduz um achado técnico em Risco Cidadão. Tenta a IA; cai no modelo offline."""
    ia = _traduzir_com_ia(achado_tecnico, tipo, severidade)
    if ia is not None:
        return ia
    titulo, mensagem, recomendacao = _MODELO_POR_TIPO.get(tipo, _MODELO_PADRAO)
    return AlertaRisco(
        titulo=titulo,
        mensagem=mensagem,
        recomendacao=recomendacao,
        severidade=severidade,
        achado_tecnico=achado_tecnico,
    )


def _traduzir_com_ia(
    achado_tecnico: str,
    tipo: TipoPII,
    severidade: Severidade,
) -> AlertaRisco | None:
    """Chama o Gemini. Retorna None se a IA não estiver disponível ou falhar."""
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("google-genai ausente; usando texto-modelo do Risco Cidadão.")
        return None

    client = genai.Client(api_key=settings.gemini_api_key)
    config = types.GenerateContentConfig(
        system_instruction=PROMPT_RISCO,
        response_mime_type="application/json",
        temperature=0.3,
    )
    conteudo = (
        f"Falha técnica: {achado_tecnico}\n"
        f"Tipo de dado: {ROTULO_HUMANO.get(tipo, tipo.value)}\n"
        f"Severidade técnica: {severidade.value}"
    )
    try:
        resposta = client.models.generate_content(
            model=settings.gemini_model, contents=conteudo, config=config
        )
        dados = json.loads(resposta.text)
        return AlertaRisco(
            titulo=dados["titulo"],
            mensagem=dados["mensagem"],
            recomendacao=dados["recomendacao"],
            severidade=severidade,
            achado_tecnico=achado_tecnico,
        )
    except Exception as e:
        logger.warning("Falha ao traduzir risco com a IA: %s", e)
        return None
