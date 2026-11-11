// Camada de serviços: todas as chamadas à API de IA (ia/) passam por aqui.

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
  Canal,
  Usuario,
} from "./tipos";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/** Erro amigável quando a API não responde ou retorna status de erro. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const MSG_OFFLINE =
  "Não foi possível falar com o serviço da Zela agora. Verifique sua conexão e tente de novo em instantes.";

async function lerErro(resposta: Response): Promise<string> {
  try {
    const dado = await resposta.json();
    const detail = dado?.detail;
    if (typeof detail === "string") return detail;
    // 422 do Pydantic: lista de erros { msg, loc }.
    if (Array.isArray(detail) && detail.length > 0) {
      const msg = detail[0]?.msg ?? "Dados inválidos.";
      return String(msg).replace(/^Value error,\s*/i, "");
    }
  } catch {
    /* corpo não era JSON */
  }
  return `Falha ao processar (código ${resposta.status}).`;
}

function autorizacao(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --------------------------------------------------------------- Autenticação

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
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as RespostaAuth;
}

export async function login(usuarioLogin: string, senha: string): Promise<RespostaAuth> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: usuarioLogin, senha }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as RespostaAuth;
}

export async function obterMe(token: string): Promise<Usuario> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...autorizacao(token) },
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as Usuario;
}

/** POST /auth/recuperar — dispara o e-mail de redefinição (resposta genérica). */
export async function recuperarSenha(login: string): Promise<{ mensagem: string }> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/recuperar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as { mensagem: string };
}

/** POST /auth/redefinir — confirma a nova senha com o token do e-mail. */
export async function redefinirSenha(
  token: string,
  senha: string,
  confirmarSenha: string,
): Promise<RespostaAuth> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/redefinir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha, confirmar_senha: confirmarSenha }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as RespostaAuth;
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
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as Usuario;
}

/** POST /auth/trocar-senha — troca a senha do usuário logado (senha atual → nova). */
export async function trocarSenha(
  token: string,
  senhaAtual: string,
  senha: string,
  confirmarSenha: string,
): Promise<{ mensagem: string }> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/auth/trocar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify({
        senha_atual: senhaAtual,
        senha,
        confirmar_senha: confirmarSenha,
      }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as { mensagem: string };
}

// ----------------------------------------------------------------- Ficha médica

/** GET /ficha — ficha médica do usuário logado (ou null se nunca preencheu). */
export async function obterFicha(token: string): Promise<FichaMedica | null> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/ficha`, { headers: { ...autorizacao(token) } });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  const corpo = await resposta.json();
  return corpo as FichaMedica | null;
}

/** PUT /ficha — cria/atualiza a ficha médica do usuário logado. */
export async function salvarFicha(
  token: string,
  dados: DadosFicha,
): Promise<FichaMedica> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/ficha`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify({ dados }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as FichaMedica;
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
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resposta.ok) return null;
    const j = await resposta.json();
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

export interface EntradaTriagem {
  sintomas: string;
  idade?: number | null;
  canal?: Canal;
}

export interface OpcoesTriagem {
  /** Token do usuário logado — vincula a triagem à conta. */
  token?: string | null;
  /** Triagem de urgência (convidado): CPF informado sem login. */
  cpfInformado?: string | null;
}

/** POST /triagens — classifica o risco e já abre o encaminhamento certo.
 *  Com `token`, a triagem fica vinculada ao usuário logado. Com `cpfInformado`
 *  (urgência, sem login), o caso é vinculado depois, quando o dono do CPF logar. */
