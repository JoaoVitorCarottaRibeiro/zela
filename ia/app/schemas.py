"""Modelos de dados (entrada e saída) da API.

Os enums do domínio vivem em app/models/enums.py (fonte única). Aqui ficam só os
contratos de entrada/saída da API (Pydantic).
"""
import re
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import Canal, Destino, Nivel, StatusEncaminhamento

__all__ = [
    "Nivel", "Canal", "Destino", "StatusEncaminhamento",
    "EntradaTriagem", "ResultadoTriagem", "ResultadoVisao", "ResultadoTranscricao",
    "CidadaoCreate", "CidadaoUpdate", "CidadaoOut",
    "TriagemCreate", "TriagemOut",
    "EncaminhamentoCreate", "EncaminhamentoUpdate", "EncaminhamentoOut",
    "CadastroCreate", "LoginIn", "UsuarioOut", "TokenOut",
    "PerfilUpdate", "TrocarSenhaIn",
    "FichaMedicaIn", "FichaMedicaOut",
    "RecuperarIn", "RedefinirIn", "MensagemOut",
]

# Valores controlados para gênero e identidade de gênero.
GENEROS = {"Masculino", "Feminino", "Prefiro não informar"}
IDENTIDADES_GENERO = {
    "Cisgênero", "Transgênero", "Não-binário", "Outra", "Prefiro não informar",
}


def validar_opcao(valor: str | None, opcoes: set[str], campo: str) -> str | None:
    """Opcional. Se preenchido, precisa ser um dos valores aceitos."""
    v = limpar_opcional(valor)
    if v is None:
        return None
    if v not in opcoes:
        raise ValueError(f"Valor inválido para {campo}.")
    return v


# ---------------------------------------------------------------------------
# Validadores reaproveitados
# ---------------------------------------------------------------------------

def validar_cpf(valor: str) -> str:
    """Mantém só dígitos e exige exatamente 11."""
    digitos = re.sub(r"\D", "", valor or "")
    if len(digitos) != 11:
        raise ValueError("O CPF deve ter exatamente 11 dígitos.")
    return digitos


def validar_cep(valor: str | None) -> str | None:
    """Opcional. Mantém só dígitos; se preenchido, exige 8."""
    if valor is None or not str(valor).strip():
        return None
    digitos = re.sub(r"\D", "", valor)
    if len(digitos) != 8:
        raise ValueError("O CEP deve ter 8 dígitos.")
    return digitos


def limpar_opcional(valor: str | None) -> str | None:
    """Normaliza texto opcional: vazio vira None, senão faz strip."""
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


def validar_forca_senha(valor: str) -> str:
    """Mín. 6 caracteres, com maiúscula, número e caractere especial."""
    if len(valor) < 6:
        raise ValueError("A senha deve ter pelo menos 6 caracteres.")
    if not re.search(r"[A-Z]", valor):
        raise ValueError("A senha deve ter ao menos uma letra maiúscula.")
    if not re.search(r"\d", valor):
        raise ValueError("A senha deve ter ao menos um número.")
    if not re.search(r"[^A-Za-z0-9]", valor):
        raise ValueError("A senha deve ter ao menos um caractere especial.")
    return valor


class EntradaTriagem(BaseModel):
    sintomas: str = Field(..., description="O que a pessoa está sentindo, em texto.")
    idade: int | None = Field(None, description="Idade, se informada.")


class ResultadoTriagem(BaseModel):
    nivel: Nivel
    orientacao: str = Field(..., description="Orientação em linguagem simples, para ser falada.")
    justificativa: str | None = None
    origem: str = Field("ia", description="ia | regras | regras(sinal de alerta)")


class ResultadoVisao(BaseModel):
    descricao: str = Field(..., description="O que a IA vê na foto, em linguagem simples.")
    risco: Nivel
    origem: str = Field("ia", description="ia | indisponivel | erro")


class ResultadoTranscricao(BaseModel):
    texto: str = Field(..., description="O que foi falado no áudio.")
    origem: str = Field("ia", description="ia | indisponivel | erro")


# ---------------------------------------------------------------------------
# Recursos persistidos (SOA) — Cidadão, Triagem e Encaminhamento
# ---------------------------------------------------------------------------

class CidadaoCreate(BaseModel):
    nome: str = Field(..., max_length=120, description="Use dados fictícios.")
    idade: int | None = Field(None, ge=0, le=130)
    bairro: str | None = Field(None, max_length=120)
    cidade: str = Field("São Paulo", max_length=120)
    telefone: str | None = Field(None, max_length=20, description="Fictício.")


