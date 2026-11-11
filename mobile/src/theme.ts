/** Tema da Zela no mobile — mesma identidade do site (#4BB9FA), com fontes
 *  grandes e alvos de toque generosos (acessibilidade para o público). */
export const cores = {
  azul: "#4BB9FA",
  azulEscuro: "#2E9BE6",
  azulProfundo: "#1B6AA6",
  azulTinta: "#12324A",

  tinta: "#12263A",
  texto: "#33414F",
  textoSuave: "#566777", // contraste AA

  fundo: "#FFFFFF",
  fundoSuave: "#F3F9FE",
  linha: "#E3ECF4",
  branco: "#FFFFFF",

  verde: "#1A9E6B",
  verdeSuave: "#E7F6EF",
  amarelo: "#C8871A",
  amareloSuave: "#FBF1DD",
  vermelho: "#D23B4A",
  vermelhoSuave: "#FBE8EA",
};

/** Cor por nível de risco (verde/amarelo/vermelho). */
export const corNivel = {
  verde: cores.verde,
  amarelo: cores.amarelo,
  vermelho: cores.vermelho,
};
export const corNivelSuave = {
  verde: cores.verdeSuave,
  amarelo: cores.amareloSuave,
  vermelho: cores.vermelhoSuave,
};

export const espaco = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const raio = { sm: 10, md: 14, lg: 22, pill: 999 };

/** Fontes grandes por padrão (acessibilidade). */
export const fonte = {
  pequeno: 14,
  base: 17,
  medio: 19,
  grande: 24,
  titulo: 30,
};
