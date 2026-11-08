import Link from "next/link";
import type { Metadata } from "next";
import estilos from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Página não encontrada — Zela",
  description: "O endereço que você tentou acessar não existe ou foi movido.",
};

export default function NaoEncontrada() {
  return (
    <section className={estilos.tela}>
      {/* formas geométricas de fundo, no estilo da home */}
      <span className={`${estilos.forma} ${estilos.circulo}`} aria-hidden />
      <span className={`${estilos.forma} ${estilos.anel}`} aria-hidden />
      <span className={`${estilos.forma} ${estilos.bloco}`} aria-hidden />

      <div className={`container ${estilos.conteudo}`}>
        <span className={estilos.numero} aria-hidden>
          404
        </span>
        <span className="sobrelinha">Página não encontrada</span>
        <h1 className={estilos.titulo}>Esta página não existe por aqui</h1>
        <p className={estilos.texto}>
          O endereço que você tentou acessar pode ter sido movido ou digitado de
          forma incorreta. Vamos te levar de volta para um caminho seguro.
        </p>

        <div className={estilos.acoes}>
          <Link href="/" className="botao botao--primario">
            Voltar ao início
          </Link>
          <Link href="/login" className="botao botao--contorno">
            Entrar
          </Link>
        </div>

        <p className={estilos.urgencia}>
          Está passando mal? Faça a triagem agora pela{" "}
          <Link href="/urgencia">urgência</Link>, sem login.
        </p>
      </div>
    </section>
  );
}
