"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, obterFicha, salvarFicha } from "@/lib/api";
import {
  CONSENTIMENTOS,
  SECOES,
  temEmergencia,
  type CampoFicha,
  type Medicamento,
  type Respostas,
} from "@/lib/fichaDefs";
import { gerarFichaPdf } from "@/lib/fichaPdf";
import estilos from "./Ficha.module.css";
import campos from "./FormAuth.module.css";

const MED_VAZIO: Medicamento = { nome: "", dosagem: "", frequencia: "", motivo: "" };

function ehExclusiva(opcao: string): boolean {
  return /^(Nenhum|Nenhuma|Não possuo|Não conheço|Não sei)/.test(opcao);
}

export default function FichaMedicaCliente() {
  const { usuario, token } = useAuth();
  const [respostas, setRespostas] = useState<Respostas>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    obterFicha(token)
      .then((f) => {
        if (f?.dados) setRespostas(f.dados as Respostas);
      })
      .catch(() => {
        /* mantém ficha vazia */
      })
      .finally(() => setCarregando(false));
  }, [token]);

  function set(id: string, valor: unknown) {
    setSucesso(null);
    setRespostas((r) => ({ ...r, [id]: valor }));
  }

  function toggleCheckbox(campoId: string, opcao: string) {
    setSucesso(null);
    setRespostas((r) => {
      const atual = (r[campoId] as string[]) ?? [];
      let novo: string[];
      if (atual.includes(opcao)) {
        novo = atual.filter((o) => o !== opcao);
      } else if (ehExclusiva(opcao)) {
        novo = [opcao];
      } else {
        novo = [...atual.filter((o) => !ehExclusiva(o)), opcao];
      }
      return { ...r, [campoId]: novo };
    });
  }

  const meds = (): Medicamento[] =>
    ((respostas.medicamentos as Medicamento[]) ?? [{ ...MED_VAZIO }]);

  function setMed(i: number, campo: keyof Medicamento, valor: string) {
    const lista = meds().map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m));
    set("medicamentos", lista);
  }
  function addMed() {
    set("medicamentos", [...meds(), { ...MED_VAZIO }]);
  }
  function removeMed(i: number) {
    const lista = meds().filter((_, idx) => idx !== i);
    set("medicamentos", lista.length ? lista : [{ ...MED_VAZIO }]);
  }

  const consentimentosOk = CONSENTIMENTOS.every((c) => respostas[c] === true);

  async function salvar() {
    if (!token) return;
    if (!consentimentosOk) {
      setErro("Para salvar, confirme os três itens de consentimento na seção 7.");
      setSucesso(null);
      return;
    }
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      await salvarFicha(token, respostas);
      setSucesso("Ficha médica salva com sucesso.");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar a ficha.");
    } finally {
      setSalvando(false);
    }
  }

  function exportarPdf() {
    if (usuario) gerarFichaPdf(usuario, respostas);
  }

  if (!usuario) return null;
  if (carregando) {
    return <p className={estilos.carregando}>Carregando sua ficha…</p>;
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecalho}>
        <span className="sobrelinha">Ficha médica</span>
        <h1>Pré-atendimento da IA</h1>
        <p className={estilos.intro}>
          Essas informações ajudam a Zela a contextualizar a sua triagem e orientar
          melhor. Preencha o que souber — você pode atualizar quando quiser. Não
          substitui avaliação profissional.
        </p>
      </header>

      {temEmergencia(respostas) && (
        <div className={estilos.emergencia} role="alert">
          <strong>Sinal de emergência marcado.</strong> Se você está passando por
          isso agora, não espere a ficha: ligue para o <strong>SAMU 192</strong> ou
          vá ao serviço de emergência mais próximo.
        </div>
      )}

      {SECOES.map((secao) => (
        <section key={secao.id} className={estilos.secao}>
          <h2 className={estilos.secaoTitulo}>{secao.titulo}</h2>
          {secao.descricao && <p className={estilos.secaoDesc}>{secao.descricao}</p>}
          {secao.campos.map((campo) =>
            campo.mostrarSe && !campo.mostrarSe(respostas) ? null : (
              <Campo
                key={campo.id}
                campo={campo}
                respostas={respostas}
                set={set}
                toggleCheckbox={toggleCheckbox}
                meds={meds}
                setMed={setMed}
                addMed={addMed}
                removeMed={removeMed}
              />
            ),
          )}
        </section>
      ))}

      {erro && <div className={campos.erro}>{erro}</div>}
      {sucesso && <div className={campos.sucesso}>{sucesso}</div>}

      <div className={estilos.acoes}>
        <button
          type="button"
          className="botao botao--primario"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar ficha"}
        </button>
        <button type="button" className="botao botao--contorno" onClick={exportarPdf}>
          Salvar em PDF
        </button>
      </div>
    </div>
  );
}

