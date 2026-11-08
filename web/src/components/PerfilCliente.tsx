"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, atualizarPerfil, buscarCep } from "@/lib/api";
import { GENEROS, IDENTIDADES_GENERO } from "@/lib/opcoes";
import estilos from "./Perfil.module.css";
import campos from "./FormAuth.module.css";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function cpfFormatado(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function PerfilCliente() {
  const { usuario, token, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(usuario?.nome_completo ?? "");
  const [nascimento, setNascimento] = useState(usuario?.data_nascimento ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [genero, setGenero] = useState(usuario?.genero ?? "");
  const [identidadeGenero, setIdentidadeGenero] = useState(usuario?.identidade_genero ?? "");

  const [cep, setCep] = useState(usuario?.cep ?? "");
  const [logradouro, setLogradouro] = useState(usuario?.logradouro ?? "");
  const [bairro, setBairro] = useState(usuario?.bairro ?? "");
  const [cidade, setCidade] = useState(usuario?.cidade ?? "");
  const [uf, setUf] = useState(usuario?.uf ?? "");
  const [complemento, setComplemento] = useState(usuario?.complemento ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!usuario) return null;

  const anoMembro = new Date(usuario.criado_em).getFullYear();

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    setCep(digitos);
    if (digitos.length === 8) {
      setBuscandoCep(true);
      const end = await buscarCep(digitos);
      setBuscandoCep(false);
      if (end) {
        setLogradouro(end.logradouro);
        setBairro(end.bairro);
        setCidade(end.cidade);
        setUf(end.uf);
      }
    }
  }

  function validar(): string | null {
    if (nome.trim().length < 3) return "Informe seu nome completo.";
    if (!nascimento) return "Informe sua data de nascimento.";
    if (cep && cep.replace(/\D/g, "").length !== 8)
      return "O CEP deve ter 8 dígitos (ou deixe em branco).";
    if (uf && uf.trim().length !== 2) return "Informe o estado (UF) com 2 letras.";
    return null;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      setSucesso(null);
      return;
    }
    if (!token) return;
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil(token, {
        nome_completo: nome.trim(),
        data_nascimento: nascimento,
        email: email.trim() || null,
        genero: genero || null,
        identidade_genero: identidadeGenero || null,
        cep: cep.trim() || null,
        logradouro: logradouro.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        complemento: complemento.trim() || null,
      });
      atualizarUsuario(atualizado);
      setSucesso("Perfil atualizado com sucesso.");
    } catch (err) {
      setErro(
        err instanceof ApiError ? err.message : "Não foi possível salvar as alterações.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.topo}>
        <div className={estilos.avatarGrande} aria-hidden="true">
          {iniciais(usuario.nome_completo)}
        </div>
        <div>
          <h1 className={estilos.nome}>{usuario.nome_completo}</h1>
          <p className={estilos.membro}>Membro desde {anoMembro}</p>
        </div>
      </header>

      {!usuario.email && (
        <div className={estilos.dica}>
          <strong>Dica de segurança:</strong> adicione um e-mail para conseguir
          recuperar o acesso caso esqueça a senha.
        </div>
      )}

      <form className={estilos.cartao} onSubmit={salvar} noValidate>
        <section className={estilos.secao}>
          <h2 className={estilos.secaoTitulo}>Dados pessoais</h2>

          <div className={campos.campo}>
            <label className={campos.rotulo} htmlFor="nome">
              Nome completo <span className={campos.obrigatorio}>*</span>
            </label>
            <input
              id="nome"
              className={campos.input}
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className={campos.dupla}>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="nascimento">
                Data de nascimento <span className={campos.obrigatorio}>*</span>
              </label>
              <input
                id="nascimento"
                className={campos.input}
                type="date"
                max="2099-12-31"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
              />
            </div>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="cpf">
                CPF
              </label>
              <input
                id="cpf"
                className={`${campos.input} ${estilos.inputTravado}`}
                type="text"
                value={cpfFormatado(usuario.cpf)}
                readOnly
                aria-readonly="true"
              />
              <span className={campos.ajuda}>O CPF não pode ser alterado.</span>
            </div>
          </div>

          <div className={campos.campo}>
            <label className={campos.rotulo} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className={campos.input}
              type="email"
              autoComplete="email"
              placeholder="email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={campos.dupla}>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="genero">
                Gênero
              </label>
              <select
                id="genero"
                className={campos.input}
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
              >
                <option value="">Selecione…</option>
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="identidade">
                Identidade de gênero
              </label>
              <select
                id="identidade"
                className={campos.input}
                value={identidadeGenero}
                onChange={(e) => setIdentidadeGenero(e.target.value)}
              >
                <option value="">Selecione…</option>
                {IDENTIDADES_GENERO.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.secaoTitulo}>Endereço</h2>

          <div className={campos.dupla}>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="cep">
                CEP
              </label>
              <input
                id="cep"
                className={campos.input}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={(e) => aoMudarCep(e.target.value)}
              />
              {buscandoCep && <span className={campos.ajuda}>Buscando endereço…</span>}
            </div>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="complemento">
                Complemento
              </label>
              <input
                id="complemento"
                className={campos.input}
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
              />
            </div>
          </div>

          <div className={campos.campo}>
            <label className={campos.rotulo} htmlFor="logradouro">
              Endereço
            </label>
            <input
              id="logradouro"
              className={campos.input}
              type="text"
              autoComplete="address-line1"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
            />
          </div>

          <div className={campos.dupla}>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="bairro">
                Bairro
              </label>
              <input
                id="bairro"
                className={campos.input}
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
            <div className={campos.campo}>
              <label className={campos.rotulo} htmlFor="cidade">
                Cidade
              </label>
              <input
                id="cidade"
                className={campos.input}
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
          </div>

          <div className={campos.campo}>
            <label className={campos.rotulo} htmlFor="uf">
              Estado (UF)
            </label>
            <input
              id="uf"
              className={`${campos.input} ${campos.inputUf}`}
              type="text"
              maxLength={2}
              value={uf}
              onChange={(e) =>
                setUf(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))
              }
            />
          </div>
        </section>

        {erro && <div className={campos.erro}>{erro}</div>}
        {sucesso && <div className={campos.sucesso}>{sucesso}</div>}

        <button
          type="submit"
          className={`botao botao--primario ${estilos.salvar}`}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
