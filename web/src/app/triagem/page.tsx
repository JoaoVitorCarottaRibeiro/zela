import type { Metadata } from "next";
import TriagemCliente from "@/components/triagem/TriagemCliente";
import SaudacaoTriagem from "@/components/triagem/SaudacaoTriagem";
import ProtegerRota from "@/components/ProtegerRota";
import estilos from "./triagem.module.css";

export const metadata: Metadata = {
  title: "Fazer triagem — Zela",
  description:
    "Conte seus sintomas por texto, voz ou foto e receba uma orientação de saúde com o próximo passo certo.",
};

export default function PaginaTriagem() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <SaudacaoTriagem />
          <span className="sobrelinha">Triagem Zela</span>
          <h1>Vamos entender o que você está sentindo</h1>
          <p className={estilos.subtitulo}>
            Escolha falar, escrever ou enviar uma foto. Em segundos você recebe
            uma orientação clara e o próximo passo.
          </p>
        </div>
      </section>

      <section className={estilos.corpo}>
        <div className="container">
          <ProtegerRota>
            <TriagemCliente />
          </ProtegerRota>
        </div>
      </section>
    </>
  );
}
