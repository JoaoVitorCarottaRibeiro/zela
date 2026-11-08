"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listarMinhasTriagens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, Triagem } from "@/lib/tipos";
import RiskBadge from "@/components/RiskBadge";
import estilos from "./ResultadosCliente.module.css";

const DESTINO_ROTULO: Record<Destino, string> = {
  casa: "Cuidar em casa",
  ubs: "Procurar a UBS",
  telessaude: "Teleconsulta",
  samu: "Acionar o SAMU 192",
};

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ResultadosCliente() {
  const { token } = useAuth();
  const [triagens, setTriagens] = useState<Triagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listarMinhasTriagens(token)
      .then((lista) => setTriagens(lista))
      .catch((e) =>
        setErro(e instanceof ApiError ? e.message : "Não foi possível carregar seus resultados."),
      );
  }, [token]);

  if (erro) {
    return <div className={estilos.aviso}>{erro}</div>;
  }

  if (triagens === null) {
    return <div className={estilos.aviso}>Carregando seus resultados…</div>;
  }

  if (triagens.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h3>Você ainda não fez nenhuma triagem</h3>
        <p>Quando fizer, o resultado e a orientação aparecem aqui.</p>
        <Link href="/triagem" className="botao botao--primario">
          Fazer minha triagem
        </Link>
      </div>
    );
  }

  return (
    <div className={estilos.lista}>
      {triagens.map((t) => {
        const enc = t.encaminhamentos[0];
        return (
          <article key={t.id} className={`${estilos.item} ${estilos[`borda_${t.nivel}`]}`}>
            <div className={estilos.cabecalho}>
              <span className={estilos.data}>{formatarData(t.criado_em)}</span>
              <RiskBadge nivel={t.nivel} />
            </div>
            <p className={estilos.sintomas}>
              <span className={estilos.etiqueta}>Você relatou:</span> {t.sintomas}
            </p>
            <p className={estilos.orientacao}>{t.orientacao}</p>
            {enc && (
              <p className={estilos.encaminhamento}>
                Próximo passo: <strong>{DESTINO_ROTULO[enc.destino]}</strong>
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
