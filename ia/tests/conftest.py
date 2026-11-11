"""Configuração dos testes.

Usa um SQLite em memória (rápido, offline, isolado) no lugar do Supabase, e força
a triagem a usar só as regras (sem chamar a IA pela rede) — testes determinísticos.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services import triagem_service


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _sem_rede(monkeypatch):
    """Garante que a triagem não chame a IA (Gemini) durante os testes.

    Por padrão a IA fica indisponível: a triagem cai nas regras (offline) e a
    conversa conclui pelas regras. Testes que querem simular a IA sobrescrevem
    `conversar_com_ia` com o seu próprio retorno.
    """
    monkeypatch.setattr(triagem_service, "triar_com_ia", lambda entrada, tentativas=3: None)
    monkeypatch.setattr(
        triagem_service,
        "conversar_com_ia",
        lambda *a, **k: None,
    )
