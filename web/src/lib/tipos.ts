// Tipos espelhando os contratos da API de IA (ia/app/schemas.py).

export type Nivel = "verde" | "amarelo" | "vermelho";
export type Canal = "app" | "voz" | "foto" | "totem" | "acs";
export type Destino = "casa" | "ubs" | "telessaude" | "samu";
export type StatusEncaminhamento =
  | "aberto"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface Encaminhamento {
  id: number;
  triagem_id: number;
  destino: Destino;
  status: StatusEncaminhamento;
  observacao: string | null;
  criado_em: string;
}

// Retorno de POST /triagens (triagem persistida + encaminhamento automático).
export interface Triagem {
  id: number;
  cidadao_id: number | null;
  canal: Canal;
  sintomas: string;
  idade_informada: number | null;
  nivel: Nivel;
  orientacao: string;
  justificativa: string | null;
  origem: string;
  criado_em: string;
  encaminhamentos: Encaminhamento[];
}

// Retorno de POST /visao/analisar.
export interface ResultadoVisao {
  descricao: string;
  risco: Nivel;
  origem: string;
}

// Retorno de POST /voz/transcrever.
export interface ResultadoTranscricao {
  texto: string;
  origem: string;
}

// Usuário autenticado (espelha UsuarioOut).
export interface Usuario {
  id: number;
  nome_completo: string;
  data_nascimento: string;
  cpf: string;
  email: string | null;
  genero: string | null;
  identidade_genero: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  complemento: string | null;
  criado_em: string;
}

// Ficha médica (pré-atendimento da IA). `dados` é um objeto estruturado por seção.
export type DadosFicha = Record<string, unknown>;

export interface FichaMedica {
  dados: DadosFicha;
  atualizado_em: string;
}

// Retorno de /auth/cadastro e /auth/login.
export interface RespostaAuth {
  token: string;
  usuario: Usuario;
}
