"use client";

import { useRef, useState } from "react";
import { analisarExame, ApiError, salvarExame } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ItemExame, ResultadoExame } from "@/lib/tipos";
import { IconeFoto } from "@/components/Icones";
import estilos from "./Exame.module.css";

const SITUACAO: Record<
  ItemExame["situacao"],
  { rotulo: string; classe: string }
> = {
  dentro: { rotulo: "Dentro da faixa", classe: "dentro" },
  fora: { rotulo: "Fora da faixa", classe: "fora" },
  atencao: { rotulo: "Verificar", classe: "atencao" },
};

export default function ExameCliente() {
  const { token } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoExame | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !token) return;
    setErro(null);
    setResultado(null);
    setGuardado(false);
    setErroSalvar(null);
    setNomeArquivo(arquivo.name);
    setCarregando(true);
    try {
      const r = await analisarExame(arquivo, token);
      setResultado(r);
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : "Não consegui ler o exame. Tente uma foto mais nítida ou um PDF.",
      );
    } finally {
      setCarregando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function recomecar() {
    setResultado(null);
    setErro(null);
    setNomeArquivo(null);
    setGuardado(false);
    setErroSalvar(null);
  }

  async function salvar() {
    if (!resultado || !token) return;
    setErroSalvar(null);
    setSalvando(true);
    try {
      await salvarExame(resultado, token);
      setGuardado(true);
    } catch (err) {
      setErroSalvar(
        err instanceof ApiError
          ? err.message
          : "Não consegui guardar agora. Tente de novo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={estilos.area}>
      {/* Enquadramento sempre visível */}
      <div className={estilos.aviso} role="note">
        <strong>Isto é uma explicação, não um diagnóstico.</strong> A Zela ajuda
        você a entender seu exame em palavras simples, mas quem interpreta o
        resultado é um profissional de saúde. Leve seu exame a um deles.
      </div>

      {!resultado ? (
        <div className={estilos.painel}>
          <label className={estilos.areaUpload}>
            <IconeFoto className={estilos.uploadIcone} aria-hidden />
            <span className={estilos.uploadTexto}>
              {carregando
                ? "Lendo seu exame…"
                : "Toque para enviar uma foto ou PDF do seu exame"}
            </span>
            <span className={estilos.uploadNota}>
              JPG, PNG ou PDF. Uma foto nítida e com boa luz ajuda na leitura.
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="escondido-visual"
              onChange={aoEscolher}
              disabled={carregando}
            />
          </label>
          <p className={estilos.transparencia}>
            Seu exame é lido por uma inteligência artificial só para te explicar.
            Nada fica guardado sem você pedir.
          </p>
          {nomeArquivo && <p className={estilos.arquivo}>Arquivo: {nomeArquivo}</p>}
          {erro && (
            <p className={estilos.erro} role="alert">
              {erro}
            </p>
          )}
        </div>
      ) : (
        <div className={estilos.resultado}>
          <p className={estilos.resumo}>{resultado.resumo}</p>

          {resultado.itens.length > 0 && (
            <ul className={estilos.itens}>
              {resultado.itens.map((it, i) => (
                <li key={i} className={estilos.item}>
                  <div className={estilos.itemTopo}>
                    <span className={estilos.itemNome}>{it.nome}</span>
                    <span
                      className={`${estilos.badge} ${estilos[`b_${SITUACAO[it.situacao].classe}`]}`}
                    >
                      {SITUACAO[it.situacao].rotulo}
                    </span>
                  </div>
                  <div className={estilos.itemValores}>
                    {it.valor && (
                      <span className={estilos.valor}>{it.valor}</span>
                    )}
                    {it.referencia && (
                      <span className={estilos.ref}>Referência: {it.referencia}</span>
                    )}
                  </div>
                  {it.explicacao && (
                    <p className={estilos.itemExpl}>{it.explicacao}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {resultado.precisa_cuidado && (
            <div className={estilos.cuidado}>
              <strong>Próximo passo:</strong> leve este exame a um profissional de
              saúde.
              {resultado.nivel === "vermelho"
                ? " Como há um valor bem alterado, não demore — procure atendimento o quanto antes."
                : " Na UBS ou na próxima consulta, mostre esses resultados para avaliarem com você."}
            </div>
          )}

          {resultado.origem === "ia" && (
            <div className={estilos.consentimento}>
              {guardado ? (
                <p className={estilos.guardado}>
                  Guardado no seu histórico. Você pode apagar quando quiser, na
                  página de Resultados.
                </p>
              ) : (
                <>
                  <p className={estilos.consentimentoTexto}>
                    Quer guardar este exame no seu histórico? Só você vê, e pode
                    apagar quando quiser.
                  </p>
                  {erroSalvar && (
                    <p className={estilos.erro} role="alert">
                      {erroSalvar}
                    </p>
                  )}
                  <button
                    type="button"
                    className="botao botao--primario"
                    onClick={salvar}
                    disabled={salvando}
                  >
                    {salvando ? "Guardando…" : "Guardar no meu histórico"}
                  </button>
                </>
              )}
            </div>
          )}

          <p className={estilos.rodapeAviso}>
            A Zela orienta e prioriza, não substitui a avaliação de um
            profissional. Em caso de urgência, ligue 192.
          </p>

          <div className={estilos.acoes}>
            <button className="botao botao--contorno" onClick={recomecar}>
              Enviar outro exame
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
