"""Segurança sem dependências externas: hash de senha (PBKDF2-SHA256) e token
assinado (HMAC-SHA256). Suficiente e seguro para o escopo do projeto.

- Senha: nunca guardamos a senha em texto. Guardamos
  `pbkdf2_sha256$<iteracoes>$<salt>$<hash>`.
- Token: `<corpo_base64>.<assinatura_base64>`, onde o corpo é um JSON
  {uid, exp}. A assinatura garante que o token não foi adulterado.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

from app.core.config import settings

_ALGO = "pbkdf2_sha256"
_ITERACOES = 200_000


# ------------------------------------------------------------------ senha
def hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, _ITERACOES)
    return f"{_ALGO}${_ITERACOES}${salt.hex()}${dk.hex()}"


def conferir_senha(senha: str, armazenado: str) -> bool:
    try:
        algo, iteracoes, salt_hex, hash_hex = armazenado.split("$")
        if algo != _ALGO:
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", senha.encode(), bytes.fromhex(salt_hex), int(iteracoes)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


# ------------------------------------------------------------------ token
def _b64u(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode()


def _b64u_dec(txt: str) -> bytes:
    return base64.urlsafe_b64decode(txt + "=" * (-len(txt) % 4))


def criar_token(usuario_id: int, *, typ: str = "auth", exp_seg: int | None = None) -> str:
    """Cria um token assinado. `typ` separa os usos (auth x reset de senha), para
    que um token de redefinição NÃO sirva para autenticar e vice-versa."""
    dur = exp_seg if exp_seg is not None else settings.token_exp_horas * 3600
    exp = int(time.time()) + dur
    corpo = _b64u(json.dumps({"uid": usuario_id, "exp": exp, "typ": typ}).encode())
    assinatura = _b64u(
        hmac.new(settings.secret_key.encode(), corpo.encode(), hashlib.sha256).digest()
    )
    return f"{corpo}.{assinatura}"


def ler_token(token: str, *, typ_esperado: str = "auth") -> int | None:
    """Devolve o id do usuário se o token for válido, do tipo esperado e não
    estiver expirado. Tokens antigos sem `typ` contam como 'auth'."""
    try:
        corpo, assinatura = token.split(".")
        esperado = _b64u(
            hmac.new(settings.secret_key.encode(), corpo.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(assinatura, esperado):
            return None
        dados = json.loads(_b64u_dec(corpo))
        if int(dados.get("exp", 0)) < int(time.time()):
            return None
        if dados.get("typ", "auth") != typ_esperado:
            return None
        return int(dados["uid"])
    except Exception:
        return None


def criar_token_reset(usuario_id: int) -> str:
    """Token de vida curta (expira em RESET_EXP_MIN) para redefinir a senha.
    Tipo 'reset' separado do 'auth': um não serve no lugar do outro."""
    return criar_token(usuario_id, typ="reset", exp_seg=settings.reset_exp_min * 60)


def ler_token_reset(token: str) -> int | None:
    return ler_token(token, typ_esperado="reset")
