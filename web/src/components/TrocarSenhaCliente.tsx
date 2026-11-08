"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, recuperarSenha, trocarSenha } from "@/lib/api";
import MedidorSenha, { senhaValida } from "@/components/MedidorSenha";
import estilos from "@/components/FormAuth.module.css";

export default function TrocarSenhaCliente() {
  const { usuario, token } = useAuth();

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Atalho "não lembro a senha atual" (reusa o fluxo por e-mail).
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  if (!usuario) return null;

  function validar(): string | null {
    if (!atual) return "Informe sua senha atual.";
    if (!senhaValida(nova))
      return "A nova senha precisa de 6+ caracteres, com maiúscula, número e símbolo.";
    if (nova !== confirmar) return "As senhas não conferem.";
    if (nova === atual) return "A nova senha deve ser diferente da atual.";
    return null;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      setSucesso(null);
      return;
    }
    if (!token) return;
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    try {
      const r = await trocarSenha(token, atual, nova, confirmar);
      setSucesso(r.mensagem);
      setAtual("");
      setNova("");
      setConfirmar("");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarLinkEmail() {
    if (!usuario?.email) return;
    setEnviandoEmail(true);
    setAvisoEmail(null);
    try {
      await recuperarSenha(usuario.email);
    } catch {
      /* resposta é genérica de qualquer forma */
    }
    setEnviandoEmail(false);
    setAvisoEmail(
      "Enviamos um link para o seu e-mail cadastrado. Verifique sua caixa de entrada.",
    );
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cartao}>
        <div className={estilos.topo}>
          <h1 className={estilos.titulo}>Trocar senha</h1>
          <p className={estilos.subtitulo}>
            Para sua segurança, confirme a senha atual antes de definir a nova.
          </p>
        </div>

        <form className={estilos.form} onSubmit={enviar} noValidate>
          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="atual">
              Senha atual <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="atual"
              className={estilos.input}
              type="password"
              autoComplete="current-password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
            />
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="nova">
              Nova senha <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="nova"
              className={estilos.input}
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
            />
            <MedidorSenha senha={nova} />
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="confirmar">
              Confirmar nova senha <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="confirmar"
              className={estilos.input}
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>

          {erro && <div className={estilos.erro}>{erro}</div>}
          {sucesso && <div className={estilos.sucesso}>{sucesso}</div>}

          <button
            type="submit"
            className={`botao botao--primario ${estilos.enviar}`}
            disabled={enviando}
          >
            {enviando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>

        <div className={estilos.urgenciaBloco}>
          {usuario.email ? (
            avisoEmail ? (
              <p className={estilos.sucesso}>{avisoEmail}</p>
            ) : (
              <>
                <p className={estilos.urgenciaAjuda} style={{ marginTop: 0 }}>
                  Não lembra a sua senha atual?
                </p>
                <button
                  type="button"
                  className={`botao botao--contorno ${estilos.enviar}`}
                  onClick={enviarLinkEmail}
                  disabled={enviandoEmail}
                >
                  {enviandoEmail ? "Enviando…" : "Enviar link por e-mail"}
                </button>
              </>
            )
          ) : (
            <p className={estilos.urgenciaAjuda} style={{ marginTop: 0 }}>
              Não lembra a sua senha atual? Como você não tem e-mail cadastrado,
              procure a unidade de saúde mais próxima para recuperar o acesso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
