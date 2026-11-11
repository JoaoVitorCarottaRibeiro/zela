"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  listarMeusExames,
  listarMinhasTriagens,
  removerExame,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, ExameAnaliseOut, ItemExame, Triagem } from "@/lib/tipos";
import RiskBadge from "@/components/RiskBadge";
import estilos from "./ResultadosCliente.module.css";

type Aba = "triagens" | "exames";

const DESTINO_ROTULO: Record<Destino, string> = {
  casa: "Cuidar em casa",
  ubs: "Procurar a UBS",
  telessaude: "Teleconsulta",
  samu: "Acionar o SAMU 192",
};

const SITUACAO_ROTULO: Record<ItemExame["situacao"], string> = {
  dentro: "Dentro da faixa",
  fora: "Fora da faixa",
  atencao: "Verificar",
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

function CartaoTriagem({ t }: { t: Triagem }) {
  const enc = t.encaminhamentos[0];
  return (
    <article className={`${estilos.item} ${estilos[`borda_${t.nivel}`]}`}>
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
}

function CartaoExame({
  ex,
  onRemover,
}: {
  ex: ExameAnaliseOut;
  onRemover: (id: number) => void;
}) {
  return (
    <article
      className={`${estilos.item} ${
        ex.nivel ? estilos[`borda_${ex.nivel}`] : estilos.bordaNeutra
      }`}
    >
      <div className={estilos.cabecalho}>
        <span className={estilos.data}>{formatarData(ex.criado_em)}</span>
        {ex.nivel && <RiskBadge nivel={ex.nivel} />}
      </div>
      <p className={estilos.orientacao}>{ex.resumo}</p>
      {ex.itens.length > 0 && (
        <ul className={estilos.itensExame}>
          {ex.itens.map((it, i) => (
            <li key={i} className={estilos.itemExame}>
              <span className={estilos.itemExameNome}>
                {it.nome}
                {it.valor ? `: ${it.valor}` : ""}
              </span>
              <span className={`${estilos.selo} ${estilos[`selo_${it.situacao}`]}`}>
                {SITUACAO_ROTULO[it.situacao]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {ex.precisa_cuidado && (
        <p className={estilos.encaminhamento}>
          Próximo passo:{" "}
          <strong>levar o exame a um profissional de saúde</strong>
        </p>
      )}
      <div className={estilos.exameAcoes}>
        <button
          type="button"
          className={estilos.remover}
          onClick={() => onRemover(ex.id)}
        >
          Remover do histórico
        </button>
      </div>
    </article>
  );
}

export default function ResultadosCliente() {
  const { token } = useAuth();
  const [triagens, setTriagens] = useState<Triagem[] | null>(null);
  const [exames, setExames] = useState<ExameAnaliseOut[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("triagens");

  useEffect(() => {
    if (!token) return;
    Promise.all([listarMinhasTriagens(token), listarMeusExames(token)])
      .then(([t, e]) => {
        setTriagens(t);
        setExames(e);
      })
      .catch((e) =>
        setErro(
          e instanceof ApiError
            ? e.message
            : "Não foi possível carregar seus resultados.",
        ),
      );
  }, [token]);

  async function removerUm(id: number) {
    if (!token) return;
    const ok = window.confirm(
      "Remover este exame do seu histórico? Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    try {
      await removerExame(id, token);
      setExames((atual) => (atual ? atual.filter((e) => e.id !== id) : atual));
    } catch (e) {
      setErro(
        e instanceof ApiError ? e.message : "Não foi possível remover agora.",
      );
    }
  }

  if (erro) {
    return <div className={estilos.aviso}>{erro}</div>;
  }

  if (triagens === null || exames === null) {
    return <div className={estilos.aviso}>Carregando seus resultados…</div>;
  }

  if (triagens.length === 0 && exames.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h3>Você ainda não tem resultados</h3>
        <p>
          Quando fizer uma triagem ou enviar um exame para entender, eles
          aparecem aqui.
        </p>
        <Link href="/triagem" className="botao botao--primario">
          Fazer minha triagem
        </Link>
      </div>
    );
  }

  return (
    <div className={estilos.area}>
      {/* Seletor: ver só triagens ou só exames */}
      <div className={estilos.abas} role="tablist" aria-label="Ver triagens ou exames">
        <button
          role="tab"
          aria-selected={aba === "triagens"}
          className={`${estilos.aba} ${aba === "triagens" ? estilos.abaAtiva : ""}`}
          onClick={() => setAba("triagens")}
        >
          Triagens
          <span className={estilos.contagem}>{triagens.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={aba === "exames"}
          className={`${estilos.aba} ${aba === "exames" ? estilos.abaAtiva : ""}`}
          onClick={() => setAba("exames")}
        >
          Exames
          <span className={estilos.contagem}>{exames.length}</span>
        </button>
      </div>

      {aba === "triagens" ? (
        triagens.length > 0 ? (
          <div className={estilos.lista}>
            {triagens.map((t) => (
              <CartaoTriagem key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <div className={estilos.vazioTipo}>
            <p>Você ainda não fez nenhuma triagem.</p>
            <Link href="/triagem" className="botao botao--contorno">
              Fazer minha triagem
            </Link>
          </div>
        )
      ) : exames.length > 0 ? (
        <div className={estilos.lista}>
          {exames.map((ex) => (
            <CartaoExame key={ex.id} ex={ex} onRemover={removerUm} />
          ))}
        </div>
      ) : (
        <div className={estilos.vazioTipo}>
          <p>Você ainda não enviou nenhum exame.</p>
          <Link href="/exame" className="botao botao--contorno">
            Entender um exame
          </Link>
        </div>
      )}
    </div>
  );
}
