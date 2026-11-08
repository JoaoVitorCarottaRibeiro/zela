import Link from "next/link";
import Image from "next/image";
import estilos from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={estilos.rodape}>
      <div className={`container ${estilos.grade}`}>
        <div className={estilos.marcaCol}>
          <div className={estilos.marca}>
            <Image
              src="/brand/zela-simbolo-branco.png"
              alt=""
              width={36}
              height={36}
            />
            <span className={estilos.nome}>Zela</span>
          </div>
          <p className={estilos.sobre}>
            Triagem e orientação em saúde para comunidades. Começa na pessoa —
            por voz, foto ou conversa — e encaminha a um profissional quem
            realmente precisa.
          </p>
        </div>

        <nav className={estilos.col} aria-label="Navegação do rodapé">
          <h4 className={estilos.colTitulo}>Navegação</h4>
          <Link href="/">Início</Link>
          <Link href="/sobre">Sobre a Zela</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/cadastro">Criar conta</Link>
        </nav>

        <div className={estilos.col}>
          <h4 className={estilos.colTitulo}>Emergência</h4>
          <p className={estilos.emergencia}>
            Em risco de vida, ligue para o <strong>SAMU 192</strong> ou procure
            o pronto-socorro mais próximo.
          </p>
        </div>

        <div className={estilos.col}>
          <h4 className={estilos.colTitulo}>Projeto</h4>
          <p className={estilos.nota}>
            Global Solution 2026 · FIAP — Engenharia de Software.
          </p>
          <p className={estilos.nota}>
            Iniciativa CitizenTech. Dados de exemplo e fictícios.
          </p>
        </div>
      </div>

      <div className={estilos.base}>
        <div className={`container ${estilos.baseInterno}`}>
          <span>© {new Date().getFullYear()} Zela</span>
          <span className={estilos.aviso}>
            A Zela orienta e prioriza — não realiza diagnóstico nem prescrição.
          </span>
        </div>
      </div>
    </footer>
  );
}
