// Gera o PDF da ficha médica a partir das mesmas definições do formulário,
// usando expo-print (HTML -> PDF) e expo-sharing para compartilhar/salvar.
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SECOES, type Medicamento, type Respostas } from "./fichaDefs";
import type { Usuario } from "./tipos";

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textoResposta(tipo: string, valor: unknown): string {
  if (tipo === "consent") return valor ? "Sim" : "Não";
  if (tipo === "medicamentos") {
    const lista = (valor as Medicamento[]) ?? [];
    if (!lista.length) return "Não informado";
    const txt = lista
      .filter((m) => m.nome?.trim())
      .map((m) => {
        const extra = [m.dosagem, m.frequencia].filter(Boolean).join(", ");
        const base = extra ? `${m.nome} (${extra})` : m.nome;
        return m.motivo ? `${base} — ${m.motivo}` : base;
      })
      .join("; ");
    return txt || "Não informado";
  }
  if (Array.isArray(valor)) return valor.length ? valor.join(", ") : "Não informado";
  const s = (valor as string | undefined)?.toString().trim();
  return s ? s : "Não informado";
}

function cpfFmt(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11
    ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    : cpf;
}

function montarHtml(usuario: Usuario, respostas: Respostas): string {
  const secoesHtml = SECOES.map((secao) => {
    const campos = secao.campos
      .filter((c) => !c.mostrarSe || c.mostrarSe(respostas))
      .map(
        (c) => `
          <div class="campo">
            <div class="rotulo">${escapar(c.rotulo)}</div>
            <div class="resposta">${escapar(textoResposta(c.tipo, respostas[c.id]))}</div>
          </div>`,
      )
      .join("");
    return `<section><h2>${escapar(secao.titulo)}</h2>${campos}</section>`;
  }).join("");

  return `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
         color: #12263A; margin: 0; padding: 32px 36px; }
  .barra { height: 6px; background: #4BB9FA; margin: -32px -36px 20px; }
  h1 { font-size: 20px; margin: 0 0 2px; color: #1B6AA6; }
  .meta { color: #566777; font-size: 12px; margin: 0; }
  .aviso { color: #566777; font-size: 11px; margin: 4px 0 14px; }
  section { margin-top: 16px; page-break-inside: avoid; }
  h2 { font-size: 14px; color: #12263A; border-bottom: 1px solid #E3ECF4;
       padding-bottom: 4px; margin: 0 0 8px; }
  .campo { margin-bottom: 8px; }
  .rotulo { font-size: 11px; color: #566777; font-weight: 700; }
  .resposta { font-size: 13px; color: #12263A; }
</style></head>
<body>
  <div class="barra"></div>
  <h1>Zela — Ficha médica</h1>
  <p class="meta">${escapar(usuario.nome_completo)} · CPF ${cpfFmt(usuario.cpf)}</p>
  <p class="meta">Gerado em ${escapar(new Date().toLocaleString("pt-BR"))}</p>
  <p class="aviso">Documento de pré-atendimento. Não substitui avaliação profissional.</p>
  ${secoesHtml}
</body></html>`;
}

/** Gera o PDF da ficha e abre o menu de compartilhar/salvar do sistema. */
export async function gerarFichaPdf(usuario: Usuario, respostas: Respostas): Promise<void> {
  const html = montarHtml(usuario, respostas);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Ficha médica — Zela",
      UTI: "com.adobe.pdf",
    });
  }
}
