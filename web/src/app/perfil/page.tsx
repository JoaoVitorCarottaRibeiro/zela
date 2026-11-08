import type { Metadata } from "next";
import ProtegerRota from "@/components/ProtegerRota";
import PerfilCliente from "@/components/PerfilCliente";

export const metadata: Metadata = {
  title: "Meu perfil — Zela",
  description: "Veja e edite seus dados na Zela.",
};

export default function PaginaPerfil() {
  return (
    <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 64px)" }}>
      <ProtegerRota>
        <PerfilCliente />
      </ProtegerRota>
    </section>
  );
}
