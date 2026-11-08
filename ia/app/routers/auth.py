"""Autenticação: cadastro, login, dados do usuário e recuperação de senha.

- Cadastro: exige nome, data de nascimento, CPF (11 dígitos), senha e
  confirmação; e-mail é opcional.
- Login: por CPF ou e-mail + senha.
- Recuperação: por e-mail (token de uso temporário). Nunca revela se a conta
  existe — resposta sempre genérica.

Ao autenticar (cadastro ou login), vinculamos à conta as triagens de urgência
feitas com o CPF dela — é o momento seguro, porque a pessoa provou ser o dono.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.core.email import enviar_email
from app.core.config import settings
from app.core.security import (
    conferir_senha,
    criar_token,
    criar_token_reset,
    ler_token_reset,
)
from app.db.session import get_db
from app.deps import usuario_atual
from app.models.usuario import Usuario
from app.schemas import (
    CadastroCreate,
    LoginIn,
    MensagemOut,
    PerfilUpdate,
    RecuperarIn,
    RedefinirIn,
    TokenOut,
    TrocarSenhaIn,
    UsuarioOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Resposta sempre igual, tenha ou não conta — não vaza quem está cadastrado.
_MSG_RECUPERAR = (
    "Se houver uma conta com e-mail cadastrado, enviamos um link para redefinir "
    "a senha. Verifique sua caixa de entrada."
)


@router.post("/cadastro", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroCreate, db: Session = Depends(get_db)) -> TokenOut:
    if crud.obter_usuario_por_cpf(db, dados.cpf) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma conta com este CPF.")
    if dados.email and crud.obter_usuario_por_email(db, dados.email) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma conta com este e-mail.")
    usuario = crud.criar_usuario(db, dados)
    crud.vincular_triagens_por_cpf(db, usuario)
    return TokenOut(token=criar_token(usuario.id), usuario=usuario)


@router.post("/login", response_model=TokenOut)
def login(dados: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    usuario = crud.obter_usuario_por_login(db, dados.login)
    if usuario is None or not conferir_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "CPF/e-mail ou senha incorretos."
        )
    crud.vincular_triagens_por_cpf(db, usuario)
    return TokenOut(token=criar_token(usuario.id), usuario=usuario)


@router.get("/me", response_model=UsuarioOut)
def eu(usuario: Usuario = Depends(usuario_atual)) -> UsuarioOut:
    return usuario


@router.patch("/me", response_model=UsuarioOut)
def atualizar_eu(
    dados: PerfilUpdate,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
) -> UsuarioOut:
    """Edita o próprio perfil (nome, nascimento, e-mail e endereço). CPF e senha
    não mudam por aqui."""
    campos = dados.model_dump(exclude_unset=True)
    novo_email = campos.get("email")
    if novo_email and novo_email != usuario.email:
        existente = crud.obter_usuario_por_email(db, novo_email)
        if existente is not None and existente.id != usuario.id:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Já existe uma conta com este e-mail."
            )
    return crud.atualizar_perfil(db, usuario, dados)


@router.post("/trocar-senha", response_model=MensagemOut)
def trocar_senha(
    dados: TrocarSenhaIn,
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
) -> MensagemOut:
    """Troca a senha de quem está logado. A senha atual é a prova de identidade —
    não depende de e-mail nem de SMS."""
    if not conferir_senha(dados.senha_atual, usuario.senha_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "A senha atual está incorreta."
        )
    crud.atualizar_senha(db, usuario, dados.senha)
    return MensagemOut(mensagem="Senha alterada com sucesso.")


@router.post("/recuperar", response_model=MensagemOut)
def recuperar(dados: RecuperarIn, db: Session = Depends(get_db)) -> MensagemOut:
    """Dispara o e-mail de redefinição (se a conta tiver e-mail). A resposta é
    sempre a mesma, para não revelar se existe conta com aquele CPF/e-mail."""
    usuario = crud.obter_usuario_por_login(db, dados.login)
    if usuario is not None and usuario.email:
        token = criar_token_reset(usuario.id)
        link = f"{settings.frontend_url.rstrip('/')}/redefinir-senha?token={token}"
        corpo = (
            f"Olá, {usuario.nome_completo.split(' ')[0]}.\n\n"
            "Recebemos um pedido para redefinir a sua senha na Zela.\n"
            f"Para criar uma nova senha, acesse o link abaixo (vale por "
            f"{settings.reset_exp_min} minutos):\n\n"
            f"{link}\n\n"
            "Se não foi você, pode ignorar este e-mail — sua senha continua a mesma."
        )
        enviar_email(usuario.email, "Redefinir sua senha — Zela", corpo)
    return MensagemOut(mensagem=_MSG_RECUPERAR)


@router.post("/redefinir", response_model=TokenOut)
def redefinir(dados: RedefinirIn, db: Session = Depends(get_db)) -> TokenOut:
    """Confirma a redefinição com o token recebido por e-mail e já devolve um
    token de acesso (a pessoa entra direto)."""
    usuario_id = ler_token_reset(dados.token)
    if usuario_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Link inválido ou expirado. Peça a recuperação novamente.",
        )
    usuario = crud.obter_usuario(db, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Conta não encontrada.")
    crud.atualizar_senha(db, usuario, dados.senha)
    return TokenOut(token=criar_token(usuario.id), usuario=usuario)
