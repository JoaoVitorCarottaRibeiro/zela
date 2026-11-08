"""Testes da ficha médica e dos campos de gênero/identidade de gênero."""


def _cadastro(**over):
    base = {
        "nome_completo": "Regina da Silva",
        "data_nascimento": "1972-05-10",
        "cpf": "12345678901",
        "senha": "Segredo@123",
        "confirmar_senha": "Segredo@123",
    }
    base.update(over)
    return base


def _token(client, **over) -> str:
    return client.post("/auth/cadastro", json=_cadastro(**over)).json()["token"]


# ------------------------- Gênero / identidade de gênero -------------------------

def test_cadastro_guarda_genero_e_identidade(client):
    r = client.post(
        "/auth/cadastro",
        json=_cadastro(genero="Feminino", identidade_genero="Cisgênero"),
    )
    assert r.status_code == 201, r.text
    u = r.json()["usuario"]
    assert u["genero"] == "Feminino"
    assert u["identidade_genero"] == "Cisgênero"


def test_genero_invalido_recusado(client):
    r = client.post("/auth/cadastro", json=_cadastro(genero="Outro valor"))
    assert r.status_code == 422


def test_perfil_edita_genero(client):
    token = _token(client)
    r = client.patch(
        "/auth/me",
        json={"genero": "Masculino", "identidade_genero": "Transgênero"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["genero"] == "Masculino"
    assert r.json()["identidade_genero"] == "Transgênero"


# ------------------------------- Ficha médica -------------------------------

def test_ficha_exige_login(client):
    assert client.get("/ficha").status_code == 401
    assert client.put("/ficha", json={"dados": {}}).status_code == 401


def test_ficha_comeca_vazia(client):
    token = _token(client)
    r = client.get("/ficha", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() is None  # ainda não preencheu


def test_salvar_e_obter_ficha(client):
    token = _token(client)
    headers = {"Authorization": f"Bearer {token}"}
    dados = {
        "sinais_emergencia": ["Nenhuma dessas situações"],
        "condicoes": ["Diabetes", "Hipertensão (pressão alta)"],
        "usa_medicamentos": "Sim",
        "medicamentos": [{"nome": "Metformina", "dosagem": "850mg", "frequencia": "2x/dia", "motivo": "Diabetes"}],
        "consent_veracidade": True,
        "consent_lgpd": True,
        "consent_ia": True,
    }
    r = client.put("/ficha", json={"dados": dados}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["dados"]["condicoes"] == ["Diabetes", "Hipertensão (pressão alta)"]

    g = client.get("/ficha", headers=headers)
    assert g.status_code == 200
    assert g.json()["dados"]["usa_medicamentos"] == "Sim"
    assert g.json()["dados"]["medicamentos"][0]["nome"] == "Metformina"


def test_ficha_upsert_atualiza(client):
    token = _token(client)
    headers = {"Authorization": f"Bearer {token}"}
    client.put("/ficha", json={"dados": {"fumo": "Nunca utilizei"}}, headers=headers)
    client.put("/ficha", json={"dados": {"fumo": "Utilizo atualmente"}}, headers=headers)
    g = client.get("/ficha", headers=headers)
    assert g.json()["dados"]["fumo"] == "Utilizo atualmente"


def test_ficha_de_um_usuario_nao_vaza_para_outro(client):
    t1 = _token(client)
    client.put(
        "/ficha",
        json={"dados": {"info_adicional": "segredo da Regina"}},
        headers={"Authorization": f"Bearer {t1}"},
    )
    t2 = _token(client, cpf="98765432100", email="outro@exemplo.com")
    g = client.get("/ficha", headers={"Authorization": f"Bearer {t2}"})
    assert g.status_code == 200
    assert g.json() is None