class CidadaoUpdate(BaseModel):
    nome: str | None = Field(None, max_length=120)
    idade: int | None = Field(None, ge=0, le=130)
    bairro: str | None = Field(None, max_length=120)
    cidade: str | None = Field(None, max_length=120)
    telefone: str | None = Field(None, max_length=20)


class CidadaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    idade: int | None
    bairro: str | None
    cidade: str
    telefone: str | None
    criado_em: datetime


class EncaminhamentoCreate(BaseModel):
    destino: Destino
    observacao: str | None = None


class EncaminhamentoUpdate(BaseModel):
    status: StatusEncaminhamento | None = None
    observacao: str | None = None


class EncaminhamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    triagem_id: int
    destino: Destino
    status: StatusEncaminhamento
    observacao: str | None
    criado_em: datetime


class TriagemCreate(BaseModel):
    sintomas: str = Field(..., description="O que a pessoa está sentindo, em texto.")
    idade: int | None = Field(None, ge=0, le=130)
    canal: Canal = Field(Canal.app, description="Por onde a pessoa chegou.")
    cidadao_id: int | None = Field(None, description="Opcional: vincula a um cidadão.")
    cpf_informado: str | None = Field(
        None,
        description="Triagem de urgência (convidado): CPF informado sem login. "
        "Não autentica; serve para vincular à conta quando o dono logar.",
    )

    @field_validator("cpf_informado")
    @classmethod
    def _valida_cpf_informado(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return None
        return validar_cpf(v)


class TriagemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cidadao_id: int | None
    usuario_id: int | None
    canal: Canal
    sintomas: str
    idade_informada: int | None
    nivel: Nivel
    orientacao: str
    justificativa: str | None
    origem: str
    criado_em: datetime
    encaminhamentos: list[EncaminhamentoOut] = []


# ---------------------------------------------------------------------------
# Autenticação — Cadastro, Login e Usuário
# ---------------------------------------------------------------------------

class CadastroCreate(BaseModel):
    nome_completo: str = Field(..., min_length=3, max_length=160)
    data_nascimento: date
    cpf: str = Field(..., description="Somente números, 11 dígitos.")
    senha: str = Field(..., max_length=128, description="Mín. 6, com maiúscula, número e símbolo.")
    confirmar_senha: str
    email: str | None = Field(None, description="Opcional.")

    # Gênero e identidade de gênero (opcionais).
    genero: str | None = Field(None, description="Masculino | Feminino | Prefiro não informar")
    identidade_genero: str | None = Field(None)

    # Endereço (opcional) — preenchido via CEP (ViaCEP) no cadastro.
    cep: str | None = Field(None, description="Opcional, 8 dígitos.")
    logradouro: str | None = Field(None, max_length=160)
    bairro: str | None = Field(None, max_length=120)
    cidade: str | None = Field(None, max_length=120)
    uf: str | None = Field(None, max_length=2)
    complemento: str | None = Field(None, max_length=120)

    @field_validator("cpf")
    @classmethod
    def _valida_cpf(cls, v: str) -> str:
        return validar_cpf(v)

    @field_validator("cep")
    @classmethod
    def _valida_cep(cls, v: str | None) -> str | None:
        return validar_cep(v)

    @field_validator("logradouro", "bairro", "cidade", "complemento")
    @classmethod
    def _limpa_texto(cls, v: str | None) -> str | None:
        return limpar_opcional(v)

    @field_validator("uf")
    @classmethod
    def _valida_uf(cls, v: str | None) -> str | None:
        v = limpar_opcional(v)
        return v.upper()[:2] if v else None

    @field_validator("senha")
    @classmethod
    def _valida_senha(cls, v: str) -> str:
        return validar_forca_senha(v)

    @field_validator("genero")
    @classmethod
    def _valida_genero(cls, v: str | None) -> str | None:
        return validar_opcao(v, GENEROS, "gênero")

    @field_validator("identidade_genero")
    @classmethod
    def _valida_identidade(cls, v: str | None) -> str | None:
        return validar_opcao(v, IDENTIDADES_GENERO, "identidade de gênero")

    @field_validator("email")
    @classmethod
    def _valida_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("E-mail inválido.")
        return v

    @model_validator(mode="after")
    def _confere_senhas(self) -> "CadastroCreate":
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não conferem.")
        return self


class LoginIn(BaseModel):
    login: str = Field(..., description="CPF (11 dígitos) ou e-mail.")
    senha: str


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome_completo: str
    data_nascimento: date
    cpf: str
    email: str | None
    genero: str | None = None
    identidade_genero: str | None = None
    cep: str | None = None
    logradouro: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    complemento: str | None = None
    criado_em: datetime


class TokenOut(BaseModel):
    token: str
    usuario: UsuarioOut


class PerfilUpdate(BaseModel):
    """Edição do perfil pelo usuário logado. Todos os campos são opcionais —
    só o que vier no corpo é alterado. CPF e senha não entram aqui (CPF é a
    identidade; senha tem fluxo próprio em /auth/trocar-senha)."""
    nome_completo: str | None = Field(None, max_length=160)
    data_nascimento: date | None = None
    email: str | None = Field(None, description="Opcional; pode ser limpo.")
    genero: str | None = Field(None)
    identidade_genero: str | None = Field(None)
    cep: str | None = Field(None, description="Opcional, 8 dígitos.")
    logradouro: str | None = Field(None, max_length=160)
    bairro: str | None = Field(None, max_length=120)
    cidade: str | None = Field(None, max_length=120)
    uf: str | None = Field(None, max_length=2)
    complemento: str | None = Field(None, max_length=120)

    @field_validator("nome_completo")
    @classmethod
    def _valida_nome(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Informe seu nome completo.")
        return v

    @field_validator("cep")
    @classmethod
    def _valida_cep(cls, v: str | None) -> str | None:
        return validar_cep(v)

    @field_validator("logradouro", "bairro", "cidade", "complemento")
    @classmethod
    def _limpa_texto(cls, v: str | None) -> str | None:
        return limpar_opcional(v)

    @field_validator("uf")
    @classmethod
    def _valida_uf(cls, v: str | None) -> str | None:
        v = limpar_opcional(v)
        return v.upper()[:2] if v else None

    @field_validator("email")
    @classmethod
    def _valida_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("E-mail inválido.")
        return v

    @field_validator("genero")
    @classmethod
    def _valida_genero(cls, v: str | None) -> str | None:
        return validar_opcao(v, GENEROS, "gênero")

    @field_validator("identidade_genero")
    @classmethod
    def _valida_identidade(cls, v: str | None) -> str | None:
        return validar_opcao(v, IDENTIDADES_GENERO, "identidade de gênero")


class TrocarSenhaIn(BaseModel):
    """Troca de senha do usuário logado: a senha atual é a prova de identidade."""
    senha_atual: str
    senha: str = Field(..., max_length=128)
    confirmar_senha: str

    @field_validator("senha")
    @classmethod
    def _valida_senha(cls, v: str) -> str:
        return validar_forca_senha(v)

    @model_validator(mode="after")
    def _confere(self) -> "TrocarSenhaIn":
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não conferem.")
        if self.senha == self.senha_atual:
            raise ValueError("A nova senha deve ser diferente da atual.")
        return self


# ---------------------------------------------------------------------------
# Recuperação de senha
# ---------------------------------------------------------------------------

class RecuperarIn(BaseModel):
    """Pedido de recuperação: a pessoa informa CPF ou e-mail."""
    login: str = Field(..., description="CPF (11 dígitos) ou e-mail cadastrado.")


class RedefinirIn(BaseModel):
    """Confirmação com o token recebido por e-mail + a nova senha."""
    token: str
    senha: str = Field(..., max_length=128)
    confirmar_senha: str

    @field_validator("senha")
    @classmethod
    def _valida_senha(cls, v: str) -> str:
        return validar_forca_senha(v)

    @model_validator(mode="after")
    def _confere_senhas(self) -> "RedefinirIn":
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não conferem.")
        return self


class MensagemOut(BaseModel):
    mensagem: str


# ---------------------------------------------------------------------------
# Ficha médica (pré-atendimento da IA) — seções 1 a 7 do documento
# ---------------------------------------------------------------------------

class FichaMedicaIn(BaseModel):
    """Respostas do questionário clínico. Estrutura flexível (JSON): o front
    envia um objeto com as seções preenchidas."""
    dados: dict[str, Any] = Field(default_factory=dict)


class FichaMedicaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    dados: dict[str, Any]
    atualizado_em: datetime
