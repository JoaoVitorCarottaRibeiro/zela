"""Testes do módulo de Cybersecurity (PII + taint + risco + painel).

Tudo offline: o Risco Cidadão cai no texto-modelo (sem Gemini), então é
determinístico. Usa dados FICTÍCIOS, como a GS exige.
"""
import pytest

from app.seguranca import pii, scanner, servico
from app.seguranca.auditoria import auditoria
from app.seguranca.pii import Severidade, TipoPII
from app.seguranca.taint import (
    Fonte,
    Rastreador,
    Sumidouro,
    VazamentoBloqueado,
)

CPF_FICTICIO = "000.000.000-00"


@pytest.fixture(autouse=True)
def _zera_auditoria():
    auditoria.zerar()
    yield
    auditoria.zerar()


# --- Pilar 1: PII --------------------------------------------------------
def test_detecta_cpf_formatado():
    achados = pii.detectar(f"Meu CPF é {CPF_FICTICIO}.")
    assert any(a.tipo == TipoPII.cpf for a in achados)


def test_detecta_cpf_valido_cru_e_ignora_numero_qualquer():
    # CPF válido conhecido (gerado para teste) é detectado...
    assert pii.cpf_valido("52998224725")
    assert any(a.tipo == TipoPII.cpf for a in pii.detectar("documento 52998224725"))
    # ...mas um número de 11 dígitos inválido não vira CPF.
    assert not pii.cpf_valido("12345678900")
    assert not any(a.tipo == TipoPII.cpf for a in pii.detectar("pedido 12345678900"))


def test_detecta_senha_email_telefone_e_saude():
    texto = "email maria@exemplo.com tel (11) 99999-0000 senha=segredo123 tenho diabetes"
    tipos = {a.tipo for a in pii.detectar(texto)}
    assert TipoPII.email in tipos
    assert TipoPII.telefone in tipos
    assert TipoPII.senha in tipos
    assert TipoPII.saude in tipos


def test_saude_e_senha_sao_mais_severos():
    assert pii.SEVERIDADE_POR_TIPO[TipoPII.saude] == Severidade.critica
    assert pii.SEVERIDADE_POR_TIPO[TipoPII.senha] == Severidade.critica


def test_mascarar_remove_o_dado_cru():
    texto = f"CPF {CPF_FICTICIO} e diabetes"
    protegido = pii.mascarar(texto)
    assert CPF_FICTICIO not in protegido
    assert "diabetes" not in protegido
    assert "protegido" in protegido


def test_texto_sem_pii_nao_gera_achado():
    assert pii.detectar("bom dia, estou com uma dúvida") == []


# --- Pilar 2: Taint ------------------------------------------------------
def test_taint_bloqueia_pii_em_saida_insegura():
    r = Rastreador()
    dado = r.marcar(f"CPF {CPF_FICTICIO}", Fonte.usuario)
    assert dado.perigoso
    with pytest.raises(VazamentoBloqueado):
        r.enviar(dado, Sumidouro.log)
    assert r.vazamentos and r.vazamentos[0].bloqueado


def test_taint_libera_apos_sanitizar():
    r = Rastreador()
    dado = r.marcar(f"CPF {CPF_FICTICIO}", Fonte.usuario)
    seguro = r.sanitizar(dado)
    assert not seguro.perigoso
    # Não levanta: já está limpo.
    saida = r.enviar(seguro, Sumidouro.log)
    assert CPF_FICTICIO not in saida


def test_taint_permite_dado_sem_pii():
    r = Rastreador()
    dado = r.marcar("só uma dúvida", Fonte.usuario)
    assert not dado.perigoso
    assert r.enviar(dado, Sumidouro.log) == "só uma dúvida"


def test_enviar_protegido_sanitiza_sozinho():
    r = Rastreador()
    dado = r.marcar(f"CPF {CPF_FICTICIO}", Fonte.usuario)
    saida = r.enviar_protegido(dado, Sumidouro.resposta_api)
    assert CPF_FICTICIO not in saida


# --- Pilar 3: Risco Cidadão (offline) -----------------------------------
def test_traduz_para_risco_cidadao_sem_ia():
    r = servico.escanear_e_traduzir(f"CPF {CPF_FICTICIO}, diabetes", origem="teste")
    assert r.alertas
    # Tem alerta para o dado de saúde (crítico) e pro CPF.
    severidades = {a.severidade for a in r.alertas}
    assert Severidade.critica in severidades
    for a in r.alertas:
        assert a.titulo and a.mensagem and a.recomendacao


# --- Scanner + auditoria/indicador --------------------------------------
def test_scanner_registra_na_auditoria():
    scanner.escanear_texto(f"CPF {CPF_FICTICIO}", origem="fluxo-x")
    ind = auditoria.indicador()
    assert ind["pii_detectados"] >= 1
    assert auditoria.eventos()


def test_demo_vazamento_bloqueia_e_depois_protege():
    r = servico.demonstrar_vazamento(f"senha=abc123 CPF {CPF_FICTICIO}")
    assert r.bloqueado is True
    assert CPF_FICTICIO not in r.saida_segura
    ind = auditoria.indicador()
    assert ind["vazamentos_bloqueados"] >= 1


# --- API ----------------------------------------------------------------
def test_endpoint_scan(client):
    resp = client.post("/seguranca/scan", json={"texto": f"CPF {CPF_FICTICIO} e diabetes"})
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["achados"]
    assert corpo["alertas"]
    assert CPF_FICTICIO not in corpo["texto_protegido"]


def test_endpoint_demo_e_indicador(client):
    resp = client.post("/seguranca/demo-vazamento", json={})
    assert resp.status_code == 200
    assert resp.json()["bloqueado"] is True
    ind = client.get("/seguranca/indicador")
    assert ind.status_code == 200
    assert ind.json()["vazamentos_bloqueados"] >= 1


def test_endpoint_painel_html(client):
    resp = client.get("/seguranca/painel")
    assert resp.status_code == 200
    assert "Risco Cidadão" in resp.text


def test_painel_nao_vaza_pii_do_scan(client):
    client.post("/seguranca/scan", json={"texto": f"CPF {CPF_FICTICIO}"})
    aud = client.get("/seguranca/auditoria").json()
    # A auditoria guarda só o TIPO, nunca o número.
    assert CPF_FICTICIO not in str(aud)
