"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ApiError, recuperarSenha } from "@/lib/api";
import estilos from "@/components/FormAuth.module.css";

export default function PaginaRecuperarSenha() {
  const [login, setLogin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim()) {
      setErro("Informe seu CPF ou e-mail.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const r = await recuperarSenha(login.trim());
      setMensagem(r.mensagem);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cartao}>
        <div className={estilos.topo}>
          <Image
            src="/brand/zela-simbolo.png"
            alt=""
            width={48}
            height={48}
            className={estilos.simbolo}
          />
          <h1 className={estilos.titulo}>Recuperar senha</h1>
          <p className={estilos.subtitulo}>
            Informe seu CPF ou e-mail. Se houver um e-mail cadastrado, enviamos um
            link para você criar uma nova senha.
          </p>
        </div>

        {mensagem ? (
          <>
            <div className={estilos.sucesso}>{mensagem}</div>
            <p className={estilos.rodape}>
              <Link href="/login">Voltar para o login</Link>
            </p>
          </>
        ) : (
          <>
            <form className={estilos.form} onSubmit={enviar} noValidate>
              <div className={estilos.campo}>
                <label className={estilos.rotulo} htmlFor="login">
                  CPF ou e-mail
                </label>
                <input
                  id="login"
                  className={estilos.input}
                  type="text"
                  autoComplete="username"
                  placeholder="CPF (somente números) ou e-mail"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>

              {erro && <div className={estilos.erro}>{erro}</div>}

              <button
                type="submit"
                className={`botao botao--primario ${estilos.enviar}`}
                disabled={enviando}
              >
                {enviando ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            </form>

            <p className={estilos.rodape}>
              Não tem e-mail cadastrado? Você pode se atender pela{" "}
              <Link href="/urgencia">urgência</Link> e procurar um posto depois.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
