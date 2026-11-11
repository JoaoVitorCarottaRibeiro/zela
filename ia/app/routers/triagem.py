"""Triagem: recebe sintomas e devolve nível de risco + orientação.

Importante (ética): a IA ORIENTA e PRIORIZA, não diagnostica nem prescreve.
A lógica fica em app/services/triagem_service.py.

- POST /triagem           -> triagem rápida, de uma vez (sem estado, offline-first).
- POST /triagem/conversa  -> triagem CONVERSACIONAL: a IA pergunta antes de concluir
                             (senso crítico). Ao concluir, já registra e encaminha.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud
from app.db.session import get_db
from app.deps import usuario_opcional
from app.models.usuario import Usuario
from app.schemas import (
    EntradaConversa,
    EntradaTriagem,
    RespostaConversa,
    ResultadoTriagem,
    TriagemCreate,
)
from app.services import triagem_service

router = APIRouter(prefix="/triagem", tags=["triagem"])


@router.post("", response_model=ResultadoTriagem)
def triar(entrada: EntradaTriagem) -> ResultadoTriagem:
    return triagem_service.triar(entrada)


@router.post("/conversa", response_model=RespostaConversa)
def conversa(
    entrada: EntradaConversa,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(usuario_opcional),
) -> RespostaConversa:
    """Uma rodada da conversa. Enquanto a IA precisar de mais contexto, devolve
    uma pergunta (com sugestões de resposta rápida). Quando conclui, registra a
    triagem (vinculada ao usuário logado ou ao CPF de urgência) e devolve o
    resultado com o encaminhamento."""
    # Vínculo: a IA cumprimenta pelo primeiro nome do usuário logado (se houver).
    nome = None
    if usuario and usuario.nome_completo:
        partes = usuario.nome_completo.strip().split()
        nome = partes[0] if partes else None

    passo = triagem_service.conversar(
        entrada.historico,
        idade=entrada.idade,
        contexto_foto=entrada.contexto_foto,
        nome=nome,
    )

    if passo.estado == "pergunta":
        return RespostaConversa(
            estado="pergunta", pergunta=passo.pergunta, sugestoes=passo.sugestoes
        )

    # Concluiu: persiste usando o resultado já decidido (não roda a IA de novo).
    triagem = crud.criar_triagem(
        db,
        TriagemCreate(
            sintomas=passo.resumo,
            idade=entrada.idade,
            canal=entrada.canal,
            cidadao_id=entrada.cidadao_id,
        ),
        usuario_id=usuario.id if usuario else None,
        cpf_informado=entrada.cpf_informado if usuario is None else None,
        resultado=passo.resultado,
    )
    return RespostaConversa(estado="concluido", triagem=triagem)
