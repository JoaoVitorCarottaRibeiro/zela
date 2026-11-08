"""Envio de e-mail (recuperação de senha).

Sem SMTP configurado (SMTP_HOST vazio), roda em **modo simulado**: em vez de
enviar, grava o e-mail em `emails_dev.log`. Isso mantém o fluxo completo e real
para o desenvolvimento/demonstração, sem depender de um servidor de e-mail.
Em produção, basta preencher SMTP_* no .env que ele passa a enviar de verdade.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("zela.email")

# Arquivo onde os e-mails simulados são registrados (fora do controle de versão).
_LOG_SIMULADO = Path(__file__).resolve().parents[2] / "emails_dev.log"


def enviar_email(destino: str, assunto: str, corpo: str) -> bool:
    """Envia um e-mail de texto. Devolve True se enviou de verdade, False se
    apenas simulou (modo dev, sem SMTP)."""
    if not settings.smtp_host:
        _simular(destino, assunto, corpo)
        return False

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = destino
    msg["Subject"] = assunto
    msg.set_content(corpo)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        return True
    except Exception:  # noqa: BLE001 — não quebrar o fluxo por falha de e-mail
        logger.exception("Falha ao enviar e-mail; registrando em modo simulado.")
        _simular(destino, assunto, corpo)
        return False


def _simular(destino: str, assunto: str, corpo: str) -> None:
    bloco = (
        "\n" + "=" * 70 + "\n"
        f"[E-MAIL SIMULADO] para: {destino}\n"
        f"Assunto: {assunto}\n"
        + "-" * 70 + "\n"
        f"{corpo}\n"
        + "=" * 70 + "\n"
    )
    logger.info(bloco)
    try:
        with _LOG_SIMULADO.open("a", encoding="utf-8") as f:
            f.write(bloco)
    except Exception:  # noqa: BLE001
        pass
