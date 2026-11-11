import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import estilos from "./sobre.module.css";
import { IconeSeta } from "@/components/Icones";

export const metadata: Metadata = {
  title: "Sobre a Zela",
  description:
    "A Zela é uma solução CitizenTech de triagem e orientação em saúde para comunidades, construída para a Global Solution 2026 da FIAP.",
};

export default function PaginaSobre() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <h1>Saúde que chega primeiro a quem mais precisa</h1>
          <p className={estilos.subtitulo}>
            A Zela nasce para encurtar a distância entre sentir um sintoma e
            saber o que fazer. Especialmente para quem enfrenta fila, falta de
            acesso e pouca informação.
          </p>
        </div>
      </section>

      <section className="secao">
        <div className={`container ${estilos.duas}`}>
          <div>
            <h2 className={estilos.h2}>Esperar sem saber é perigoso</h2>
            <p className={estilos.paragrafo}>
              Muita gente espera meses por uma consulta sem saber se o caso é
              simples ou grave. Sem orientação, um problema pequeno vira
              emergência, e quem tem menos acesso é quem mais perde.
            </p>
            <p className={estilos.paragrafo}>
              Num sistema de saúde sobrecarregado, macas se acumulam nos
              corredores e cada minuto é disputado. No meio disso, a pessoa fica
              sem saber a quem recorrer: pergunta ao vizinho, pesquisa na
              internet e segue sem uma resposta em que possa confiar.
            </p>
            <p className={estilos.paragrafo}>
              A dúvida também paralisa. Com medo de incomodar à toa ou de perder
              um dia inteiro numa fila, muita gente adia e deixa o corpo decidir
              sozinho a hora de buscar ajuda.
            </p>
            <p className={estilos.paragrafo}>
              A Zela organiza esse caminho: ouve a pessoa onde ela está, avalia
              o risco e aponta o próximo passo. Assim, a fila deixa de ser por
              ordem de chegada e passa a ser por gravidade.
            </p>
          </div>

          <figure className={estilos.foto}>
            <Image
              src="/sobre/regina.jpg"
              alt="Moradora de comunidade sorrindo no quintal de casa"
              fill
              sizes="(max-width: 900px) 100vw, 40vw"
              style={{ objectFit: "cover" }}
            />
          </figure>
        </div>
      </section>

      <section className={`secao ${estilos.compromissos}`}>
        <div className="container">
          <div className="secao__titulo">
            <span className="sobrelinha">Compromissos</span>
            <h2>Princípios que guiam a Zela</h2>
          </div>
          <div className={estilos.valores}>
            <div className={estilos.valor}>
              <h3>Acesso antes de tudo</h3>
              <p>
                Não exige smartphone de última geração, internet rápida nem
                saber ler. Voz e foto são suficientes.
              </p>
            </div>
            <div className={estilos.valor}>
              <h3>A IA orienta, não decide</h3>
              <p>
                A inteligência artificial prioriza e explica. O diagnóstico e a
                prescrição são sempre de um profissional de saúde.
              </p>
            </div>
            <div className={estilos.valor}>
              <h3>Privacidade por princípio</h3>
              <p>
                Dado de saúde é sensível. Fica protegido, só a própria pessoa
                acessa a sua ficha e nada é guardado sem o seu consentimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="secao secao--suave">
        <div className="container">
          <div className={estilos.cta}>
            <h2>Experimente a triagem da Zela</h2>
            <p>Leva menos de um minuto e pode apontar o caminho certo.</p>
            <Link href="/triagem" className="botao botao--primario">
              Fazer minha triagem
              <IconeSeta width={18} height={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
