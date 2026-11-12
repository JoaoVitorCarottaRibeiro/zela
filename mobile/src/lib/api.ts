// Camada de serviços: todas as chamadas à API de IA (ia/) passam por aqui.
// A URL vem do ambiente (EXPO_PUBLIC_API_URL). Em dispositivo físico, aponte
// para o IP da sua máquina (ex.: http://192.168.0.25:8000).

import type {
  DadosFicha,
  ExameAnaliseOut,
  FichaMedica,
  MensagemConversa,
  RespostaAuth,
  RespostaConversa,
  ResultadoExame,
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
  email?: string | null;
  genero?: string | null;
  identidade_genero?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  complemento?: string | null;
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

/** Campos editáveis do perfil (PATCH /auth/me). CPF e senha não entram aqui. */
export interface DadosPerfil {
  nome_completo?: string;
  data_nascimento?: string;
  email?: string | null;
  genero?: string | null;
  identidade_genero?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  complemento?: string | null;
}

/** PATCH /auth/me — edita o próprio perfil e devolve o usuário atualizado. */
export async function atualizarPerfil(
  token: string,
  dados: DadosPerfil,
): Promise<Usuario> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as Usuario;
}

/** POST /auth/trocar-senha — troca a senha do usuário logado (senha atual → nova). */
export async function trocarSenha(
  token: string,
  senhaAtual: string,
  senha: string,
  confirmarSenha: string,
): Promise<{ mensagem: string }> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/trocar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify({
        senha_atual: senhaAtual,
        senha,
        confirmar_senha: confirmarSenha,
      }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as { mensagem: string };
}

/** POST /auth/recuperar — dispara o e-mail de redefinição (resposta genérica). */
export async function recuperarSenha(login: string): Promise<{ mensagem: string }> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/recuperar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as { mensagem: string };
}

/** POST /auth/redefinir — confirma a nova senha com o token do e-mail. */
export async function redefinirSenha(
  token: string,
  senha: string,
  confirmarSenha: string,
): Promise<RespostaAuth> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/auth/redefinir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha, confirmar_senha: confirmarSenha }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as RespostaAuth;
}

// ----------------------------------------------------------------- Ficha médica

/** GET /ficha — ficha médica do usuário logado (ou null se nunca preencheu). */
export async function obterFicha(token: string): Promise<FichaMedica | null> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/ficha`, { headers: { ...auth(token) } });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as FichaMedica | null;
}

/** PUT /ficha — cria/atualiza a ficha médica do usuário logado. */
export async function salvarFicha(
  token: string,
  dados: DadosFicha,
): Promise<FichaMedica> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/ficha`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify({ dados }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as FichaMedica;
}

// --------------------------------------------------------------------- ViaCEP

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Busca o endereço pelo CEP na API gratuita ViaCEP. Devolve null se não achar. */
export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const digitos = cep.replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resp.ok) return null;
    const j = await resp.json();
    if (j?.erro) return null;
    return {
      logradouro: j.logradouro ?? "",
      bairro: j.bairro ?? "",
      cidade: j.localidade ?? "",
      uf: j.uf ?? "",
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------- Triagem

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

// ------------------------------------------------------------- Entenda o exame

/** POST /exame/analisar — lê um exame (foto ou PDF, uri local) e explica.
 *  Exige login. */
export async function analisarExame(
  uri: string,
  nome: string,
  mimeType: string,
  token: string,
): Promise<ResultadoExame> {
  const form = new FormData();
  form.append("arquivo", {
    uri,
    name: nome,
    type: mimeType,
  } as unknown as Blob);
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/exame/analisar`, {
      method: "POST",
      headers: { ...auth(token) },
      body: form,
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as ResultadoExame;
}

/** POST /exame/salvar — guarda no histórico uma análise que a pessoa autorizou. */
export async function salvarExame(
  resultado: ResultadoExame,
  token: string,
): Promise<ExameAnaliseOut> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/exame/salvar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify(resultado),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as ExameAnaliseOut;
}

/** DELETE /exame/{id} — apaga um exame do histórico (revogação, LGPD). */
export async function removerExame(id: number, token: string): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/exame/${id}`, {
      method: "DELETE",
      headers: { ...auth(token) },
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok && resp.status !== 204) {
    throw new ApiError(await lerErro(resp));
  }
}

/** GET /exame/meus — histórico de análises de exame do usuário logado. */
export async function listarMeusExames(token: string): Promise<ExameAnaliseOut[]> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/exame/meus`, { headers: { ...auth(token) } });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resp.ok) throw new ApiError(await lerErro(resp));
  return (await resp.json()) as ExameAnaliseOut[];
}
