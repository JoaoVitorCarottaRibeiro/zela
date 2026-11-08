"""Conexão com o banco (Supabase / PostgreSQL) e sessão por requisição.

- Em produção/dev usa o DATABASE_URL do .env (Supabase, via Session pooler).
- Se o DATABASE_URL estiver vazio, cai num SQLite local (útil para testes e para
  rodar sem internet). A aplicação funciona nos dois casos.
"""
from collections.abc import Iterator

from sqlalchemy import create_engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

SQLITE_FALLBACK = "sqlite:///./zela.db"


def url_do_banco() -> str:
    """URL final do banco.

    Se DB_PASSWORD estiver definido no .env, ele é injetado na URL com codificação
    segura (o SQLAlchemy faz o escape), dispensando URL-encode manual da senha.
    """
    bruta = settings.database_url or SQLITE_FALLBACK
    if settings.db_password and not bruta.startswith("sqlite"):
        bruta = make_url(bruta).set(password=settings.db_password).render_as_string(
            hide_password=False
        )
    return bruta


_url = url_do_banco()
_e_sqlite = _url.startswith("sqlite")

engine = create_engine(
    _url,
    connect_args={"check_same_thread": False} if _e_sqlite else {},
    pool_pre_ping=True,  # reconecta se o pooler do Supabase derrubou a conexão
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Iterator[Session]:
    """Dependência do FastAPI: abre uma sessão por requisição e fecha no fim."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