export async function enviarTriagem(
  entrada: EntradaTriagem,
  opcoes: OpcoesTriagem = {},
): Promise<Triagem> {
  const { token, cpfInformado } = opcoes;
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/triagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify({
        sintomas: entrada.sintomas,
        idade: entrada.idade ?? null,
        canal: entrada.canal ?? "app",
        cpf_informado: cpfInformado ?? null,
      }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as Triagem;
}

export interface OpcoesConversa {
  idade?: number | null;
  canal?: Canal;
  token?: string | null;
  cpfInformado?: string | null;
  /** Descrição da análise de imagem, quando a conversa começou por foto. */
  contextoFoto?: string | null;
}

/** POST /triagem/conversa — triagem conversacional: a IA pergunta antes de
 *  concluir (senso crítico). Enquanto precisar de contexto, devolve uma pergunta
 *  com sugestões de resposta rápida; ao concluir, devolve a triagem registrada. */
export async function conversarTriagem(
  historico: MensagemConversa[],
  opcoes: OpcoesConversa = {},
): Promise<RespostaConversa> {
  const { idade, canal, token, cpfInformado, contextoFoto } = opcoes;
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/triagem/conversa`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify({
        historico,
        idade: idade ?? null,
        canal: canal ?? "app",
        cpf_informado: cpfInformado ?? null,
        contexto_foto: contextoFoto ?? null,
      }),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as RespostaConversa;
}

/** GET /triagens/minhas — histórico do usuário logado (página Resultados). */
export async function listarMinhasTriagens(token: string): Promise<Triagem[]> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/triagens/minhas`, {
      headers: { ...autorizacao(token) },
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as Triagem[];
}

/** POST /voz/transcrever — transforma o áudio em texto. */
export async function transcreverAudio(
  audio: Blob,
  nomeArquivo = "gravacao.webm",
): Promise<ResultadoTranscricao> {
  const form = new FormData();
  form.append("audio", audio, nomeArquivo);
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/voz/transcrever`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as ResultadoTranscricao;
}

/** POST /voz/falar — gera o áudio (WAV) da fala da Zela com o Piper (offline).
 *  Retorna o áudio, ou null se o Piper não estiver configurado no servidor
 *  (nesse caso o cliente usa a voz do próprio navegador como alternativa). */
export async function falarComPiper(texto: string): Promise<Blob | null> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/voz/falar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
  } catch {
    return null;
  }
  if (!resposta.ok) return null;
  const tipo = resposta.headers.get("content-type") ?? "";
  if (tipo.includes("audio")) return await resposta.blob();
  return null; // resposta JSON = Piper não configurado
}

/** POST /exame/analisar — lê um exame (foto ou PDF) e explica. Exige login. */
export async function analisarExame(
  arquivo: File,
  token: string,
): Promise<ResultadoExame> {
  const form = new FormData();
  form.append("arquivo", arquivo, arquivo.name);
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/exame/analisar`, {
      method: "POST",
      headers: { ...autorizacao(token) },
      body: form,
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as ResultadoExame;
}

/** POST /exame/salvar — guarda no histórico uma análise que a pessoa autorizou. */
export async function salvarExame(
  resultado: ResultadoExame,
  token: string,
): Promise<ExameAnaliseOut> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/exame/salvar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...autorizacao(token) },
      body: JSON.stringify(resultado),
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as ExameAnaliseOut;
}

/** DELETE /exame/{id} — apaga um exame do histórico (revogação, LGPD). */
export async function removerExame(id: number, token: string): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/exame/${id}`, {
      method: "DELETE",
      headers: { ...autorizacao(token) },
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok && resposta.status !== 204) {
    throw new ApiError(await lerErro(resposta));
  }
}

/** GET /exame/meus — histórico de análises de exame do usuário logado. */
export async function listarMeusExames(token: string): Promise<ExameAnaliseOut[]> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/exame/meus`, {
      headers: { ...autorizacao(token) },
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as ExameAnaliseOut[];
}

/** POST /visao/analisar — descreve a foto e estima o risco. */
export async function analisarFoto(foto: File): Promise<ResultadoVisao> {
  const form = new FormData();
  form.append("foto", foto, foto.name);
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/visao/analisar`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(MSG_OFFLINE);
  }
  if (!resposta.ok) throw new ApiError(await lerErro(resposta));
  return (await resposta.json()) as ResultadoVisao;
}
