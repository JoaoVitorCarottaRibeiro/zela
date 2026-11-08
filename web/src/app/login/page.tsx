"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { destinoAposEntrar } from "@/lib/navegacao";
import estilos from "@/components/FormAuth.module.css";

export default function PaginaLogin() {
  const router = useRouter();
  const { entrar } = useAuth();

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!identificador.trim() || !senha) {
      setErro("Informe seu CPF ou e-mail e a senha.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await entrar(identificador.trim(), senha);
      router.push(destinoAposEntrar());
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível entrar.");
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
          <h1 className={estilos.titulo}>Entrar</h1>
        </div>

        <form className={estilos.form} onSubmit={enviar} noValidate>
          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="identificador">
              CPF ou e-mail
            </label>
            <input
              id="identificador"
              className={estilos.input}
              type="text"
              autoComplete="username"
              placeholder="CPF ou e-mail"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
            />
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              className={estilos.input}
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <div className={estilos.esqueciLinha}>
              <Link href="/recuperar-senha" className={estilos.esqueci}>
                Esqueci minha senha
              </Link>
            </div>
          </div>

          {erro && <div className={estilos.erro}>{erro}</div>}

          <button
            type="submit"
            className={`botao botao--primario ${estilos.enviar}`}
            disabled={enviando}
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className={estilos.urgenciaBloco}>
          <Link href="/urgencia" className={estilos.urgencia}>
            Urgência
          </Link>
          <p className={estilos.urgenciaAjuda}>
            Botão dedicado a urgências, utilize-o somente quando necessário.
          </p>
        </div>

        <p className={estilos.rodape}>
          Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
