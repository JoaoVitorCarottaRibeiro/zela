"""Testes de autenticação: cadastro, login (CPF/e-mail), proteção e Resultados."""


def _cadastro_valido(**over):
    base = {
        "nome_completo": "Regina da Silva",
        "data_nascimento": "1972-05-10",
        "cpf": "12345678901",
        "senha": "Segredo@123",
        "confirmar_senha": "Segredo@123",
        "email": "regina@exemplo.com",
    }
    base.update(over)
    return base


def test_cadastro_devolve_token_e_usuario(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido())
    assert r.status_code == 201, r.text
    dados = r.json()
    assert dados["token"]
    assert dados["usuario"]["cpf"] == "12345678901"
    assert dados["usuario"]["email"] == "regina@exemplo.com"
    assert "senha" not in dados["usuario"]


def test_cpf_precisa_de_11_digitos(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido(cpf="123"))
    assert r.status_code == 422


def test_cpf_aceita_mascara_e_guarda_so_digitos(client):
    r = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(cpf="529.982.247-25", email=None),
    )
    assert r.status_code == 201, r.text
    assert r.json()["usuario"]["cpf"] == "52998224725"


def test_senhas_diferentes_sao_recusadas(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido(confirmar_senha="outra"))
    assert r.status_code == 422


def test_senha_fraca_recusada(client):
    # sem maiúscula, sem símbolo
    r = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(senha="abc123", confirmar_senha="abc123"),
    )
    assert r.status_code == 422


def test_cpf_duplicado_bloqueado(client):
    client.post("/auth/cadastro", json=_cadastro_valido(email=None))
    r = client.post("/auth/cadastro", json=_cadastro_valido(email=None))
    assert r.status_code == 409


def test_email_opcional(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido(email=None))
    assert r.status_code == 201, r.text
    assert r.json()["usuario"]["email"] is None


def test_cadastro_guarda_endereco(client):
    r = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(
            cep="01001-000",
            logradouro="Praça da Sé",
            bairro="Sé",
            cidade="São Paulo",
            uf="sp",
            complemento="lado ímpar",
        ),
    )
    assert r.status_code == 201, r.text
    u = r.json()["usuario"]
    assert u["cep"] == "01001000"  # só dígitos
    assert u["uf"] == "SP"  # maiúsculo
    assert u["logradouro"] == "Praça da Sé"
    assert u["complemento"] == "lado ímpar"


def test_cadastro_endereco_opcional(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido())
    assert r.status_code == 201, r.text
    assert r.json()["usuario"]["cep"] is None


def test_cep_invalido_recusado(client):
    r = client.post("/auth/cadastro", json=_cadastro_valido(cep="123"))
    assert r.status_code == 422


def test_login_por_cpf_e_por_email(client):
    client.post("/auth/cadastro", json=_cadastro_valido())
    por_cpf = client.post("/auth/login", json={"login": "12345678901", "senha": "Segredo@123"})
    assert por_cpf.status_code == 200, por_cpf.text
    por_email = client.post(
        "/auth/login", json={"login": "regina@exemplo.com", "senha": "Segredo@123"}
    )
    assert por_email.status_code == 200, por_email.text


def test_login_senha_errada(client):
    client.post("/auth/cadastro", json=_cadastro_valido())
    r = client.post("/auth/login", json={"login": "12345678901", "senha": "errada"})
    assert r.status_code == 401


def test_me_exige_token(client):
    assert client.get("/auth/me").status_code == 401
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["nome_completo"] == "Regina da Silva"


