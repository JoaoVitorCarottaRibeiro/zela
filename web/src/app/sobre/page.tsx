import type { Metadata } from "next";
import Link from "next/link";
import estilos from "./sobre.module.css";
import { IconeSeta } from "@/components/Icones";

export const metadata: Metadata = {
  title: "Sobre a Zela",
  description:
    "A Zela é uma solução CitizenTech de triagem e orientação em saúde para comunidades, construída para a Global Solution 2026 da FIAP.",
};

const ODS = [
  { numero: "3", nome: "Saúde e bem-estar" },
  { numero: "10", nome: "Redução das desigualdades" },
  { numero: "9", nome: "Indústria, inovação e infraestrutura" },
  { numero: "11", nome: "Cidades e comunidades sustentáveis" },
];

export default function PaginaSobre() {
  return (
    <>
      <section className={estilos.topo}>
        <div className={`container ${estilos.topoInterno}`}>
          <span className="sobrelinha">Sobre o projeto</span>
          <h1>Saúde que chega primeiro a quem mais precisa</h1>
          <p className={estilos.subtitulo}>
            A Zela nasce para encurtar a distância entre sentir um sintoma e
            saber o que fazer — especialmente para quem enfrenta fila, falta de
            acesso e pouca informação.
          </p>
        </div>
      </section>

      <section className="secao">
        <div className={`container ${estilos.duas}`}>
          <div>
            <span className="sobrelinha">O problema</span>
            <h2 className={estilos.h2}>Esperar sem saber é perigoso</h2>
            <p className={estilos.paragrafo}>
              Muita gente espera meses por uma consulta sem saber se o caso é
              simples ou grave. Sem orientação, um problema pequeno vira
              emergência — e quem tem menos acesso é quem mais perde.
            </p>
            <p className={estilos.paragrafo}>
              A Zela organiza esse caminho: ouve a pessoa onde ela está, avalia
              o risco e aponta o próximo passo. Assim, a fila deixa de ser por
              ordem de chegada e passa a ser por gravidade.
            </p>
          </div>

          <aside className={estilos.persona}>
            <span className={estilos.personaTag}>Para quem é — exemplo</span>
            <h3 className={estilos.personaNome}>Regina, 53 anos</h3>
            <p className={estilos.personaTexto}>
              Mora em Vila Andrade, São Paulo. Está na fila do SUS há meses, sem
              previsão de atendimento. Quando sente algo, não sabe se espera ou
              se procura ajuda. Com a Zela, ela conta o sintoma por voz e recebe
              uma orientação clara — e, se for urgente, é priorizada.
            </p>
            <p className={estilos.personaNota}>
              Persona ilustrativa. A Zela usa apenas dados fictícios e públicos.
            </p>
          </aside>
        </div>
      </section>

      <section className="secao secao--suave">
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
                A inteligência artificial prioriza e explica — o diagnóstico e a
                prescrição são sempre de um profissional de saúde.
              </p>
            </div>
            <div className={estilos.valor}>
              <h3>Privacidade e dados mínimos</h3>
              <p>
                Coletamos apenas o necessário para orientar. No projeto, todos
                os dados são fictícios.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="container">
          <div className="secao__titulo">
            <span className="sobrelinha">Agenda 2030</span>
            <h2>Objetivos de Desenvolvimento Sustentável</h2>
          </div>
          <div className={estilos.ods}>
            {ODS.map(({ numero, nome }) => (
              <div key={numero} className={estilos.odsItem}>
                <span className={estilos.odsNumero}>{numero}</span>
                <span className={estilos.odsNome}>{nome}</span>
              </div>
            ))}
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
