import type { Metadata } from "next";
import ExameCliente from "@/components/ExameCliente";
import ProtegerRota from "@/components/ProtegerRota";
import estilos from "./exame.module.css";

export const metadata: Metadata = {
  title: "Entenda seu exame — Zela",
  description:
    "Envie uma foto ou PDF do seu exame e a Zela explica, em palavras simples, o que cada resultado mede e se está dentro da faixa de referência.",
};

export default function PaginaExame() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <span className="sobrelinha">Entenda seu exame</span>
          <h1>Entenda seu exame em palavras simples</h1>
          <p className={estilos.subtitulo}>
            Pegou um exame e ficou sem saber o que significa? Envie uma foto ou
            PDF do resultado. A Zela lê e explica cada item com calma, para você
            chegar mais preparado ao profissional de saúde.
          </p>
        </div>
      </section>

      <section className={estilos.corpo}>
        <div className="container">
          <ProtegerRota>
            <ExameCliente />
          </ProtegerRota>
        </div>
      </section>
    </>
  );
}
