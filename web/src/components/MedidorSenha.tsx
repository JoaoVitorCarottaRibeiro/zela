"use client";

import estilos from "./FormAuth.module.css";

// Critérios da senha: 6+ caracteres, maiúscula, número e caractere especial.
const CRITERIOS = [
  (s: string) => s.length >= 6,
  (s: string) => /[A-Z]/.test(s),
  (s: string) => /\d/.test(s),
  (s: string) => /[^A-Za-z0-9]/.test(s),
];

export function forcaSenha(s: string): number {
  return CRITERIOS.reduce((n, ok) => n + (ok(s) ? 1 : 0), 0);
}

export function senhaValida(s: string): boolean {
  return CRITERIOS.every((ok) => ok(s));
}

// Tons de azul, do mais claro (fraca) ao mais escuro (forte).
const NIVEIS = [
  { rotulo: "fraca", cor: "#7fc2ef" },
  { rotulo: "média", cor: "#3da0e8" },
  { rotulo: "boa", cor: "#2180c4" },
  { rotulo: "forte", cor: "#15639e" },
];

function nivelSenha(n: number) {
  return NIVEIS[Math.min(NIVEIS.length, Math.max(1, n)) - 1];
}

/** Barra de força da senha. Só aparece quando há algo digitado. */
export default function MedidorSenha({ senha }: { senha: string }) {
  if (!senha) return null;
  const n = forcaSenha(senha);
  const nivel = nivelSenha(n);
  return (
    <div className={estilos.forca}>
      <div className={estilos.forcaBarras}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={estilos.forcaSeg}
            style={i < n ? { backgroundColor: nivel.cor } : undefined}
          />
        ))}
      </div>
      <span className={estilos.forcaRotulo} style={{ color: nivel.cor }}>
        Senha {nivel.rotulo}
      </span>
    </div>
  );
}
