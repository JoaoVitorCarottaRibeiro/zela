import type { Metadata } from "next";
import ProtegerRota from "@/components/ProtegerRota";
import FichaMedicaCliente from "@/components/FichaMedicaCliente";

export const metadata: Metadata = {
  title: "Ficha médica — Zela",
  description:
    "Preencha sua ficha médica de pré-atendimento para a Zela contextualizar melhor a sua triagem.",
};

export default function PaginaFichaMedica() {
  return (
    <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 64px)" }}>
      <ProtegerRota>
        <FichaMedicaCliente />
      </ProtegerRota>
    </section>
  );
}
