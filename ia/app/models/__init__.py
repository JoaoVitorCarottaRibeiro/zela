"""Modelos do domínio. Importar este pacote registra todas as tabelas em Base.metadata
(é disso que o Alembic precisa para gerar as migrações)."""
from app.db.base import Base
from app.models.cidadao import Cidadao
from app.models.encaminhamento import Encaminhamento
from app.models.ficha_medica import FichaMedica
from app.models.triagem import Triagem
from app.models.usuario import Usuario

__all__ = ["Base", "Cidadao", "Triagem", "Encaminhamento", "Usuario", "FichaMedica"]
