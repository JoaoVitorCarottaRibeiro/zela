"""Camada de DOMÍNIO da Zela.

Aqui vivem as entidades (valores), as regras de negócio e os erros do domínio —
SEM nenhuma dependência de HTTP (FastAPI) ou de banco (SQLAlchemy). É o coração
do serviço: a API é a porta, o banco é o armazém; o domínio é o que eles
protegem. Assim dá para trocar a porta ou o armazém sem mexer na regra.
"""
