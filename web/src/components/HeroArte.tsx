import Image from "next/image";
import estilos from "./HeroArte.module.css";

function Cruz({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor" />
    </svg>
  );
}

export default function HeroArte() {
  return (
    <div className={estilos.palco}>
      {/* formas geométricas de fundo */}
      <span className={estilos.circuloGrande} aria-hidden />
      <span className={estilos.anel} aria-hidden />
      <span className={estilos.bloco} aria-hidden />

      {/* foto recortada */}
      <div className={estilos.foto}>
        <Image
          src="/equipe/equipe-1.png"
          alt="Profissional de saúde colocando as luvas"
          fill
          sizes="(max-width: 900px) 90vw, 520px"
          className={estilos.img}
          priority
        />
      </div>

      {/* acentos em "+" por cima */}
      <Cruz className={`${estilos.cruz} ${estilos.cruzA}`} />
      <Cruz className={`${estilos.cruz} ${estilos.cruzB}`} />
      <Cruz className={`${estilos.cruz} ${estilos.cruzC}`} />
      <span className={estilos.pontinho} aria-hidden />
    </div>
  );
}
