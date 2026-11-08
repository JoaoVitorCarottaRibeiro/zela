import type { Metadata } from "next";
import UrgenciaCliente from "@/components/UrgenciaCliente";

export const metadata: Metadata = {
  title: "Urgência — Zela",
  description:
    "Faça sua triagem agora, sem login. Informe apenas o seu CPF e receba a orientação na hora.",
};

export default function PaginaUrgencia() {
  return <UrgenciaCliente />;
}
