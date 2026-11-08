// Estrutura do questionário da ficha médica (seções 1 a 7 do documento de
// referência). Uma única definição alimenta o formulário E o PDF, evitando
// divergência entre o que se preenche e o que se exporta.

export type Respostas = Record<string, unknown>;

export type TipoCampo =
  | "checkboxes"
  | "radio"
  | "texto"
  | "textarea"
  | "medicamentos"
  | "consent";

export interface CampoFicha {
  id: string;
  tipo: TipoCampo;
  rotulo: string;
  opcoes?: readonly string[];
  placeholder?: string;
  /** Só aparece quando a condição for verdadeira (campos de detalhe/condicionais). */
  mostrarSe?: (r: Respostas) => boolean;
}

export interface SecaoFicha {
  id: string;
  titulo: string;
  descricao?: string;
  campos: CampoFicha[];
}

export interface Medicamento {
  nome: string;
  dosagem: string;
  frequencia: string;
  motivo: string;
}

const temEmergencia = (r: Respostas): boolean => {
  const v = (r.sinais_emergencia as string[]) ?? [];
  return v.length > 0 && !v.includes("Nenhuma dessas situações");
};

export const SECOES: SecaoFicha[] = [
  {
    id: "emergencia",
    titulo: "1. Sinais de emergência",
    descricao:
      "Antes de tudo, verifique se você apresenta alguma destas situações agora.",
    campos: [
      {
        id: "sinais_emergencia",
        tipo: "checkboxes",
        rotulo: "Você está apresentando alguma destas situações?",
        opcoes: [
          "Dor ou pressão intensa no peito",
          "Dificuldade intensa para respirar",
          "Desmaio ou perda de consciência",
          "Dificuldade súbita para falar ou movimentar parte do corpo",
          "Convulsão em andamento",
          "Possível reação alérgica grave",
          "Sangramento intenso",
          "Nenhuma dessas situações",
        ],
      },
    ],
  },
  {
    id: "historico",
    titulo: "2. Histórico médico",
    campos: [
      {
        id: "condicoes",
        tipo: "checkboxes",
        rotulo: "2.1. Você possui alguma doença ou condição médica diagnosticada?",
        opcoes: [
          "Diabetes",
          "Hipertensão (pressão alta)",
          "Problemas cardíacos",
          "Problemas respiratórios (asma, bronquite etc.)",
          "Problemas renais",
          "Problemas hepáticos",
          "Doenças neurológicas",
          "Doenças autoimunes",
          "Câncer ou histórico de câncer",
          "Problemas de tireoide",
          "Nenhuma das opções",
          "Outra condição",
        ],
      },
      {
        id: "condicao_outra",
        tipo: "texto",
        rotulo: "Se marcou “Outra condição”, descreva:",
        mostrarSe: (r) => ((r.condicoes as string[]) ?? []).includes("Outra condição"),
      },
      {
        id: "doenca_cronica",
        tipo: "radio",
        rotulo: "2.2. Você possui alguma doença crônica?",
        opcoes: ["Sim", "Não", "Não sei informar"],
      },
      {
        id: "cirurgia",
        tipo: "radio",
        rotulo: "2.3. Já passou por alguma cirurgia ou internação hospitalar?",
        opcoes: ["Sim", "Não"],
      },
      {
        id: "cirurgia_detalhe",
        tipo: "textarea",
        rotulo: "Qual foi a cirurgia ou o motivo da internação e quando aconteceu?",
        mostrarSe: (r) => r.cirurgia === "Sim",
      },
      {
        id: "historico_familiar",
        tipo: "checkboxes",
        rotulo: "2.4. Possui histórico familiar de doenças importantes?",
        opcoes: [
          "Diabetes",
          "Hipertensão",
          "Doenças cardíacas",
          "Câncer",
          "AVC",
          "Doenças hereditárias",
          "Não conheço o histórico familiar",
          "Nenhuma das opções",
        ],
      },
    ],
  },
  {
    id: "medicamentos_alergias",
    titulo: "3. Medicamentos e alergias",
    campos: [
      {
        id: "usa_medicamentos",
        tipo: "radio",
        rotulo: "3.1. Você utiliza algum medicamento atualmente?",
        opcoes: ["Sim", "Não"],
      },
      {
        id: "medicamentos",
        tipo: "medicamentos",
        rotulo: "Informe cada medicamento (nome, dosagem, frequência e motivo):",
        mostrarSe: (r) => r.usa_medicamentos === "Sim",
      },
      {
        id: "alergias",
        tipo: "checkboxes",
        rotulo: "3.2. Possui alguma alergia conhecida?",
        opcoes: [
          "Medicamentos",
          "Alimentos",
          "Picadas de insetos",
          "Látex",
          "Produtos químicos",
          "Outra",
          "Não possuo alergias conhecidas",
          "Não sei informar",
        ],
      },
      {
        id: "alergia_detalhe",
        tipo: "textarea",
        rotulo: "Se houver alergia, informe a substância e a reação que costuma apresentar:",
        mostrarSe: (r) => {
          const v = (r.alergias as string[]) ?? [];
          return v.some(
            (a) => a !== "Não possuo alergias conhecidas" && a !== "Não sei informar",
          );
        },
      },
      {
        id: "reacao_alergica_grave",
        tipo: "radio",
        rotulo: "3.3. Já teve alguma reação alérgica grave?",
        opcoes: ["Sim", "Não", "Não sei informar"],
      },
    ],
  },
  {
    id: "complementar",
    titulo: "4. Histórico clínico complementar",
    campos: [
      {
        id: "problemas_previos",
        tipo: "checkboxes",
        rotulo: "4.1. Você já teve algum dos seguintes problemas?",
        opcoes: [
          "Convulsões",
          "Desmaios recorrentes",
          "Trombose",
          "AVC",
          "Infarto",
          "Hemorragias",
          "Reações graves a medicamentos",
          "Nenhum dos anteriores",
        ],
      },
      {
        id: "em_tratamento",
        tipo: "radio",
        rotulo: "4.2. Você está realizando algum tratamento médico atualmente?",
        opcoes: ["Sim", "Não"],
      },
      {
        id: "tratamento_detalhe",
        tipo: "texto",
        rotulo: "Qual tratamento?",
        mostrarSe: (r) => r.em_tratamento === "Sim",
      },
      {
        id: "gravidez",
        tipo: "radio",
        rotulo: "4.3. Você está grávida ou existe possibilidade de gravidez?",
        opcoes: ["Sim", "Não", "Não se aplica", "Prefiro não informar"],
      },
    ],
  },
  {
    id: "habitos",
    titulo: "5. Hábitos e estilo de vida",
    campos: [
      {
        id: "fumo",
        tipo: "radio",
        rotulo: "5.1. Você fuma ou utiliza produtos com nicotina?",
        opcoes: [
          "Nunca utilizei",
          "Utilizo atualmente",
          "Já utilizei, mas parei",
          "Prefiro não informar",
        ],
      },
      {
        id: "alcool",
        tipo: "radio",
        rotulo: "5.2. Consome bebidas alcoólicas?",
        opcoes: ["Nunca", "Ocasionalmente", "Frequentemente", "Prefiro não informar"],
      },
      {
        id: "sono",
        tipo: "radio",
        rotulo: "5.3. Como você classificaria sua qualidade de sono?",
        opcoes: ["Muito boa", "Boa", "Regular", "Ruim"],
      },
      {
        id: "atividade_fisica",
        tipo: "radio",
        rotulo: "5.4. Como é seu nível de atividade física?",
        opcoes: ["Sedentário", "Leve", "Moderado", "Intenso"],
      },
      {
        id: "restricao_alimentar",
        tipo: "radio",
        rotulo: "5.5. Possui alguma restrição alimentar relevante?",
        opcoes: ["Sim", "Não"],
      },
      {
        id: "restricao_detalhe",
        tipo: "texto",
        rotulo: "Qual restrição?",
        mostrarSe: (r) => r.restricao_alimentar === "Sim",
      },
    ],
  },
  {
    id: "adicionais",
    titulo: "6. Informações adicionais",
    campos: [
      {
        id: "info_adicional",
        tipo: "textarea",
        rotulo:
          "6.1. Existe alguma informação sobre sua saúde que considera importante compartilhar?",
      },
      {
        id: "exame_recente",
        tipo: "radio",
        rotulo: "6.2. Você possui algum diagnóstico ou exame recente que gostaria de informar?",
        opcoes: ["Sim", "Não"],
      },
      {
        id: "exame_detalhe",
        tipo: "textarea",
        rotulo: "Descreva o exame/diagnóstico (não envie documentos de terceiros):",
        mostrarSe: (r) => r.exame_recente === "Sim",
      },
    ],
  },
  {
    id: "consentimento",
    titulo: "7. Consentimento e privacidade",
    descricao:
      "Dados de saúde são dados pessoais sensíveis e tratados conforme a LGPD, apenas para a finalidade de triagem.",
    campos: [
      {
        id: "consent_veracidade",
        tipo: "consent",
        rotulo: "As informações são verdadeiras conforme meu conhecimento.",
      },
      {
        id: "consent_lgpd",
        tipo: "consent",
        rotulo:
          "Autorizo o tratamento dos meus dados pessoais e dados de saúde para a finalidade de triagem.",
      },
      {
        id: "consent_ia",
        tipo: "consent",
        rotulo:
          "Estou ciente de que a IA não substitui um profissional de saúde ou diagnóstico médico.",
      },
    ],
  },
];

/** Consentimentos obrigatórios para salvar a ficha. */
export const CONSENTIMENTOS = ["consent_veracidade", "consent_lgpd", "consent_ia"];

export { temEmergencia };
