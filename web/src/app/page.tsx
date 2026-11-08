import Link from "next/link";
import estilos from "./page.module.css";
import HeroArte from "@/components/HeroArte";
import {
  IconeTexto,
  IconeVoz,
  IconeFoto,
  IconeOuvido,
  IconeRede,
  IconeRelogio,
  IconeEscudo,
  IconeSeta,
} from "@/components/Icones";

const CANAIS = [
  {
    Icone: IconeTexto,
    titulo: "Conversa por texto",
    texto:
      "Descreva o que está sentindo com suas palavras e receba uma orientação clara em segundos.",
  },
  {
    Icone: IconeVoz,
    titulo: "Fala e escuta",
    texto:
      "Prefere falar? A Zela ouve seus sintomas e responde em voz — sem precisar digitar.",
  },
  {
    Icone: IconeFoto,
    titulo: "Foto de ferida ou receita",
    texto:
      "Envie uma imagem de uma lesão, mancha ou receita e entenda o nível de atenção necessário.",
  },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Conte o que sente",
    texto: "Por texto, voz ou foto. Do seu jeito, na sua língua.",
  },
  {
    numero: "2",
    titulo: "A Zela avalia o risco",
    texto:
      "A IA classifica em verde, amarelo ou vermelho e explica o porquê em linguagem simples.",
  },
  {
    numero: "3",
    titulo: "Receba o próximo passo",
    texto:
      "Cuidar em casa, procurar a UBS ou acionar o socorro. Quem precisa, chega primeiro.",
  },
];

const PRINCIPIOS = [
  {
    Icone: IconeRede,
    titulo: "Não exige internet rápida nem smartphone",
    texto:
      "Funciona em cenários simples — pensado para quem tem menos acesso, não mais.",
  },
  {
    Icone: IconeOuvido,
    titulo: "Para quem não lê ou não digita",
    texto: "A voz é cidadã de primeira classe: falar e ouvir bastam.",
  },
  {
    Icone: IconeRelogio,
    titulo: "Prioriza quem está em risco",
    texto:
      "A triagem organiza a fila pela gravidade, não pela ordem de chegada.",
  },
];

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------- Hero */}
      <section className={estilos.hero}>
        <div className={`container ${estilos.heroGrade}`}>
          <div className={estilos.heroTexto}>
            <span className="sobrelinha">CitizenTech · Saúde da comunidade</span>
            <h1>
              Cuidado em saúde que{" "}
              <span className={estilos.destaque}>começa em você</span>
            </h1>
            <p className={estilos.heroResumo}>
              A Zela faz a triagem dos seus sintomas por texto, voz ou foto e
              mostra o próximo passo certo: cuidar em casa, procurar a UBS ou
              chamar o socorro. Simples, acolhedor e sem fila injusta.
            </p>
            <div className={estilos.heroAcoes}>
              <Link href="/triagem" className="botao botao--primario">
                Fazer minha triagem
                <IconeSeta width={18} height={18} aria-hidden />
              </Link>
              <Link href="#como-funciona" className="botao botao--contorno">
                Como funciona
              </Link>
            </div>
            <p className={estilos.heroNota}>
              A Zela orienta e prioriza — não substitui a avaliação médica.
            </p>
          </div>

          <div className={estilos.heroVisual}>
            <HeroArte />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Canais */}
      <section className="secao">
        <div className="container">
          <div className="secao__titulo">
            <span className="sobrelinha">Três formas de pedir ajuda</span>
            <h2>Escolha o canal mais fácil para você</h2>
            <p>
              A mesma triagem inteligente, por onde for mais confortável. Tudo
              em um só lugar, com a mesma clareza.
            </p>
          </div>
          <div className={estilos.canais}>
            {CANAIS.map(({ Icone, titulo, texto }) => (
              <article key={titulo} className={estilos.canal}>
                <span className={estilos.canalIcone}>
                  <Icone aria-hidden />
                </span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </article>
            ))}
          </div>
          <div className={estilos.canaisAcao}>
            <Link href="/triagem" className="botao botao--primario">
              Começar agora
              <IconeSeta width={18} height={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Como funciona */}
      <section id="como-funciona" className="secao secao--suave">
        <div className="container">
          <div className="secao__titulo">
            <span className="sobrelinha">Como funciona</span>
            <h2>Do sintoma ao próximo passo em três etapas</h2>
          </div>
          <div className={estilos.passos}>
            {PASSOS.map(({ numero, titulo, texto }) => (
              <div key={numero} className={estilos.passo}>
                <span className={estilos.passoNumero}>{numero}</span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Princípios */}
      <section className="secao">
        <div className="container">
          <div className="secao__titulo">
            <span className="sobrelinha">Feita para a comunidade</span>
            <h2>Acesso em primeiro lugar</h2>
          </div>
          <div className={estilos.principios}>
            {PRINCIPIOS.map(({ Icone, titulo, texto }) => (
              <article key={titulo} className={estilos.principio}>
                <span className={estilos.principioIcone}>
                  <Icone aria-hidden />
                </span>
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Ética / CTA */}
      <section className="secao secao--suave">
        <div className="container">
          <div className={estilos.etica}>
            <span className={estilos.eticaIcone}>
              <IconeEscudo aria-hidden />
            </span>
            <h2 className={estilos.eticaTitulo}>
              Tecnologia com responsabilidade
            </h2>
            <p className={estilos.eticaTexto}>
              A Zela usa inteligência artificial para orientar e priorizar — ela
              não diagnostica nem prescreve. Decisões clínicas são sempre de um
              profissional de saúde. Em caso de risco de vida, ligue para o SAMU
              192.
            </p>
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
