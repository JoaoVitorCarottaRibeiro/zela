"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  analisarFoto,
  ApiError,
  enviarTriagem,
  transcreverAudio,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, Nivel, ResultadoVisao, Triagem } from "@/lib/tipos";
import RiskBadge from "@/components/RiskBadge";
import {
  IconeCasa,
  IconeFoto,
  IconeSamu,
  IconeTelessaude,
  IconeTexto,
  IconeUbs,
  IconeVoz,
} from "@/components/Icones";
import estilos from "./TriagemCliente.module.css";

type Canal = "texto" | "voz" | "foto";

/** Idade (anos completos) a partir da data de nascimento (YYYY-MM-DD). */
function idadeDe(nascimento?: string | null): string {
  if (!nascimento) return "";
  const nasc = new Date(nascimento);
  if (Number.isNaN(nasc.getTime())) return "";
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos -= 1;
  return anos >= 0 && anos <= 130 ? String(anos) : "";
}

const CANAIS: { id: Canal; rotulo: string; Icone: typeof IconeTexto }[] = [
  { id: "texto", rotulo: "Por texto", Icone: IconeTexto },
  { id: "voz", rotulo: "Por voz", Icone: IconeVoz },
  { id: "foto", rotulo: "Por foto", Icone: IconeFoto },
];

const DESTINO: Record<
  Destino,
  { titulo: string; descricao: string; Icone: typeof IconeCasa }
> = {
  casa: {
    titulo: "Cuidar em casa",
    descricao:
      "Siga a orientação, descanse e observe os sinais. Volte a fazer a triagem se algo piorar.",
    Icone: IconeCasa,
  },
  ubs: {
    titulo: "Procurar a UBS",
    descricao:
      "Leve seus sintomas à Unidade Básica de Saúde mais próxima nos próximos dias.",
    Icone: IconeUbs,
  },
  telessaude: {
    titulo: "Teleconsulta",
    descricao:
      "Converse com um profissional de saúde à distância para avaliar melhor.",
    Icone: IconeTelessaude,
  },
  samu: {
    titulo: "Acionar o SAMU 192",
    descricao:
      "Os sinais são de urgência. Ligue para o SAMU 192 ou vá ao pronto-socorro agora.",
    Icone: IconeSamu,
  },
};

const TITULO_NIVEL: Record<Nivel, string> = {
  verde: "Pode ser cuidado com orientação",
  amarelo: "Vale procurar atendimento",
  vermelho: "Procure ajuda agora",
};

