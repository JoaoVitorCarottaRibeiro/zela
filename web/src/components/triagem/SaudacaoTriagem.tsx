"use client";

import { useAuth } from "@/lib/auth";
import estilos from "@/app/triagem/triagem.module.css";

/** Saudação em destaque no topo do hero da triagem ("Olá, {primeiro nome}"). */
export default function SaudacaoTriagem() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome_completo.trim().split(" ")[0];
  if (!primeiroNome) return null;
  return (
    <p className={estilos.ola}>
      Olá, <strong>{primeiroNome}</strong>
    </p>
  );
}
