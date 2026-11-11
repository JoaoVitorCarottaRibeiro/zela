"""Camada de acesso a dados (repositório): operações sobre o banco.

Mantém as rotas finas — os routers só chamam estas funções. Inclui a regra de
negócio que, ao registrar uma triagem, calcula o nível (regras + IA) e já abre o
encaminhamento adequado (verde->casa, amarelo->UBS, vermelho->SAMU).
"""
from __future__ import annotations

import re

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.core.security import hash_senha
from app.models.cidadao import Cidadao
from app.models.encaminhamento import Encaminhamento
from app.models.enums import Destino, Nivel, StatusEncaminhamento
from app.models.exame_analise import ExameAnalise
from app.models.ficha_medica import FichaMedica
from app.models.triagem import Triagem
from app.models.usuario import Usuario
from app.schemas import (
    CadastroCreate,
    CidadaoCreate,
    CidadaoUpdate,
    EncaminhamentoUpdate,
    EntradaTriagem,
    PerfilUpdate,
    ResultadoExame,
    ResultadoTriagem,
    TriagemCreate,
)
from app.services import triagem_service

# Regra de negócio (domínio): nível -> destino, e a validação dos sintomas.
from app.dominio.encaminhamento import DESTINO_POR_NIVEL
from app.dominio.triagem import validar_sintomas


# ----------------------------- Cidadão -----------------------------
def criar_cidadao(db: Session, dados: CidadaoCreate) -> Cidadao:
    cidadao = Cidadao(**dados.model_dump())
    db.add(cidadao)
    db.commit()
    db.refresh(cidadao)
    return cidadao


def listar_cidadaos(db: Session, limite: int = 100, offset: int = 0) -> list[Cidadao]:
    stmt = select(Cidadao).order_by(Cidadao.id).limit(limite).offset(offset)
    return list(db.scalars(stmt))


def obter_cidadao(db: Session, cidadao_id: int) -> Cidadao | None:
    return db.get(Cidadao, cidadao_id)


def atualizar_cidadao(db: Session, cidadao: Cidadao, dados: CidadaoUpdate) -> Cidadao:
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cidadao, campo, valor)
    db.commit()
    db.refresh(cidadao)
    return cidadao


def remover_cidadao(db: Session, cidadao: Cidadao) -> None:
    db.delete(cidadao)
    db.commit()


