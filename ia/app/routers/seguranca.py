"""API do módulo de Cybersecurity + painel de Risco Cidadão.

Endpoints (prefixo /seguranca):
- POST /scan            : procura PII num texto e devolve os alertas de Risco Cidadão.
- POST /demo-vazamento  : roda o taint de ponta a ponta (evidência: vazamento bloqueado).
- GET  /indicador       : o indicador numérico do painel (Risco Cidadão).
- GET  /auditoria       : as últimas linhas da auditoria (sem nenhum dado sensível).
- GET  /painel          : o DASHBOARD em HTML (print pedido pela GS).

Nada aqui expõe PII cru: textos voltam sempre mascarados.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.seguranca import servico
from app.seguranca.auditoria import auditoria
from app.seguranca.taint import Fonte, Sumidouro

router = APIRouter(prefix="/seguranca", tags=["seguranca"])


# --------------------------------------------------------------------------
# Schemas (próprios do módulo — mantém o pacote autocontido para o ZIP)
# --------------------------------------------------------------------------
class EntradaScan(BaseModel):
    texto: str = Field(
        ...,
        description="Texto a verificar (use dados FICTÍCIOS).",
        json_schema_extra={"example": "Meu CPF é 000.000.000-00 e tenho diabetes."},
    )
    origem: str = Field("entrada", description="De onde veio o texto (rótulo).")


class AchadoOut(BaseModel):
    tipo: str
    rotulo: str
    severidade: str
    trecho_mascarado: str


class AlertaOut(BaseModel):
    titulo: str
    mensagem: str
    recomendacao: str
    severidade: str
    severidade_rotulo: str
    achado_tecnico: str


class RespostaScan(BaseModel):
    texto_protegido: str
    achados: list[AchadoOut]
    alertas: list[AlertaOut]


class EntradaDemo(BaseModel):
    texto: str = Field(
        "Paciente Maria, CPF 000.000.000-00, senha=segredo123, diagnóstico: diabetes.",
        description="Texto sensível fictício para demonstrar o bloqueio de vazamento.",
    )
    sumidouro: str = Field("log", description="Saída alvo: log, resposta_api, tela...")


@router.post("/scan", response_model=RespostaScan)
def scan(entrada: EntradaScan) -> RespostaScan:
    """Pilar 1+3: encontra PII e traduz para alertas de Risco Cidadão."""
    r = servico.escanear_e_traduzir(entrada.texto, origem=entrada.origem)
    return RespostaScan(
        texto_protegido=r.texto_original_protegido,
        achados=[
            AchadoOut(
                tipo=a.tipo.value,
                rotulo=a.rotulo,
                severidade=a.severidade.value,
                trecho_mascarado=a.trecho_mascarado,
            )
            for a in r.achados
        ],
        alertas=[AlertaOut(**al.como_dict()) for al in r.alertas],
    )


@router.post("/demo-vazamento")
def demo_vazamento(entrada: EntradaDemo) -> dict:
    """Pilar 2: mostra o taint em ação — tenta vazar, bloqueia, sanitiza, libera."""
    try:
        sumidouro = Sumidouro(entrada.sumidouro)
    except ValueError:
        sumidouro = Sumidouro.log
    r = servico.demonstrar_vazamento(entrada.texto, Fonte.usuario, sumidouro)
    return {
        "bloqueado": r.bloqueado,
        "passos": [
            {"titulo": p.titulo, "detalhe": p.detalhe, "seguro": p.seguro}
            for p in r.passos
        ],
        "saida_insegura_evitada": r.saida_insegura,
        "saida_segura": r.saida_segura,
        "alertas": [al.como_dict() for al in r.alertas],
    }


@router.get("/indicador")
def indicador() -> dict:
    """O indicador de Risco Cidadão (números do painel)."""
    return auditoria.indicador()


@router.get("/auditoria")
def listar_auditoria(n: int = 50) -> dict:
    """Últimas linhas da auditoria — sem nenhum dado sensível."""
    return {"eventos": auditoria.eventos(n)}


@router.get("/painel", response_class=HTMLResponse, include_in_schema=False)
def painel() -> str:
    """Dashboard de Risco Cidadão (HTML autocontido). Abra em /seguranca/painel."""
    return _PAINEL_HTML


# --------------------------------------------------------------------------
# Painel (HTML + JS autocontidos; marca Zela #4BB9FA). Consome os endpoints acima.
# --------------------------------------------------------------------------
_PAINEL_HTML = """<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zela — Painel de Risco Cidadão</title>
<style>
  :root { --azul:#4BB9FA; --tinta:#0f2b3d; --fundo:#f2f8fd; --card:#fff;
          --borda:#d8e8f4; --ok:#1a9e5c; --alerta:#e08a00; --critico:#d23b3b; }
  * { box-sizing:border-box; } body { margin:0; font-family:system-ui,Segoe UI,Arial,sans-serif;
      background:var(--fundo); color:var(--tinta); }
  header { background:var(--azul); color:#fff; padding:20px 24px; }
  header h1 { margin:0; font-size:22px; } header p { margin:6px 0 0; opacity:.95; font-size:14px; }
  main { max-width:960px; margin:0 auto; padding:24px 16px 48px; }
  .cartoes { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
  .cartao { background:var(--card); border:1px solid var(--borda); border-radius:14px;
            padding:18px; }
  .cartao .n { font-size:34px; font-weight:800; } .cartao .r { font-size:13px; opacity:.75; }
  .selo { display:inline-block; padding:8px 14px; border-radius:999px; font-weight:700;
          color:#fff; margin-top:4px; }
  .selo.tranquilo,.selo.protegido { background:var(--ok); }
  .selo.atencao { background:var(--alerta); } .selo.critico { background:var(--critico); }
  h2 { margin:28px 0 12px; font-size:18px; }
  .linha { background:var(--card); border:1px solid var(--borda); border-radius:10px;
           padding:12px 14px; margin-bottom:8px; font-size:14px; }
  .linha .q { font-size:12px; opacity:.6; } .pill { font-size:11px; padding:2px 8px;
           border-radius:999px; background:#eef5fb; margin-right:6px; }
  .pill.critica { background:#fbe3e3; color:#a12; } .pill.alta { background:#fde8d2; color:#854; }
  .acoes { display:flex; gap:10px; flex-wrap:wrap; margin:10px 0 4px; }
  button { background:var(--azul); color:#fff; border:0; border-radius:10px; padding:11px 16px;
           font-size:15px; font-weight:600; cursor:pointer; } button.sec { background:#eef5fb;
           color:var(--tinta); }
  .alerta-card { border-left:5px solid var(--alerta); } .vazou { color:var(--critico); font-weight:700; }
  .ok { color:var(--ok); font-weight:700; }
  footer { text-align:center; font-size:12px; opacity:.6; padding:16px; }
</style>
</head>
<body>
<header>
  <h1>🛡️ Painel de Risco Cidadão — Zela</h1>
  <p>Cybersecurity · GS 2026.2 · proteção de dados de saúde (PII) do cidadão</p>
</header>
<main>
  <div class="acoes">
    <button onclick="rodarDemo()">▶ Simular vazamento (demonstração)</button>
    <button class="sec" onclick="carregar()">↻ Atualizar</button>
  </div>

  <div id="selo-wrap">Risco atual: <span id="selo" class="selo">—</span></div>

  <div class="cartoes" style="margin-top:14px">
    <div class="cartao"><div class="n" id="m-protecao">—</div><div class="r">% protegido</div></div>
    <div class="cartao"><div class="n" id="m-pii">—</div><div class="r">PII detectados</div></div>
    <div class="cartao"><div class="n vazou" id="m-bloq">—</div><div class="r">vazamentos bloqueados</div></div>
    <div class="cartao"><div class="n ok" id="m-prot">—</div><div class="r">saídas protegidas</div></div>
  </div>

  <div id="demo"></div>

  <h2>Auditoria (últimos eventos)</h2>
  <div id="auditoria"></div>
</main>
<footer>Protótipo de demonstração · dados fictícios · o painel nunca mostra o dado sensível em si.</footer>

<script>
const API = location.origin;
async function carregar() {
  const ind = await (await fetch(API + '/seguranca/indicador')).json();
  document.getElementById('m-protecao').textContent = ind.protecao_percentual + '%';
  document.getElementById('m-pii').textContent = ind.pii_detectados;
  document.getElementById('m-bloq').textContent = ind.vazamentos_bloqueados;
  document.getElementById('m-prot').textContent = ind.saidas_protegidas;
  const selo = document.getElementById('selo');
  selo.textContent = ind.nivel_risco;
  selo.className = 'selo ' + ind.nivel_risco;
  const aud = await (await fetch(API + '/seguranca/auditoria?n=20')).json();
  document.getElementById('auditoria').innerHTML = aud.eventos.map(e =>
    `<div class="linha"><span class="pill ${e.severidade}">${e.severidade}</span>${e.descricao}
     <div class="q">${e.quando} · ${e.tipo_evento}</div></div>`).join('')
    || '<div class="linha">Sem eventos ainda. Clique em “Simular vazamento”.</div>';
}
async function rodarDemo() {
  const r = await (await fetch(API + '/seguranca/demo-vazamento', {method:'POST',
    headers:{'Content-Type':'application/json'}, body:'{}'})).json();
  const passos = r.passos.map(p =>
    `<div class="linha">${p.seguro ? '✅' : '🚫'} <b>${p.titulo}</b><br>${p.detalhe}</div>`).join('');
  const alertas = r.alertas.map(a =>
    `<div class="linha alerta-card"><b>⚠️ ${a.titulo}</b> <span class="pill ${a.severidade}">risco ${a.severidade_rotulo}</span>
     <br>${a.mensagem}<br><i>${a.recomendacao}</i></div>`).join('');
  document.getElementById('demo').innerHTML =
    '<h2>Demonstração de Taint Analysis</h2>' + passos +
    '<h2>Tradução para Risco Cidadão (via IA)</h2>' + alertas;
  carregar();
}
carregar();
</script>
</body>
</html>"""
