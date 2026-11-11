"""Testes de UNIDADE do domínio — sem banco e sem HTTP.

Provam as regras de negócio puras (app/dominio/), que são o coração do serviço.
"""
import pytest

from app.dominio.encaminhamento import DESTINO_POR_NIVEL, destino_para
from app.dominio.enums import Destino, Nivel
from app.dominio.erros import RegraViolada
from app.dominio.triagem import classificar_por_sinais, validar_sintomas


# ------------------------------- Triagem -------------------------------
def test_sinal_de_alerta_vira_vermelho():
    c = classificar_por_sinais("estou com dor no peito e falta de ar")
    assert c.nivel is Nivel.vermelho
    assert c.origem.startswith("regras")


def test_sintoma_moderado_vira_amarelo():
    c = classificar_por_sinais("estou com febre há dois dias")
    assert c.nivel is Nivel.amarelo


def test_sem_sinais_claros_fica_em_cautela_amarela():
    c = classificar_por_sinais("não sei bem, me sinto meio estranho")
    assert c.nivel is Nivel.amarelo
    assert "cautela" in c.justificativa.lower()


# ------------------------- Validação do domínio ------------------------
def test_sintomas_vazios_violam_a_regra():
    with pytest.raises(RegraViolada):
        validar_sintomas("  ")


def test_sintomas_validos_passam():
    assert validar_sintomas("  febre e dor  ") == "febre e dor"


# --------------------------- Encaminhamento ----------------------------
def test_mapa_nivel_para_destino():
    assert destino_para(Nivel.verde) is Destino.casa
    assert destino_para(Nivel.amarelo) is Destino.ubs
    assert destino_para(Nivel.vermelho) is Destino.samu
    assert set(DESTINO_POR_NIVEL) == {Nivel.verde, Nivel.amarelo, Nivel.vermelho}
