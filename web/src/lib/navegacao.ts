// Para onde mandar o usuário depois de entrar.
//
// Só "voltamos" para páginas de conteúdo. Páginas utilitárias (trocar senha,
// recuperar, etc.) nunca devem ser destino pós-login — se o usuário sair estando
// numa delas, ao voltar ele cai na triagem, não na tela utilitária.

const ROTAS_RETORNO = new Set([
  "/triagem",
  "/resultados",
  "/mapa",
  "/ficha-medica",
  "/perfil",
]);

const PADRAO = "/triagem";

export function destinoAposEntrar(): string {
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && ROTAS_RETORNO.has(next)) return next;
  } catch {
    /* sem window (SSR) ou URL inválida */
  }
  return PADRAO;
}
