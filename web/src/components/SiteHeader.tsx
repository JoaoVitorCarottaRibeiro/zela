"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import estilos from "./SiteHeader.module.css";

const LINKS_DESLOGADO = [
  { href: "/", rotulo: "Início" },
  { href: "/sobre", rotulo: "Sobre a Zela" },
];

// Logado: sem "Início" e "Sobre a Zela" — só o que é dele.
const LINKS_LOGADO = [
  { href: "/ficha-medica", rotulo: "Ficha médica" },
  { href: "/triagem", rotulo: "Minha triagem" },
  { href: "/resultados", rotulo: "Resultados" },
  { href: "/mapa", rotulo: "Mapa" },
];

/** Iniciais do nome (primeira + última palavra), ex.: "Maria de Fatima" -> "MF". */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export default function SiteHeader() {
  const caminho = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const refUsuario = useRef<HTMLDivElement>(null);
  const { usuario, sair } = useAuth();

  const links = usuario ? LINKS_LOGADO : LINKS_DESLOGADO;
  const primeiroNome = usuario?.nome_completo.trim().split(" ")[0];

  function fechar() {
    setAberto(false);
    setMenuUsuario(false);
  }

  function aoSair() {
    sair();
    fechar();
    router.push("/");
  }

  // Fecha o menu do usuário ao clicar fora.
  useEffect(() => {
    if (!menuUsuario) return;
    function aoClicarFora(e: MouseEvent) {
      if (refUsuario.current && !refUsuario.current.contains(e.target as Node)) {
        setMenuUsuario(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [menuUsuario]);

  return (
    <header className={estilos.cabecalho}>
      <div className={`container ${estilos.barra}`}>
        <Link
          href={usuario ? "/triagem" : "/"}
          className={estilos.marca}
          aria-label={usuario ? "Zela — minha triagem" : "Zela — página inicial"}
          onClick={fechar}
        >
          <Image
            src="/brand/zela-simbolo.png"
            alt=""
            width={38}
            height={38}
            className={estilos.simbolo}
            priority
          />
          <span className={estilos.nome}>Zela</span>
        </Link>

        <nav
          className={`${estilos.nav} ${aberto ? estilos.navAberta : ""}`}
          aria-label="Navegação principal"
        >
          {links.map((link) => {
            const ativo =
              link.href === "/" ? caminho === "/" : caminho.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${estilos.link} ${ativo ? estilos.linkAtivo : ""}`}
                onClick={fechar}
              >
                {link.rotulo}
              </Link>
            );
          })}

          {usuario ? (
            <div className={estilos.usuario} ref={refUsuario}>
              <button
                type="button"
                className={estilos.avatar}
                aria-label="Abrir menu da conta"
                aria-expanded={menuUsuario}
                onClick={() => setMenuUsuario((v) => !v)}
              >
                {iniciais(usuario.nome_completo)}
              </button>

              <div
                className={`${estilos.menu} ${menuUsuario ? estilos.menuAberto : ""}`}
                role="menu"
              >
                <p className={estilos.menuNome}>{primeiroNome}</p>
                <Link
                  href="/perfil"
                  className={estilos.menuItem}
                  onClick={fechar}
                  role="menuitem"
                >
                  Ver perfil
                </Link>
                <Link
                  href="/trocar-senha"
                  className={estilos.menuItem}
                  onClick={fechar}
                  role="menuitem"
                >
                  Trocar senha
                </Link>
                <button
                  type="button"
                  className={`${estilos.menuItem} ${estilos.menuSair}`}
                  onClick={aoSair}
                  role="menuitem"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className={estilos.acoes}>
              <Link
                href="/login"
                className={`botao botao--contorno ${estilos.cta}`}
                onClick={fechar}
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className={`botao botao--primario ${estilos.cta}`}
                onClick={fechar}
              >
                Criar conta
              </Link>
            </div>
          )}
        </nav>

        <button
          type="button"
          className={estilos.menuBotao}
          aria-expanded={aberto}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setAberto((v) => !v)}
        >
          <span className={estilos.menuBarra} />
          <span className={estilos.menuBarra} />
          <span className={estilos.menuBarra} />
        </button>
      </div>
    </header>
  );
}