def test_triagem_vincula_ao_usuario_e_aparece_em_minhas(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/triagens",
        json={"sintomas": "dor no peito e falta de ar", "canal": "app"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["usuario_id"] is not None
    assert r.json()["nivel"] == "vermelho"

    minhas = client.get("/triagens/minhas", headers=headers)
    assert minhas.status_code == 200
    assert len(minhas.json()) == 1


def test_minhas_triagens_exige_login(client):
    assert client.get("/triagens/minhas").status_code == 401


def test_triagem_de_um_usuario_nao_aparece_para_outro(client):
    t1 = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    client.post(
        "/triagens",
        json={"sintomas": "dor de cabeça leve", "canal": "app"},
        headers={"Authorization": f"Bearer {t1}"},
    )
    t2 = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(cpf="98765432100", email="outro@exemplo.com"),
    ).json()["token"]
    minhas = client.get(
        "/triagens/minhas", headers={"Authorization": f"Bearer {t2}"}
    )
    assert minhas.status_code == 200
    assert minhas.json() == []


# --------------------------- Urgência (convidado) ---------------------------

def test_urgencia_cria_triagem_sem_login_e_sem_dono(client):
    # Convidado faz triagem só com o CPF, sem token.
    r = client.post(
        "/triagens",
        json={"sintomas": "dor de cabeça leve", "canal": "app", "cpf_informado": "12345678901"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["usuario_id"] is None  # não vira dono por CPF


def test_urgencia_vincula_ao_fazer_login(client):
    # 1) Convidado faz triagem de urgência com um CPF.
    client.post(
        "/triagens",
        json={"sintomas": "dor no peito e falta de ar", "cpf_informado": "12345678901"},
    )
    # 2) Alguém se cadastra e faz login com esse mesmo CPF (prova ser o dono).
    client.post("/auth/cadastro", json=_cadastro_valido(cpf="12345678901"))
    login = client.post(
        "/auth/login", json={"login": "12345678901", "senha": "Segredo@123"}
    )
    token = login.json()["token"]
    # 3) A triagem de urgência agora aparece no histórico dele.
    minhas = client.get("/triagens/minhas", headers={"Authorization": f"Bearer {token}"})
    assert minhas.status_code == 200
    assert len(minhas.json()) == 1
    assert minhas.json()[0]["usuario_id"] is not None


def test_urgencia_de_um_cpf_nao_vincula_a_outro(client):
    client.post(
        "/triagens",
        json={"sintomas": "tosse leve", "cpf_informado": "12345678901"},
    )
    outro = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(cpf="98765432100", email="outro@exemplo.com"),
    ).json()["token"]
    minhas = client.get("/triagens/minhas", headers={"Authorization": f"Bearer {outro}"})
    assert minhas.json() == []


def test_urgencia_cpf_invalido_recusado(client):
    r = client.post(
        "/triagens",
        json={"sintomas": "dor de cabeça", "cpf_informado": "123"},
    )
    assert r.status_code == 422


# --------------------------- Recuperação de senha ---------------------------

def test_recuperar_responde_generico_para_qualquer_login(client):
    client.post("/auth/cadastro", json=_cadastro_valido())
    existe = client.post("/auth/recuperar", json={"login": "regina@exemplo.com"})
    nao_existe = client.post("/auth/recuperar", json={"login": "ninguem@exemplo.com"})
    assert existe.status_code == 200
    assert nao_existe.status_code == 200
    # Mensagem idêntica — não revela se a conta existe.
    assert existe.json() == nao_existe.json()


def test_redefinir_com_token_valido_troca_a_senha(client):
    from app.core.security import criar_token_reset

    uid = client.post("/auth/cadastro", json=_cadastro_valido()).json()["usuario"]["id"]
    token = criar_token_reset(uid)
    r = client.post(
        "/auth/redefinir",
        json={"token": token, "senha": "NovaSenha@9", "confirmar_senha": "NovaSenha@9"},
    )
    assert r.status_code == 200, r.text
    # senha antiga não entra mais; a nova entra
    assert client.post("/auth/login", json={"login": "12345678901", "senha": "Segredo@123"}).status_code == 401
    assert client.post("/auth/login", json={"login": "12345678901", "senha": "NovaSenha@9"}).status_code == 200


def test_redefinir_token_invalido_recusado(client):
    r = client.post(
        "/auth/redefinir",
        json={"token": "abc.def", "senha": "NovaSenha@9", "confirmar_senha": "NovaSenha@9"},
    )
    assert r.status_code == 400


def test_redefinir_senha_fraca_recusada(client):
    from app.core.security import criar_token_reset

    uid = client.post("/auth/cadastro", json=_cadastro_valido()).json()["usuario"]["id"]
    token = criar_token_reset(uid)
    r = client.post(
        "/auth/redefinir",
        json={"token": token, "senha": "fraca", "confirmar_senha": "fraca"},
    )
    assert r.status_code == 422


def test_token_de_reset_nao_serve_para_autenticar(client):
    from app.core.security import criar_token_reset

    uid = client.post("/auth/cadastro", json=_cadastro_valido()).json()["usuario"]["id"]
    reset = criar_token_reset(uid)
    # Token de redefinição não deve valer como token de login.
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {reset}"})
    assert r.status_code == 401


# --------------------------- Editar perfil (PATCH /me) ---------------------------

def test_editar_perfil_atualiza_nome_email_e_endereco(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    r = client.patch(
        "/auth/me",
        json={
            "nome_completo": "Regina da Silva Souza",
            "email": "regina.nova@exemplo.com",
            "cep": "01001-000",
            "logradouro": "Praça da Sé",
            "bairro": "Sé",
            "cidade": "São Paulo",
            "uf": "sp",
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    u = r.json()
    assert u["nome_completo"] == "Regina da Silva Souza"
    assert u["email"] == "regina.nova@exemplo.com"
    assert u["cep"] == "01001000"  # só dígitos
    assert u["uf"] == "SP"  # maiúsculo
    # Persistiu: /me reflete a mudança.
    assert client.get("/auth/me", headers=headers).json()["cidade"] == "São Paulo"


def test_editar_perfil_exige_login(client):
    assert client.patch("/auth/me", json={"nome_completo": "Fulano"}).status_code == 401


def test_editar_perfil_nao_altera_cpf(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    # CPF não é campo editável — é ignorado.
    r = client.patch("/auth/me", json={"cpf": "99999999999"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["cpf"] == "12345678901"


def test_editar_perfil_email_duplicado_bloqueado(client):
    # Dono do e-mail "regina@exemplo.com".
    client.post("/auth/cadastro", json=_cadastro_valido())
    # Outro usuário tenta assumir o mesmo e-mail.
    token = client.post(
        "/auth/cadastro",
        json=_cadastro_valido(cpf="98765432100", email="outro@exemplo.com"),
    ).json()["token"]
    r = client.patch(
        "/auth/me",
        json={"email": "regina@exemplo.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 409


# --------------------------- Trocar senha (logado) ---------------------------

def test_trocar_senha_com_atual_correta(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    r = client.post(
        "/auth/trocar-senha",
        json={
            "senha_atual": "Segredo@123",
            "senha": "NovaSenha@9",
            "confirmar_senha": "NovaSenha@9",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    # A antiga não entra mais; a nova entra.
    assert client.post(
        "/auth/login", json={"login": "12345678901", "senha": "Segredo@123"}
    ).status_code == 401
    assert client.post(
        "/auth/login", json={"login": "12345678901", "senha": "NovaSenha@9"}
    ).status_code == 200


def test_trocar_senha_atual_errada_recusada(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    r = client.post(
        "/auth/trocar-senha",
        json={
            "senha_atual": "ErradaXXX",
            "senha": "NovaSenha@9",
            "confirmar_senha": "NovaSenha@9",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_trocar_senha_exige_login(client):
    r = client.post(
        "/auth/trocar-senha",
        json={"senha_atual": "x", "senha": "NovaSenha@9", "confirmar_senha": "NovaSenha@9"},
    )
    assert r.status_code == 401


def test_trocar_senha_igual_a_atual_recusada(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    r = client.post(
        "/auth/trocar-senha",
        json={
            "senha_atual": "Segredo@123",
            "senha": "Segredo@123",
            "confirmar_senha": "Segredo@123",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


def test_trocar_senha_nova_fraca_recusada(client):
    token = client.post("/auth/cadastro", json=_cadastro_valido()).json()["token"]
    r = client.post(
        "/auth/trocar-senha",
        json={"senha_atual": "Segredo@123", "senha": "fraca", "confirmar_senha": "fraca"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
