"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  analisarFoto,
  ApiError,
  conversarTriagem,
  falarComPiper,
  transcreverAudio,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Canal, Destino, Nivel, MensagemConversa, Triagem } from "@/lib/tipos";
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

type CanalInput = "texto" | "voz" | "foto";

/** Balão exibido na conversa. `local` = só visual, não vai para a IA. */
interface Balao {
  autor: "usuario" | "zela";
  texto: string;
  fotoUrl?: string;
  local?: boolean;
}

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

const CANAIS: { id: CanalInput; rotulo: string; Icone: typeof IconeTexto }[] = [
  { id: "texto", rotulo: "Por texto", Icone: IconeTexto },
  { id: "voz", rotulo: "Por voz", Icone: IconeVoz },
  { id: "foto", rotulo: "Por foto", Icone: IconeFoto },
];

const CANAL_API: Record<CanalInput, Canal> = {
  texto: "app",
  voz: "voz",
  foto: "foto",
};

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

const SAUDACAO =
  "Olá! Sou a Zela. Me conte, com suas palavras, o que você está sentindo. Pode ser por texto, por voz ou enviando uma foto.";

/** Fala um texto usando a síntese do próprio navegador (grátis, sem chave).
 *  É a alternativa quando o Piper (voz offline melhor) não está instalado. */
function falarNavegador(texto: string, onFim?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onFim?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    const vozPt = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (vozPt) fala.voice = vozPt;
    fala.rate = 1;
    fala.onend = () => onFim?.();
    fala.onerror = () => onFim?.();
    window.speechSynthesis.speak(fala);
  } catch {
    /* sem suporte / bloqueado — segue só com o texto na tela */
    onFim?.();
  }
}

function silenciarFala() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignora */
    }
  }
}

