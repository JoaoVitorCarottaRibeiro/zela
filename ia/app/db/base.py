"""Base declarativa do SQLAlchemy (todas as tabelas herdam dela).

A convenção de nomes deixa os nomes de constraints/índices previsíveis — o que
mantém as migrações do Alembic estáveis entre máquinas.
"""
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

convencao_de_nomes = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convencao_de_nomes)
