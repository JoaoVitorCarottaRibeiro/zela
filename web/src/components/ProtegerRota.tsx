"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import estilos from "./ProtegerRota.module.css";

/** Só renderiza o conteúdo se houver usuário logado.
 *  Caso contrário, manda para /login guardando a rota de destino. */
export default function ProtegerRota({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const caminho = usePathname();

  useEffect(() => {
    if (!carregando && !usuario) {
      router.replace(`/login?next=${encodeURIComponent(caminho)}`);
    }
  }, [carregando, usuario, caminho, router]);

  if (carregando || !usuario) {
    return (
      <div className={estilos.espera}>
        <span className={estilos.spinner} aria-hidden />
        <p>{carregando ? "Carregando…" : "Redirecionando para o login…"}</p>
      </div>
    );
  }

  return <>{children}</>;
}