interface CampoProps {
  campo: CampoFicha;
  respostas: Respostas;
  set: (id: string, valor: unknown) => void;
  toggleCheckbox: (campoId: string, opcao: string) => void;
  meds: () => Medicamento[];
  setMed: (i: number, c: keyof Medicamento, v: string) => void;
  addMed: () => void;
  removeMed: (i: number) => void;
}

function Campo({
  campo,
  respostas,
  set,
  toggleCheckbox,
  meds,
  setMed,
  addMed,
  removeMed,
}: CampoProps) {
  const valor = respostas[campo.id];

  if (campo.tipo === "consent") {
    return (
      <label className={estilos.consent}>
        <input
          type="checkbox"
          checked={valor === true}
          onChange={(e) => set(campo.id, e.target.checked)}
        />
        <span>{campo.rotulo}</span>
      </label>
    );
  }

  return (
    <div className={estilos.campo}>
      <span className={estilos.pergunta}>{campo.rotulo}</span>

      {campo.tipo === "checkboxes" && (
        <div className={estilos.opcoes}>
          {campo.opcoes!.map((op) => {
            const marcado = ((valor as string[]) ?? []).includes(op);
            return (
              <label key={op} className={`${estilos.opcao} ${marcado ? estilos.opcaoAtiva : ""}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => toggleCheckbox(campo.id, op)}
                />
                <span>{op}</span>
              </label>
            );
          })}
        </div>
      )}

      {campo.tipo === "radio" && (
        <div className={estilos.opcoes}>
          {campo.opcoes!.map((op) => {
            const marcado = valor === op;
            return (
              <label key={op} className={`${estilos.opcao} ${marcado ? estilos.opcaoAtiva : ""}`}>
                <input
                  type="radio"
                  name={campo.id}
                  checked={marcado}
                  onChange={() => set(campo.id, op)}
                />
                <span>{op}</span>
              </label>
            );
          })}
        </div>
      )}

      {campo.tipo === "texto" && (
        <input
          className={campos.input}
          type="text"
          value={(valor as string) ?? ""}
          onChange={(e) => set(campo.id, e.target.value)}
        />
      )}

      {campo.tipo === "textarea" && (
        <textarea
          className={campos.input}
          rows={3}
          value={(valor as string) ?? ""}
          onChange={(e) => set(campo.id, e.target.value)}
        />
      )}

      {campo.tipo === "medicamentos" && (
        <div className={estilos.meds}>
          {meds().map((m, i) => (
            <div key={i} className={estilos.medLinha}>
              <input
                className={campos.input}
                placeholder="Medicamento"
                value={m.nome}
                onChange={(e) => setMed(i, "nome", e.target.value)}
              />
              <input
                className={campos.input}
                placeholder="Dosagem"
                value={m.dosagem}
                onChange={(e) => setMed(i, "dosagem", e.target.value)}
              />
              <input
                className={campos.input}
                placeholder="Frequência"
                value={m.frequencia}
                onChange={(e) => setMed(i, "frequencia", e.target.value)}
              />
              <input
                className={campos.input}
                placeholder="Motivo"
                value={m.motivo}
                onChange={(e) => setMed(i, "motivo", e.target.value)}
              />
              <button
                type="button"
                className={estilos.medRemover}
                onClick={() => removeMed(i)}
                aria-label="Remover medicamento"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className={estilos.medAdd} onClick={addMed}>
            + Adicionar medicamento
          </button>
        </div>
      )}
    </div>
  );
}
