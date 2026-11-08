import type { Metadata } from "next";
import ProtegerRota from "@/components/ProtegerRota";
import TrocarSenhaCliente from "@/components/TrocarSenhaCliente";

export const metadata: Metadata = {
  title: "Trocar senha — Zela",
  description: "Altere a senha da sua conta Zela.",
};

export default function PaginaTrocarSenha() {
  return (
    <ProtegerRota>
      <TrocarSenhaCliente />
    </ProtegerRota>
  );
}
