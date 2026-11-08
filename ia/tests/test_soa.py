"""Testes da camada SOA: cidadãos, triagens e encaminhamentos."""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ------------------------------- Cidadão -------------------------------
def test_criar_e_obter_cidadao(client):
    r = client.post("/cidadaos", json={"nome": "Regina (fictícia)", "idade": 53, "bairro": "Vila Andrade"})
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["id"] > 0
    assert corpo["nome"] == "Regina (fictícia)"
    assert corpo["cidade"] == "São Paulo"  # default

    cid = corpo["id"]
    r2 = client.get(f"/cidadaos/{cid}")
    assert r2.status_code == 200
    assert r2.json()["idade"] == 53


def test_cidadao_inexistente_404(client):
    assert client.get("/cidadaos/999").status_code == 404


def test_atualizar_e_remover_cidadao(client):
    cid = client.post("/cidadaos", json={"nome": "Teste"}).json()["id"]
    r = client.put(f"/cidadaos/{cid}", json={"bairro": "Capão Redondo"})
    assert r.status_code == 200
    assert r.json()["bairro"] == "Capão Redondo"

    assert client.delete(f"/cidadaos/{cid}").status_code == 204
    assert client.get(f"/cidadaos/{cid}").status_code == 404


# ------------------------------- Triagem -------------------------------
def test_triagem_vermelha_gera_encaminhamento_samu(client):
    """Regra de ouro: sinal de alerta -> vermelho (pelas regras) -> SAMU."""
    r = client.post("/triagens", json={"sintomas": "estou com dor no peito e falta de ar"})
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["nivel"] == "vermelho"
    assert corpo["origem"].startswith("regras")
    assert len(corpo["encaminhamentos"]) == 1
    assert corpo["encaminhamentos"][0]["destino"] == "samu"
    assert corpo["encaminhamentos"][0]["status"] == "aberto"


def test_triagem_amarela_gera_encaminhamento_ubs(client):
    r = client.post("/triagens", json={"sintomas": "estou com febre há dois dias", "idade": 30})
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["nivel"] == "amarelo"
    assert corpo["encaminhamentos"][0]["destino"] == "ubs"


def test_triagem_vinculada_ao_cidadao(client):
    cid = client.post("/cidadaos", json={"nome": "Dona Fictícia"}).json()["id"]
    client.post("/triagens", json={"sintomas": "dor no peito", "cidadao_id": cid, "canal": "voz"})

    r = client.get(f"/cidadaos/{cid}/triagens")
    assert r.status_code == 200
    lista = r.json()
    assert len(lista) == 1
    assert lista[0]["canal"] == "voz"
    assert lista[0]["cidadao_id"] == cid


def test_triagem_com_cidadao_inexistente_404(client):
    r = client.post("/triagens", json={"sintomas": "febre", "cidadao_id": 9999})
    assert r.status_code == 404


def test_listar_e_obter_triagem(client):
    novo = client.post("/triagens", json={"sintomas": "dor no peito"}).json()
    assert client.get("/triagens").status_code == 200
    r = client.get(f"/triagens/{novo['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == novo["id"]


# --------------------------- Encaminhamento ---------------------------
def test_atualizar_status_do_encaminhamento(client):
    triagem = client.post("/triagens", json={"sintomas": "febre"}).json()
    enc_id = triagem["encaminhamentos"][0]["id"]

    r = client.patch(f"/encaminhamentos/{enc_id}", json={"status": "em_andamento", "observacao": "Fila da UBS"})
    assert r.status_code == 200
    assert r.json()["status"] == "em_andamento"
    assert r.json()["observacao"] == "Fila da UBS"


def test_listar_encaminhamentos_por_status(client):
    client.post("/triagens", json={"sintomas": "dor no peito"})  # abre 1 SAMU "aberto"
    r = client.get("/encaminhamentos", params={"status": "aberto"})
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert all(e["status"] == "aberto" for e in r.json())


def test_deletar_cidadao_remove_triagens_em_cascata(client):
    cid = client.post("/cidadaos", json={"nome": "Cascata"}).json()["id"]
    client.post("/triagens", json={"sintomas": "dor no peito", "cidadao_id": cid})
    assert len(client.get(f"/cidadaos/{cid}/triagens").json()) == 1

    client.delete(f"/cidadaos/{cid}")
    # triagens do cidadão somem junto (cascade)
    assert client.get("/triagens").status_code == 200