# ----------------------------- Usuário -----------------------------
def criar_usuario(db: Session, dados: CadastroCreate) -> Usuario:
    usuario = Usuario(
        nome_completo=dados.nome_completo.strip(),
        data_nascimento=dados.data_nascimento,
        cpf=dados.cpf,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        genero=dados.genero,
        identidade_genero=dados.identidade_genero,
        cep=dados.cep,
        logradouro=dados.logradouro,
        bairro=dados.bairro,
        cidade=dados.cidade,
        uf=dados.uf,
        complemento=dados.complemento,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def obter_usuario(db: Session, usuario_id: int) -> Usuario | None:
    return db.get(Usuario, usuario_id)


def obter_usuario_por_cpf(db: Session, cpf: str) -> Usuario | None:
    return db.scalars(select(Usuario).where(Usuario.cpf == cpf)).first()


def obter_usuario_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalars(select(Usuario).where(Usuario.email == email.lower())).first()


def obter_usuario_por_login(db: Session, login: str) -> Usuario | None:
    """Aceita CPF (11 dígitos) ou e-mail."""
    login = (login or "").strip()
    digitos = re.sub(r"\D", "", login)
    if "@" in login:
        return obter_usuario_por_email(db, login)
    if len(digitos) == 11:
        return obter_usuario_por_cpf(db, digitos)
    return obter_usuario_por_email(db, login)


def atualizar_senha(db: Session, usuario: Usuario, nova_senha: str) -> Usuario:
    usuario.senha_hash = hash_senha(nova_senha)
    db.commit()
    db.refresh(usuario)
    return usuario


def atualizar_perfil(db: Session, usuario: Usuario, dados: PerfilUpdate) -> Usuario:
    """Aplica só os campos enviados (edição parcial). CPF e senha não entram."""
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario


def obter_ficha(db: Session, usuario_id: int) -> FichaMedica | None:
    return db.scalars(
        select(FichaMedica).where(FichaMedica.usuario_id == usuario_id)
    ).first()


def salvar_ficha(db: Session, usuario: Usuario, dados: dict) -> FichaMedica:
    """Cria ou atualiza (upsert) a ficha médica do usuário."""
    ficha = obter_ficha(db, usuario.id)
    if ficha is None:
        ficha = FichaMedica(usuario_id=usuario.id, dados=dados)
        db.add(ficha)
    else:
        ficha.dados = dados
    db.commit()
    db.refresh(ficha)
    return ficha


def vincular_triagens_por_cpf(db: Session, usuario: Usuario) -> int:
    """Liga à conta as triagens de urgência feitas com o CPF dela (feitas sem
    login). Chamado só quando o usuário se autentica — é aí que ele prova ser o
    dono do CPF. Devolve quantas triagens foram vinculadas."""
    resultado = db.execute(
        update(Triagem)
        .where(Triagem.cpf_informado == usuario.cpf, Triagem.usuario_id.is_(None))
        .values(usuario_id=usuario.id)
    )
    db.commit()
    return resultado.rowcount or 0


# ----------------------------- Triagem -----------------------------
def listar_triagens_do_cidadao(db: Session, cidadao_id: int) -> list[Triagem]:
    stmt = (
        select(Triagem)
        .where(Triagem.cidadao_id == cidadao_id)
        .order_by(Triagem.criado_em.desc())
        .options(selectinload(Triagem.encaminhamentos))
    )
    return list(db.scalars(stmt))


def criar_triagem(
    db: Session,
    dados: TriagemCreate,
    usuario_id: int | None = None,
    cpf_informado: str | None = None,
    resultado: ResultadoTriagem | None = None,
) -> Triagem:
    """Registra uma triagem: roda a lógica (regras + IA) e abre o encaminhamento.

    - `usuario_id` (usuário logado): a triagem já fica vinculada a ele.
    - `cpf_informado` (triagem de urgência, sem login): guarda o CPF para
      vincular depois, quando o dono do CPF fizer login. Só é gravado quando
      não há usuário logado.
    - `resultado` (opcional): classificação já decidida (ex.: pela triagem
      conversacional). Se vier, não roda a IA de novo — só persiste e encaminha.
    """
    # Regra do domínio: exige uma descrição mínima (RegraViolada -> 422).
    validar_sintomas(dados.sintomas)
    if resultado is None:
        resultado = triagem_service.triar(
            EntradaTriagem(sintomas=dados.sintomas, idade=dados.idade)
        )

    triagem = Triagem(
        cidadao_id=dados.cidadao_id,
        usuario_id=usuario_id,
        cpf_informado=cpf_informado if usuario_id is None else None,
        canal=dados.canal,
        sintomas=dados.sintomas,
        idade_informada=dados.idade,
        nivel=resultado.nivel,
        orientacao=resultado.orientacao,
        justificativa=resultado.justificativa,
        origem=resultado.origem,
    )
    triagem.encaminhamentos.append(
        Encaminhamento(
            destino=DESTINO_POR_NIVEL[resultado.nivel],
            status=StatusEncaminhamento.aberto,
        )
    )
    db.add(triagem)
    db.commit()
    db.refresh(triagem)
    return triagem


def listar_triagens_do_usuario(db: Session, usuario_id: int) -> list[Triagem]:
    stmt = (
        select(Triagem)
        .where(Triagem.usuario_id == usuario_id)
        .order_by(Triagem.criado_em.desc())
        .options(selectinload(Triagem.encaminhamentos))
    )
    return list(db.scalars(stmt))


def listar_triagens(db: Session, limite: int = 100, offset: int = 0) -> list[Triagem]:
    stmt = (
        select(Triagem)
        .order_by(Triagem.criado_em.desc())
        .limit(limite)
        .offset(offset)
        .options(selectinload(Triagem.encaminhamentos))
    )
    return list(db.scalars(stmt))


def obter_triagem(db: Session, triagem_id: int) -> Triagem | None:
    stmt = (
        select(Triagem)
        .where(Triagem.id == triagem_id)
        .options(selectinload(Triagem.encaminhamentos))
    )
    return db.scalars(stmt).first()


# ----------------------- Exame (Entenda seu exame) -----------------------
def criar_exame(db: Session, usuario_id: int, resultado: ResultadoExame) -> ExameAnalise:
    """Salva uma análise de exame no histórico do usuário."""
    exame = ExameAnalise(
        usuario_id=usuario_id,
        resumo=resultado.resumo,
        itens=[i.model_dump() for i in resultado.itens],
        precisa_cuidado=resultado.precisa_cuidado,
        nivel=resultado.nivel.value if resultado.nivel else None,
    )
    db.add(exame)
    db.commit()
    db.refresh(exame)
    return exame


def listar_exames_do_usuario(db: Session, usuario_id: int) -> list[ExameAnalise]:
    stmt = (
        select(ExameAnalise)
        .where(ExameAnalise.usuario_id == usuario_id)
        .order_by(ExameAnalise.criado_em.desc())
    )
    return list(db.scalars(stmt))


def obter_exame(db: Session, exame_id: int) -> ExameAnalise | None:
    return db.get(ExameAnalise, exame_id)


def remover_exame(db: Session, exame: ExameAnalise) -> None:
    db.delete(exame)
    db.commit()


# -------------------------- Encaminhamento --------------------------
def listar_encaminhamentos(
    db: Session,
    status: StatusEncaminhamento | None = None,
    limite: int = 100,
    offset: int = 0,
) -> list[Encaminhamento]:
    stmt = select(Encaminhamento).order_by(Encaminhamento.criado_em.desc())
    if status is not None:
        stmt = stmt.where(Encaminhamento.status == status)
    stmt = stmt.limit(limite).offset(offset)
    return list(db.scalars(stmt))


def obter_encaminhamento(db: Session, encaminhamento_id: int) -> Encaminhamento | None:
    return db.get(Encaminhamento, encaminhamento_id)


def atualizar_encaminhamento(
    db: Session, encaminhamento: Encaminhamento, dados: EncaminhamentoUpdate
) -> Encaminhamento:
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(encaminhamento, campo, valor)
    db.commit()
    db.refresh(encaminhamento)
    return encaminhamento