export default function TriagemCliente({
  cpfConvidado,
}: {
  /** Quando presente, é uma triagem de urgência (convidado, sem login). */
  cpfConvidado?: string | null;
} = {}) {
  const { token, usuario } = useAuth();
  const [canal, setCanal] = useState<CanalInput>("texto");

  const idade = cpfConvidado ? "" : idadeDe(usuario?.data_nascimento);
  const idadeNumero = () => {
    const n = parseInt(idade, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  // Conversa
  const [baloes, setBaloes] = useState<Balao[]>([
    { autor: "zela", texto: SAUDACAO, local: true },
  ]);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [entrada, setEntrada] = useState("");
  const [contextoFoto, setContextoFoto] = useState<string | null>(null);
  const [triagem, setTriagem] = useState<Triagem | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // A Zela lê as respostas em voz alta (ligado por padrão; dá para silenciar).
  const [ouvir, setOuvir] = useState(true);
  // Espelho dos balões para ler o histórico atual mesmo dentro de callbacks
  // assíncronos (ex.: fim da gravação de voz).
  const baloesRef = useRef<Balao[]>([]);
  useEffect(() => {
    baloesRef.current = baloes;
  }, [baloes]);

  // Saudação inicial personalizada quando o usuário logado carrega (só enquanto
  // a conversa ainda não começou).
  useEffect(() => {
    const nome = usuario?.nome_completo?.trim().split(" ")[0];
    if (nome && baloesRef.current.length === 1 && baloesRef.current[0].local) {
      const texto = `Olá, ${nome}! Sou a Zela. Me conte, com suas palavras, o que você está sentindo. Pode ser por texto, por voz ou enviando uma foto.`;
      const inicio: Balao[] = [{ autor: "zela", texto, local: true }];
      baloesRef.current = inicio;
      setBaloes(inicio);
    }
  }, [usuario]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A Zela está falando agora? Serve para uma fala não sobrepor a outra — em
  // especial, para "Ouvir de novo" não reiniciar por cima enquanto ela ainda lê.
  const [falando, setFalando] = useState(false);
  const falandoRef = useRef(false);
  function marcarFalando(valor: boolean) {
    falandoRef.current = valor;
    setFalando(valor);
  }

  /** Interrompe qualquer fala em andamento (áudio do Piper ou voz do navegador). */
  function pararFala() {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    } catch {
      /* ignora */
    }
    silenciarFala();
    marcarFalando(false);
  }

  /** Faz a Zela falar: tenta o Piper (voz offline, melhor) e, se não estiver
   *  configurado no servidor, usa a voz do próprio navegador. */
  async function falar(texto: string) {
    pararFala();
    marcarFalando(true); // a partir daqui, "Ouvir de novo" não sobrepõe
    try {
      const audioBlob = await falarComPiper(texto);
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          marcarFalando(false);
        };
        await audio.play();
        return;
      }
    } catch {
      /* cai no fallback do navegador */
    }
    falarNavegador(texto, () => marcarFalando(false));
  }

  // Voz
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  const fimRef = useRef<HTMLDivElement | null>(null);
  function rolar() {
    requestAnimationFrame(() =>
      fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }

  const encerrado = triagem !== null;

  function historicoDe(lista: Balao[]): MensagemConversa[] {
    return lista
      .filter((b) => !b.local && b.texto.trim())
      .map((b) => ({ autor: b.autor, texto: b.texto }));
  }

  /** Aplica a resposta da IA (pergunta ou conclusão) à conversa. */
  function aplicarResposta(r: Awaited<ReturnType<typeof conversarTriagem>>) {
    if (r.estado === "pergunta" && r.pergunta) {
      const texto = r.pergunta;
      setBaloes((b) => [...b, { autor: "zela", texto }]);
      setSugestoes(r.sugestoes ?? []);
      if (ouvir) falar(texto);
    } else if (r.estado === "concluido" && r.triagem) {
      setTriagem(r.triagem);
      setSugestoes([]);
      if (ouvir) {
        falar(`${TITULO_NIVEL[r.triagem.nivel]}. ${r.triagem.orientacao}`);
      }
    }
    rolar();
  }

  async function enviarTexto(texto: string) {
    const t = texto.trim();
    if (!t || carregando || encerrado) return;
    setErro(null);
    setSugestoes([]);
    const novos: Balao[] = [...baloesRef.current, { autor: "usuario", texto: t }];
    baloesRef.current = novos;
    setBaloes(novos);
    setEntrada("");
    setAvisoVoz(null);
    rolar();
    setCarregando(true);
    try {
      const r = await conversarTriagem(historicoDe(novos), {
        idade: idadeNumero(),
        canal: CANAL_API[canal],
        token,
        cpfInformado: cpfConvidado,
        contextoFoto,
      });
      aplicarResposta(r);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Algo deu errado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // ---------------------------------------------------------------- voz
  async function iniciarGravacao() {
    pararFala(); // não falar por cima de quem está gravando
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
        "Não conseguimos usar o microfone. Você pode enviar um arquivo de áudio ou escrever.",
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
      const texto = (r.texto || "").trim();
      if (texto) {
        // Acessibilidade: envia direto, sem depender de a pessoa ler e confirmar.
        setAvisoVoz(null);
        await enviarTexto(texto);
      } else {
        const msg = "Não consegui entender. Pode falar de novo, por favor?";
        setAvisoVoz(msg);
        if (ouvir) falar(msg);
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
    if (!arquivo || carregando || encerrado) return;
    setErro(null);
    setSugestoes([]);
    const url = URL.createObjectURL(arquivo);
    const novos: Balao[] = [
      ...baloesRef.current,
      { autor: "usuario", texto: "Enviei uma foto.", fotoUrl: url },
    ];
    baloesRef.current = novos;
    setBaloes(novos);
    rolar();
    setCarregando(true);
    try {
      const v = await analisarFoto(arquivo);
      const ctx = v.descricao;
      setContextoFoto(ctx);
      const r = await conversarTriagem(historicoDe(novos), {
        idade: idadeNumero(),
        canal: "foto",
        token,
        cpfInformado: cpfConvidado,
        contextoFoto: ctx,
      });
      aplicarResposta(r);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Falha ao analisar a foto.");
    } finally {
      setCarregando(false);
    }
  }

  function recomecar() {
    pararFala();
    const inicio: Balao[] = [{ autor: "zela", texto: SAUDACAO, local: true }];
    baloesRef.current = inicio;
    setBaloes(inicio);
    setSugestoes([]);
    setEntrada("");
    setContextoFoto(null);
    setTriagem(null);
    setErro(null);
    setAvisoVoz(null);
    setCanal("texto");
  }

  return (
    <div className={estilos.area}>
      {/* Seletor de canal de entrada */}
      <div className={estilos.abas} role="tablist" aria-label="Como responder">
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
            disabled={encerrado}
          >
            <Icone className={estilos.abaIcone} aria-hidden />
            {rotulo}
          </button>
        ))}
      </div>

      <div className={estilos.painel}>
        <div className={estilos.barraOuvir}>
          <button
            type="button"
            className={`${estilos.toggleOuvir} ${ouvir ? estilos.toggleOuvirOn : ""}`}
            aria-pressed={ouvir}
            onClick={() => {
              if (ouvir) pararFala();
              setOuvir((v) => !v);
            }}
          >
            <span className={estilos.togglePonto} aria-hidden />
            {ouvir ? "Zela lendo em voz alta" : "Voz da Zela desligada"}
          </button>
        </div>

        {/* Conversa */}
        <div className={estilos.thread} aria-live="polite">
          {baloes.map((b, i) =>
            b.autor === "zela" ? (
              <div key={i} className={`${estilos.balao} ${estilos.balaoZela}`}>
                {b.texto}
              </div>
            ) : (
              <div key={i} className={`${estilos.balao} ${estilos.balaoUsuario}`}>
                {b.fotoUrl && (
                  <Image
                    src={b.fotoUrl}
                    alt="Foto que você enviou"
                    width={220}
                    height={160}
                    className={estilos.balaoFoto}
                    unoptimized
                  />
                )}
                {b.texto}
              </div>
            ),
          )}

          {carregando && (
            <div className={`${estilos.balao} ${estilos.balaoZela} ${estilos.digitando}`}>
              <span /><span /><span />
            </div>
          )}

          {/* Resultado final */}
          {triagem && <ResultadoTriagem triagem={triagem} />}

          <div ref={fimRef} />
        </div>

        {erro && (
          <div className={`${estilos.resultado} ${estilos.resultadoErro}`} role="alert">
            <strong>Não deu certo.</strong>
            <p>{erro}</p>
          </div>
        )}

        {/* Sugestões de resposta rápida */}
        {!encerrado && sugestoes.length > 0 && (
          <div className={estilos.sugestoes}>
            {sugestoes.map((s) => (
              <button
                key={s}
                className={estilos.chip}
                onClick={() => enviarTexto(s)}
                disabled={carregando}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Área de entrada */}
        {triagem ? (
          <>
            <p className={estilos.isencao}>
              A Zela orienta e prioriza, não substitui a avaliação de um
              profissional de saúde. Em caso de urgência, ligue 192.
            </p>
            <div className={estilos.acoesFinais}>
              <button
                type="button"
                className="botao botao--contorno"
                disabled={falando}
                aria-disabled={falando}
                onClick={() => {
                  // Enquanto a Zela fala, ignora o clique (não sobrepõe nem
                  // reinicia); ao terminar, um novo clique repete normalmente.
                  if (falandoRef.current) return;
                  falar(`${TITULO_NIVEL[triagem.nivel]}. ${triagem.orientacao}`);
                }}
              >
                Ouvir de novo
              </button>
              <button className="botao botao--contorno" onClick={recomecar}>
                Fazer nova triagem
              </button>
            </div>
          </>
        ) : canal === "foto" ? (
          <label className={estilos.areaFoto}>
            <span className={estilos.areaFotoInterno}>
              <IconeFoto className={estilos.areaFotoIcone} aria-hidden />
              <span className={estilos.areaFotoTexto}>
                Toque para escolher ou tirar uma foto
              </span>
              <span className={estilos.areaFotoNota}>
                Útil para ferida, mancha na pele ou uma receita. JPG ou PNG.
              </span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="escondido-visual"
              onChange={aoEscolherFoto}
              disabled={carregando}
            />
          </label>
        ) : (
          <div className={estilos.entradaArea}>
            {canal === "voz" && (
              <div className={estilos.vozControles}>
                {!gravando ? (
                  <button
                    className="botao botao--contorno"
                    onClick={iniciarGravacao}
                    disabled={transcrevendo || carregando}
                  >
                    {transcrevendo ? "Transcrevendo…" : "Gravar fala"}
                  </button>
                ) : (
                  <button className={`botao ${estilos.botaoParar}`} onClick={pararGravacao}>
                    <span className={estilos.pulsar} aria-hidden /> Parar e transcrever
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
            )}

            {avisoVoz && <p className={estilos.aviso}>{avisoVoz}</p>}

            <div className={estilos.compositor}>
              <textarea
                className={estilos.textarea}
                rows={2}
                placeholder={
                  canal === "voz"
                    ? "Toque em Gravar fala e conte o que sente. Se preferir, pode escrever aqui."
                    : "Escreva o que você está sentindo…"
                }
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarTexto(entrada);
                  }
                }}
                disabled={carregando}
              />
              <button
                className="botao botao--primario"
                onClick={() => enviarTexto(entrada)}
                disabled={carregando || !entrada.trim()}
              >
                {carregando ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>
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