export default function TriagemCliente({
  cpfConvidado,
}: {
  /** Quando presente, é uma triagem de urgência (convidado, sem login). */
  cpfConvidado?: string | null;
} = {}) {
  const { token, usuario } = useAuth();
  const [canal, setCanal] = useState<Canal>("texto");

  // Campos compartilhados de texto/voz
  const [sintomas, setSintomas] = useState("");
  // A idade NÃO é mais um campo visível: a IA usa a idade já cadastrada
  // (calculada do nascimento). Na urgência (convidado) não há cadastro → sem idade.
  const idade = cpfConvidado ? "" : idadeDe(usuario?.data_nascimento);

  // Estado de rede e resultados
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [triagem, setTriagem] = useState<Triagem | null>(null);
  const [visao, setVisao] = useState<ResultadoVisao | null>(null);

  // Voz
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  // Foto
  const [previa, setPrevia] = useState<string | null>(null);
  const [nomeFoto, setNomeFoto] = useState<string | null>(null);

  const resultadoRef = useRef<HTMLDivElement | null>(null);

  function rolarAteResultado() {
    requestAnimationFrame(() =>
      resultadoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  }

  function limparResultado() {
    setTriagem(null);
    setVisao(null);
    setErro(null);
  }

  const idadeNumero = () => {
    const n = parseInt(idade, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  async function analisarSintomas(origem: "app" | "voz") {
    if (sintomas.trim().length < 3) {
      setErro("Conte um pouco mais sobre o que você está sentindo.");
      return;
    }
    limparResultado();
    setCarregando(true);
    try {
      const resposta = await enviarTriagem(
        {
          sintomas: sintomas.trim(),
          idade: idadeNumero(),
          canal: origem,
        },
        { token, cpfInformado: cpfConvidado },
      );
      setTriagem(resposta);
      rolarAteResultado();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Algo deu errado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // ---------------------------------------------------------------- voz
  async function iniciarGravacao() {
    setAvisoVoz(null);
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream);
      pedacosRef.current = [];
      gravador.ondataavailable = (ev) => {
        if (ev.data.size > 0) pedacosRef.current.push(ev.data);
      };
      gravador.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacosRef.current, {
          type: gravador.mimeType || "audio/webm",
        });
        await enviarParaTranscrever(blob, "gravacao.webm");
      };
      gravadorRef.current = gravador;
      gravador.start();
      setGravando(true);
    } catch {
      setAvisoVoz(
        "Não conseguimos usar o microfone. Você pode enviar um arquivo de áudio ou escrever os sintomas.",
      );
    }
  }

  function pararGravacao() {
    gravadorRef.current?.stop();
    setGravando(false);
  }

  async function enviarParaTranscrever(audio: Blob, nome: string) {
    setTranscrevendo(true);
    setErro(null);
    try {
      const r = await transcreverAudio(audio, nome);
      if (r.texto && r.texto.trim()) {
        setSintomas(r.texto.trim());
        setAvisoVoz("Transcrevemos sua fala. Revise o texto e toque em analisar.");
      } else {
        setAvisoVoz(
          "Não foi possível entender o áudio. Tente de novo ou escreva os sintomas.",
        );
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao transcrever o áudio.");
    } finally {
      setTranscrevendo(false);
    }
  }

  function aoEscolherAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) enviarParaTranscrever(arquivo, arquivo.name);
  }

  // ---------------------------------------------------------------- foto
  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeFoto(arquivo.name);
    setPrevia(URL.createObjectURL(arquivo));
    limparResultado();
    setCarregando(true);
    try {
      const r = await analisarFoto(arquivo);
      setVisao(r);
      rolarAteResultado();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Falha ao analisar a foto.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className={estilos.area}>
      {/* Seletor de canal */}
      <div className={estilos.abas} role="tablist" aria-label="Como fazer a triagem">
        {CANAIS.map(({ id, rotulo, Icone }) => (
          <button
            key={id}
            role="tab"
            aria-selected={canal === id}
            className={`${estilos.aba} ${canal === id ? estilos.abaAtiva : ""}`}
            onClick={() => {
              setCanal(id);
              setErro(null);
            }}
          >
            <Icone className={estilos.abaIcone} aria-hidden />
            {rotulo}
          </button>
        ))}
      </div>

      <div className={estilos.painel}>
        {/* ---------------------------------------------- Texto */}
        {canal === "texto" && (
          <div className={estilos.campo}>
            <h3 className={estilos.campoTitulo}>Descreva o que está sentindo</h3>
            <p className={estilos.campoAjuda}>
              Escreva com suas palavras. Quanto mais detalhes (quando começou,
              onde dói, febre), melhor a orientação.
            </p>
            <label className={estilos.rotulo} htmlFor="sintomas-texto">
              Sintomas
            </label>
            <textarea
              id="sintomas-texto"
              className={estilos.textarea}
              rows={5}
              placeholder="Ex.: estou com febre há dois dias, dor de cabeça e o corpo dói."
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
            />
            <div className={estilos.linha}>
              <button
                className="botao botao--primario"
                onClick={() => analisarSintomas("app")}
                disabled={carregando}
              >
                {carregando ? "Analisando…" : "Analisar sintomas"}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------- Voz */}
        {canal === "voz" && (
          <div className={estilos.campo}>
            <h3 className={estilos.campoTitulo}>Fale os seus sintomas</h3>
            <p className={estilos.campoAjuda}>
              Toque em gravar e conte o que sente, como numa conversa. Vamos
              transcrever para você conferir antes de analisar.
            </p>

            <div className={estilos.vozControles}>
              {!gravando ? (
                <button
                  className="botao botao--primario"
                  onClick={iniciarGravacao}
                  disabled={transcrevendo || carregando}
                >
                  {transcrevendo ? "Transcrevendo…" : "Gravar fala"}
                </button>
              ) : (
                <button className={`botao ${estilos.botaoParar}`} onClick={pararGravacao}>
                  <span className={estilos.pulsar} aria-hidden /> Parar e enviar
                </button>
              )}

              <label className={`botao botao--contorno ${estilos.botaoArquivo}`}>
                Enviar áudio
                <input
                  type="file"
                  accept="audio/*"
                  className="escondido-visual"
                  onChange={aoEscolherAudio}
                />
              </label>
            </div>

            {avisoVoz && <p className={estilos.aviso}>{avisoVoz}</p>}

            <label className={estilos.rotulo} htmlFor="sintomas-voz">
              Texto reconhecido
            </label>
            <textarea
              id="sintomas-voz"
              className={estilos.textarea}
              rows={4}
              placeholder="O que você falar aparece aqui para revisar."
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
            />
            <div className={estilos.linha}>
              <button
                className="botao botao--primario"
                onClick={() => analisarSintomas("voz")}
                disabled={carregando || !sintomas.trim()}
              >
                {carregando ? "Analisando…" : "Analisar o que foi dito"}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------- Foto */}
        {canal === "foto" && (
          <div className={estilos.campo}>
            <h3 className={estilos.campoTitulo}>Envie uma foto</h3>
            <p className={estilos.campoAjuda}>
              Útil para ferida, mancha na pele ou uma receita. A foto é analisada
              apenas para orientar — não é um diagnóstico.
            </p>

            <label className={estilos.areaFoto}>
              {previa ? (
                <Image
                  src={previa}
                  alt="Pré-visualização da foto enviada"
                  width={360}
                  height={240}
                  className={estilos.previa}
                  unoptimized
                />
              ) : (
                <span className={estilos.areaFotoInterno}>
                  <IconeFoto className={estilos.areaFotoIcone} aria-hidden />
                  <span className={estilos.areaFotoTexto}>
                    Toque para escolher ou tirar uma foto
                  </span>
                  <span className={estilos.areaFotoNota}>JPG ou PNG</span>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="escondido-visual"
                onChange={aoEscolherFoto}
              />
            </label>
            {nomeFoto && <p className={estilos.aviso}>Arquivo: {nomeFoto}</p>}
            {carregando && <p className={estilos.aviso}>Analisando a imagem…</p>}
          </div>
        )}
      </div>

      {/* ---------------------------------------------- Resultado */}
      <div ref={resultadoRef}>
        {erro && (
          <div className={`${estilos.resultado} ${estilos.resultadoErro}`} role="alert">
            <strong>Não deu certo.</strong>
            <p>{erro}</p>
          </div>
        )}

        {triagem && !erro && <ResultadoTriagem triagem={triagem} />}
        {visao && !erro && <ResultadoVisaoView visao={visao} />}

        {(triagem || visao) && !erro && (
          <p className={estilos.isencao}>
            A Zela orienta e prioriza — não substitui a avaliação de um
            profissional de saúde. Em caso de urgência, ligue 192.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultadoTriagem({ triagem }: { triagem: Triagem }) {
  const enc = triagem.encaminhamentos[0];
  const destino = enc ? DESTINO[enc.destino] : null;
  const Icone = destino?.Icone;
  return (
    <div className={`${estilos.resultado} ${estilos[`borda_${triagem.nivel}`]}`}>
      <div className={estilos.resultadoTopo}>
        <h3 className={estilos.resultadoTitulo}>{TITULO_NIVEL[triagem.nivel]}</h3>
        <RiskBadge nivel={triagem.nivel} />
      </div>

      <p className={estilos.orientacao}>{triagem.orientacao}</p>

      {triagem.justificativa && (
        <p className={estilos.justificativa}>{triagem.justificativa}</p>
      )}

      {destino && Icone && (
        <div className={estilos.encaminhamento}>
          <span className={`${estilos.encIcone} ${estilos[`enc_${triagem.nivel}`]}`}>
            <Icone aria-hidden />
          </span>
          <div>
            <span className={estilos.encRotulo}>Próximo passo</span>
            <strong className={estilos.encTitulo}>{destino.titulo}</strong>
            <p className={estilos.encDescricao}>{destino.descricao}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultadoVisaoView({ visao }: { visao: ResultadoVisao }) {
  return (
    <div className={`${estilos.resultado} ${estilos[`borda_${visao.risco}`]}`}>
      <div className={estilos.resultadoTopo}>
        <h3 className={estilos.resultadoTitulo}>Análise da foto</h3>
        <RiskBadge nivel={visao.risco} />
      </div>
      <p className={estilos.orientacao}>{visao.descricao}</p>
      {visao.origem !== "ia" && (
        <p className={estilos.justificativa}>
          Observação: a análise de imagem está em modo limitado neste ambiente.
        </p>
      )}
    </div>
  );
}
