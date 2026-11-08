"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import TriagemCliente from "@/components/triagem/TriagemCliente";
import formEstilos from "@/components/FormAuth.module.css";
import estilos from "./UrgenciaCliente.module.css";

export default function UrgenciaCliente() {
  const [cpf, setCpf] = useState("");
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (cpf.length !== 11) {
      setErro("O CPF deve ter 11 dígitos (somente números).");
      return;
    }
    setErro(null);
    setConfirmado(cpf);
  }

  // Passo 2: triagem como convidado, já com o CPF informado.
  if (confirmado) {
    return (
      <>
        <section className={estilos.topo}>
          <div className={`container ${estilos.topoInterno}`}>
            <span className="sobrelinha">Triagem de urgência</span>
            <h1>Vamos entender o que você está sentindo</h1>
            <p className={estilos.subtitulo}>
              Conte seus sintomas por texto, voz ou foto. Você recebe a orientação
              na hora — sem precisar de senha.
            </p>
          </div>
        </section>

        <section className={estilos.corpo}>
          <div className="container">
            <div className={estilos.aviso}>
              Atendimento de urgência como convidado. Se você já tem conta com este
              CPF, este atendimento vai aparecer no seu histórico assim que você{" "}
              <Link href="/login">entrar</Link>. Ainda não tem conta?{" "}
              <Link href="/cadastro">Criar conta</Link>.
            </div>
            <TriagemCliente cpfConvidado={confirmado} />
          </div>
        </section>
      </>
    );
  }

  // Passo 1: pede só o CPF.
  return (
    <div className={formEstilos.tela}>
      <div className={formEstilos.cartao}>
        <div className={formEstilos.topo}>
          <Image
            src="/brand/zela-simbolo.png"
            alt=""
            width={48}
            height={48}
            className={formEstilos.simbolo}
          />
          <h1 className={formEstilos.titulo}>Atendimento de urgência</h1>
          <p className={formEstilos.subtitulo}>
            Está passando mal? Faça sua triagem agora, sem login. Informe apenas o
            seu CPF.
          </p>
        </div>

        <form className={formEstilos.form} onSubmit={continuar} noValidate>
          <div className={formEstilos.campo}>
            <label className={formEstilos.rotulo} htmlFor="cpf-urgencia">
              CPF
            </label>
            <input
              id="cpf-urgencia"
              className={formEstilos.input}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Somente números"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
            <span className={formEstilos.ajuda}>{cpf.length}/11 dígitos</span>
          </div>

          {erro && <div className={formEstilos.erro}>{erro}</div>}

          <button type="submit" className={`botao botao--primario ${formEstilos.enviar}`}>
            Continuar para a triagem
          </button>
        </form>

        <p className={formEstilos.rodape}>
          Prefere entrar? <Link href="/login">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
