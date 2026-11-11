"""Testes da triagem CONVERSACIONAL (a IA pergunta antes de concluir).

Os dois pilares:
- Senso crítico: não conclui com informação de menos; a emergência tem prioridade.
- Interação: a IA pode devolver uma pergunta (com sugestões) antes de concluir.

A IA fica indisponível por padrão (ver conftest); quando um teste quer simular a
IA, ele sobrescreve `triagem_service.conversar_com_ia`.
"""
from app.schemas import MensagemConversa
from app.services import triagem_service
from app.services.triagem_service import PassoConversa


def _msg(autor, texto):
    return MensagemConversa(autor=autor, texto=texto)


# ----------------------------- Motor (unidade) -----------------------------
def test_emergencia_conclui_vermelho_sem_perguntar():
    """Regra de ouro: sinal de alerta -> vermelho na hora, sem conversa."""
    passo = triagem_service.conversar([_msg("usuario", "estou com dor no peito")])
    assert passo.estado == "concluido"
    assert passo.resultado.nivel.value == "vermelho"


def test_sem_ia_conclui_pelas_regras():
    """Offline (IA indisponível): conclui pelas regras, não trava pedindo mais."""
    passo = triagem_service.conversar([_msg("usuario", "estou com febre")])
    assert passo.estado == "concluido"
    assert passo.resultado.nivel.value == "amarelo"


def test_ia_pode_fazer_pergunta(monkeypatch):
    monkeypatch.setattr(
        triagem_service,
        "conversar_com_ia",
        lambda *a, **k: PassoConversa(
            estado="pergunta",
            pergunta="Há quanto tempo você está assim?",
            sugestoes=["Agora", "Alguns dias"],
        ),
    )
    passo = triagem_service.conversar([_msg("usuario", "dor de cabeça leve")])
    assert passo.estado == "pergunta"
    assert passo.pergunta
    assert "Agora" in passo.sugestoes


def test_emergencia_tem_prioridade_sobre_pergunta_da_ia(monkeypatch):
    """Mesmo se a IA fosse perguntar, um sinal vermelho conclui antes."""
    monkeypatch.setattr(
        triagem_service,
        "conversar_com_ia",
        lambda *a, **k: PassoConversa(estado="pergunta", pergunta="Dói onde?"),
    )
    passo = triagem_service.conversar([_msg("usuario", "não consigo respirar")])
    assert passo.estado == "concluido"
    assert passo.resultado.nivel.value == "vermelho"


def test_resumo_junta_as_falas_do_usuario():
    hist = [
        _msg("usuario", "dor de cabeça"),
        _msg("zela", "Há quanto tempo?"),
        _msg("usuario", "começou agora"),
    ]
    passo = triagem_service.conversar(hist)
    assert "dor de cabeça" in passo.resumo and "começou agora" in passo.resumo


# ----------------------------- Endpoint (HTTP) -----------------------------
def test_endpoint_pergunta(client, monkeypatch):
    monkeypatch.setattr(
        triagem_service,
        "conversar_com_ia",
        lambda *a, **k: PassoConversa(
            estado="pergunta", pergunta="Tem febre?", sugestoes=["Sim", "Não"]
        ),
    )
    r = client.post(
        "/triagem/conversa",
        json={"historico": [{"autor": "usuario", "texto": "dor de cabeça leve"}]},
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["estado"] == "pergunta"
    assert corpo["pergunta"] == "Tem febre?"
    assert corpo["sugestoes"] == ["Sim", "Não"]
    assert corpo["triagem"] is None


def test_endpoint_conclui_registra_e_encaminha(client, monkeypatch):
    monkeypatch.setattr(
        triagem_service,
        "conversar_com_ia",
        lambda *a, **k: PassoConversa(
            estado="concluido",
            resultado=triagem_service.ResultadoTriagem(
                nivel=triagem_service.Nivel.verde,
                orientacao="Pode cuidar em casa e observar.",
                justificativa="Sintoma leve, recente e isolado.",
                origem="ia",
            ),
            resumo="dor de cabeça leve começou agora",
        ),
    )
    r = client.post(
        "/triagem/conversa",
        json={
            "historico": [
                {"autor": "usuario", "texto": "dor de cabeça leve"},
                {"autor": "zela", "texto": "Há quanto tempo?"},
                {"autor": "usuario", "texto": "começou agora"},
            ]
        },
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["estado"] == "concluido"
    t = corpo["triagem"]
    assert t["nivel"] == "verde"
    assert t["encaminhamentos"][0]["destino"] == "casa"
    # Ficou registrada no banco.
    assert client.get(f"/triagens/{t['id']}").status_code == 200


def test_endpoint_emergencia_conclui_samu(client):
    r = client.post(
        "/triagem/conversa",
        json={"historico": [{"autor": "usuario", "texto": "dor no peito e falta de ar"}]},
    )
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["estado"] == "concluido"
    assert corpo["triagem"]["nivel"] == "vermelho"
    assert corpo["triagem"]["encaminhamentos"][0]["destino"] == "samu"
