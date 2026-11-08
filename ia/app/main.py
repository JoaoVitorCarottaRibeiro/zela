"""Zela — serviço de IA (voz, visão e triagem).

Ponto de entrada da API FastAPI. Os endpoints de verdade ficam nos routers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    cidadaos,
    encaminhamentos,
    ficha,
    triagem,
    triagens,
    visao,
    voz,
)

app = FastAPI(
    title="Zela IA",
    description=(
        "Voz, visão e triagem de saúde para comunidades. "
        "Backend da CitizenTech Zela: IA + API REST + banco (Supabase/PostgreSQL)."
    ),
    version="0.2.0",
)

# Libera o app mobile e o painel web a chamarem a API (ajustar em produção).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["infra"])
def health():
    """Checagem simples de que o serviço está no ar."""
    return {"status": "ok", "servico": "zela-ia"}


# IA (sem estado)
app.include_router(triagem.router)
app.include_router(voz.router)
app.include_router(visao.router)

# Autenticação (cadastro/login)
app.include_router(auth.router)
app.include_router(ficha.router)

# Recursos persistidos (SOA)
app.include_router(cidadaos.router)
app.include_router(triagens.router)
app.include_router(encaminhamentos.router)
