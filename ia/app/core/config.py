"""Configuração lida do arquivo .env (ver .env.example)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"
    whisper_model: str = "small"

    groq_api_key: str = ""
    openrouter_api_key: str = ""

    # Voz offline (Piper) — opcional
    piper_bin: str = ""
    piper_voice: str = ""

    # Banco de dados (Supabase / PostgreSQL). Em branco => usa SQLite local.
    database_url: str = ""
    # Opcional: senha do banco separada (injetada com segurança na URL).
    # Útil quando a senha tem caracteres especiais — evita URL-encode manual.
    db_password: str = ""

    # Supabase (opcional; só se usarmos o cliente/REST do Supabase)
    supabase_url: str = ""
    supabase_secret_key: str = ""

    # Autenticação: chave para assinar os tokens e validade (em horas).
    # Troque SECRET_KEY no .env em produção.
    secret_key: str = "zela-dev-secret-troque-em-producao"
    token_exp_horas: int = 72
    # Recuperação de senha: validade do link enviado por e-mail (em minutos).
    reset_exp_min: int = 30

    # Envio de e-mail (recuperação de senha). Em branco => modo simulado:
    # o e-mail é gravado em ia/emails_dev.log em vez de enviado de verdade.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Zela <nao-responda@zela.local>"
    smtp_tls: bool = True

    # URL do site (para montar o link de redefinição no e-mail).
    frontend_url: str = "http://localhost:3000"


settings = Settings()
