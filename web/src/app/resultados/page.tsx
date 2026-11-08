import type { Metadata } from "next";
import ProtegerRota from "@/components/ProtegerRota";
import ResultadosCliente from "@/components/ResultadosCliente";
import estilos from "./resultados.module.css";

export const metadata: Metadata = {
  title: "Meus resultados — Zela",
  description: "Histórico das suas triagens e orientações na Zela.",
};

export default function PaginaResultados() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <span className="sobrelinha">Seus resultados</span>
          <h1>Histórico das suas triagens</h1>
          <p className={estilos.subtitulo}>
            Veja o que você relatou, o nível de risco e a orientação de cada
            atendimento.
          </p>
        </div>
      </section>

      <section className={estilos.corpo}>
        <div className="container">
          <ProtegerRota>
            <ResultadosCliente />
          </ProtegerRota>
        </div>
      </section>
    </>
  );
}
