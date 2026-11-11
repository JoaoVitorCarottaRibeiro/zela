// Tipos espelhando os contratos da API (ia/app/schemas.py) — os mesmos do site.

export type Nivel = "verde" | "amarelo" | "vermelho";
export type Canal = "app" | "voz" | "foto" | "totem" | "acs";
export type Destino = "casa" | "ubs" | "telessaude" | "samu";

export interface Encaminhamento {
  id: number;
  triagem_id: number;
  destino: Destino;
  status: string;
  observacao: string | null;
  criado_em: string;
}

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

export interface MensagemConversa {
  autor: "usuario" | "zela";
  texto: string;
}

export interface RespostaConversa {
  estado: "pergunta" | "concluido";
  pergunta: string | null;
  sugestoes: string[];
  triagem: Triagem | null;
}

export interface ResultadoVisao {
  descricao: string;
  risco: Nivel;
  origem: string;
}

export interface ResultadoTranscricao {
  texto: string;
  origem: string;
}

export interface Usuario {
  id: number;
  nome_completo: string;
  data_nascimento: string;
  cpf: string;
  email: string | null;
  criado_em: string;
}

export interface RespostaAuth {
  token: string;
  usuario: Usuario;
}
