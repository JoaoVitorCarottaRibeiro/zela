import type { Metadata } from "next";
import ProtegerRota from "@/components/ProtegerRota";
import MapaCliente from "@/components/MapaCliente";
import estilos from "./mapa.module.css";

export const metadata: Metadata = {
  title: "Mapa — Zela",
  description:
    "Encontre a UPA, UBS ou hospital público mais próximo e veja o tempo até lá.",
};

export default function PaginaMapa() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <span className="sobrelinha">Onde buscar ajuda</span>
          <h1>Unidades de saúde perto de você</h1>
          <p className={estilos.subtitulo}>
            Mostramos as UPAs, UBS e hospitais públicos mais próximos. Escolha um
            no mapa ou na lista para ver o tempo a pé, de carro e de transporte
            público.
          </p>
        </div>
      </section>

      <section className={estilos.corpo}>
        <div className="container">
          <ProtegerRota>
            <MapaCliente />
          </ProtegerRota>
        </div>
      </section>
    </>
  );
}
