// Camada de serviços: todas as chamadas à API de IA (ia/) passam por aqui.
// A URL vem do ambiente (EXPO_PUBLIC_API_URL). Em dispositivo físico, troque
// "localhost" pelo IP da sua máquina (ex.: http://192.168.0.10:8000).

import type {
  MensagemConversa,
  RespostaAuth,
  RespostaConversa,
  ResultadoTranscricao,
  ResultadoVisao,
  Triagem,
  Usuario,
} from "./tipos";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const MSG_OFFLINE =
  "Não foi possível falar com a Zela agora. Verifique sua conexão e tente de novo.";

async function lerErro(resp: Response): Promise<string> {
  try {
    const dado = await resp.json();
    const detail = dado?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return String(detail[0]?.msg ?? "Dados inválidos.").replace(
        /^Value error,\s*/i,
        "",
      );
    }
  } catch {
    /* corpo não era JSON */
  }
  return `Falha ao processar (código ${resp.status}).`;
}

function auth(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ------------------------------------------------------------- Autenticação

export interface DadosCadastro {
  nome_completo: string;
  data_nascimento: string;
  cpf: string;
  senha: string;
  confirmar_senha: string;
}

export async function login(usuarioLogin: string, senha: string): Promise<RespostaAuth> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: usuarioLogin, senha }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as RespostaAuth;
}

export async function cadastrar(dados: DadosCadastro): Promise<RespostaAuth> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as RespostaAuth;
}

export async function obterMe(token: string): Promise<Usuario> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/me`, { headers: { ...auth(token) } });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as Usuario;
}

// ----------------------------------------------------------------- Triagem

export interface OpcoesConversa {
  idade?: number | null;
  canal?: string;
  token?: string | null;
  contextoFoto?: string | null;
}

/** POST /triagem/conversa — triagem conversacional (a IA pergunta antes de
 *  concluir). Devolve uma pergunta com sugestões ou a triagem já registrada. */
export async function conversarTriagem(
  historico: MensagemConversa[],
  opcoes: OpcoesConversa = {},
): Promise<RespostaConversa> {
  const { idade, canal, token, contextoFoto } = opcoes;
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/triagem/conversa`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify({
        historico,
        idade: idade ?? null,
        canal: canal ?? "app",
        contexto_foto: contextoFoto ?? null,
      }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as RespostaConversa;
}

/** POST /voz/transcrever — manda o áudio gravado (uri local) e recebe o texto. */
export async function transcreverAudio(uri: string): Promise<ResultadoTranscricao> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: "gravacao.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/voz/transcrever`, { method: "POST", body: form });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as ResultadoTranscricao;
}

/** POST /visao/analisar — manda a foto (uri local) e recebe descrição + risco. */
export async function analisarFoto(uri: string): Promise<ResultadoVisao> {
  const form = new FormData();
  form.append("foto", {
    uri,
    name: "foto.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/visao/analisar`, { method: "POST", body: form });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as ResultadoVisao;
}

/** GET /triagens/minhas — histórico do usuário logado. */
export async function listarMinhasTriagens(token: string): Promise<Triagem[]> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/triagens/minhas`, { headers: { ...auth(token) } });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as Triagem[];
}
