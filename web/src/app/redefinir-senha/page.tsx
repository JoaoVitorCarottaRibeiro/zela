"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ApiError, redefinirSenha } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import MedidorSenha, { senhaValida } from "@/components/MedidorSenha";
import estilos from "@/components/FormAuth.module.css";

export default function PaginaRedefinirSenha() {
  const router = useRouter();
  const { definirSessao } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  // Lê o token da URL sem useSearchParams (evita exigir <Suspense>).
  useEffect(() => {
    try {
      setToken(new URLSearchParams(window.location.search).get("token"));
    } catch {
      setToken(null);
    }
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!senhaValida(senha)) {
      setErro("A senha precisa de 6+ caracteres, com maiúscula, número e símbolo.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }
    if (!token) {
      setErro("Link inválido. Peça a recuperação novamente.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await redefinirSenha(token, senha, confirmar);
      definirSessao(resposta);
      setOk(true);
      setTimeout(() => router.push("/triagem"), 1200);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.");
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
          <h1 className={estilos.titulo}>Criar nova senha</h1>
          <p className={estilos.subtitulo}>
            Escolha uma senha nova para a sua conta.
          </p>
        </div>

        {ok ? (
          <div className={estilos.sucesso}>
            Senha redefinida. Entrando na sua conta…
          </div>
        ) : token === null ? (
          <>
            <div className={estilos.erro}>
              Link inválido ou expirado. Peça a recuperação novamente.
            </div>
            <p className={estilos.rodape}>
              <Link href="/recuperar-senha">Recuperar senha</Link>
            </p>
          </>
        ) : (
          <form className={estilos.form} onSubmit={enviar} noValidate>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="senha">
                Nova senha
              </label>
              <input
                id="senha"
                className={estilos.input}
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <MedidorSenha senha={senha} />
            </div>

            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="confirmar">
                Confirmar nova senha
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

            <button
              type="submit"
              className={`botao botao--primario ${estilos.enviar}`}
              disabled={enviando}
            >
              {enviando ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
