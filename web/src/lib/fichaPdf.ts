// Gera o PDF da ficha médica a partir das mesmas definições do formulário.
import { jsPDF } from "jspdf";
import { SECOES, type Medicamento, type Respostas } from "./fichaDefs";
import type { Usuario } from "./tipos";

function textoResposta(tipo: string, valor: unknown): string {
  if (tipo === "consent") return valor ? "Sim" : "Não";
  if (tipo === "medicamentos") {
    const lista = (valor as Medicamento[]) ?? [];
    if (!lista.length) return "Não informado";
    return lista
      .filter((m) => m.nome?.trim())
      .map((m) => {
        const extra = [m.dosagem, m.frequencia].filter(Boolean).join(", ");
        const base = extra ? `${m.nome} (${extra})` : m.nome;
        return m.motivo ? `${base} — ${m.motivo}` : base;
      })
      .join("; ");
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

export function gerarFichaPdf(usuario: Usuario, respostas: Respostas): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 48;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = margem;

  const quebraSePreciso = (altura: number) => {
    if (y + altura > alturaPagina - margem) {
      doc.addPage();
      y = margem;
    }
  };

  const linhas = (texto: string, tamanho: number, estilo: "normal" | "bold", cor = 20) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(cor);
    const partes = doc.splitTextToSize(texto, largura) as string[];
    for (const parte of partes) {
      quebraSePreciso(tamanho + 4);
      doc.text(parte, margem, y);
      y += tamanho + 4;
    }
  };

  // Cabeçalho
  doc.setFillColor(75, 185, 250);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
  y = margem;
  linhas("Zela — Ficha médica", 18, "bold", 30);
  linhas(
    `${usuario.nome_completo}  ·  CPF ${cpfFmt(usuario.cpf)}`,
    11,
    "normal",
    90,
  );
  linhas(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    9,
    "normal",
    130,
  );
  y += 6;
  linhas(
    "Documento de pré-atendimento. Não substitui avaliação profissional.",
    9,
    "normal",
    130,
  );
  y += 10;

  for (const secao of SECOES) {
    quebraSePreciso(40);
    y += 6;
    linhas(secao.titulo, 13, "bold", 30);
    y += 2;
    for (const campo of secao.campos) {
      if (campo.mostrarSe && !campo.mostrarSe(respostas)) continue;
      linhas(campo.rotulo, 10, "bold", 70);
      linhas(textoResposta(campo.tipo, respostas[campo.id]), 11, "normal", 20);
      y += 4;
    }
  }

  doc.save("ficha-medica-zela.pdf");
}
