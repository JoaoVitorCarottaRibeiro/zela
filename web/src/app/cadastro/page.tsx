"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError, buscarCep } from "@/lib/api";
import { GENEROS, IDENTIDADES_GENERO } from "@/lib/opcoes";
import { destinoAposEntrar } from "@/lib/navegacao";
import MedidorSenha from "@/components/MedidorSenha";
import estilos from "@/components/FormAuth.module.css";

export default function PaginaCadastro() {
  const router = useRouter();
  const { cadastrar } = useAuth();

  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [identidadeGenero, setIdentidadeGenero] = useState("");

  // Endereço (obrigatório) — preenchido pelo CEP via ViaCEP.
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    setCep(digitos);
    setAvisoCep(null);
    if (digitos.length === 8) {
      setBuscandoCep(true);
      const end = await buscarCep(digitos);
      setBuscandoCep(false);
      if (end) {
        setLogradouro(end.logradouro);
        setBairro(end.bairro);
        setCidade(end.cidade);
        setUf(end.uf);
      } else {
        setAvisoCep("CEP não encontrado. Preencha o endereço manualmente.");
      }
    }
  }

  function validar(): string | null {
    if (nome.trim().length < 3) return "Informe seu nome completo.";
    if (!nascimento) return "Informe sua data de nascimento.";
    if (cpf.length !== 11) return "O CPF deve ter 11 dígitos (somente números).";
    if (cep.length !== 8) return "Informe um CEP válido (8 dígitos).";
    if (!logradouro.trim()) return "Informe o endereço.";
    if (!bairro.trim()) return "Informe o bairro.";
    if (!cidade.trim()) return "Informe a cidade.";
    if (uf.trim().length !== 2) return "Informe o estado (UF).";
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    if (!/[A-Z]/.test(senha)) return "A senha precisa de ao menos uma letra maiúscula.";
    if (!/\d/.test(senha)) return "A senha precisa de ao menos um número.";
    if (!/[^A-Za-z0-9]/.test(senha))
      return "A senha precisa de ao menos um caractere especial.";
    if (senha !== confirmar) return "As senhas não conferem.";
    return null;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await cadastrar({
        nome_completo: nome.trim(),
        data_nascimento: nascimento,
        cpf,
        senha,
        confirmar_senha: confirmar,
        email: email.trim() || null,
        genero: genero || null,
        identidade_genero: identidadeGenero || null,
        cep,
        logradouro: logradouro.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim(),
        complemento: complemento.trim() || null,
      });
      router.push(destinoAposEntrar());
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível criar a conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={estilos.tela}>
      <div className={estilos.cartao}>
        <div className={estilos.topo}>
          <Image
            src="/brand/zela-simbolo.png"
            alt=""
            width={48}
            height={48}
            className={estilos.simbolo}
          />
          <h1 className={estilos.titulo}>Criar sua conta</h1>
        </div>

        <form className={estilos.form} onSubmit={enviar} noValidate>
          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="nome">
              Nome completo <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="nome"
              className={estilos.input}
              type="text"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className={estilos.dupla}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="nascimento">
                Data de nascimento <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="nascimento"
                className={estilos.input}
                type="date"
                max="2099-12-31"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
              />
            </div>
            <div className={estilos.campo}>
              <div className={estilos.rotuloLinha}>
                <label className={estilos.rotulo} htmlFor="cpf">
                  CPF <span className={estilos.obrigatorio}>*</span>
                </label>
                <span className={estilos.ajuda}>{cpf.length}/11</span>
              </div>
              <input
                id="cpf"
                className={estilos.input}
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              />
            </div>
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className={estilos.input}
              type="email"
              autoComplete="email"
              placeholder="email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={estilos.dupla}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="genero">
                Gênero
              </label>
              <select
                id="genero"
                className={estilos.input}
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
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="identidade">
                Identidade de gênero
              </label>
              <select
                id="identidade"
                className={estilos.input}
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

          {/* ----------------------------- Endereço ----------------------------- */}
          <div className={estilos.dupla}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="cep">
                CEP <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="cep"
                className={estilos.input}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={(e) => aoMudarCep(e.target.value)}
              />
              {buscandoCep ? (
                <span className={estilos.ajuda}>Buscando endereço…</span>
              ) : avisoCep ? (
                <span className={estilos.ajuda}>{avisoCep}</span>
              ) : (
                <span className={estilos.ajuda}>{cep.length}/8 dígitos</span>
              )}
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="complemento">
                Complemento
              </label>
              <input
                id="complemento"
                className={estilos.input}
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
              />
            </div>
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="logradouro">
              Endereço <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="logradouro"
              className={estilos.input}
              type="text"
              autoComplete="address-line1"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
            />
          </div>

          <div className={estilos.dupla}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="bairro">
                Bairro <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="bairro"
                className={estilos.input}
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="cidade">
                Cidade <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="cidade"
                className={estilos.input}
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo} htmlFor="uf">
              Estado (UF) <span className={estilos.obrigatorio}>*</span>
            </label>
            <input
              id="uf"
              className={`${estilos.input} ${estilos.inputUf}`}
              type="text"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
            />
          </div>

          {/* ----------------------------- Senha (por último) ----------------------------- */}
          <div className={estilos.dupla}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="senha">
                Senha <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="senha"
                className={estilos.input}
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <MedidorSenha senha={senha} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo} htmlFor="confirmar">
                Confirmar senha <span className={estilos.obrigatorio}>*</span>
              </label>
              <input
                id="confirmar"
                className={estilos.input}
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
          </div>

          {erro && <div className={estilos.erro}>{erro}</div>}

          <button
            type="submit"
            className={`botao botao--primario ${estilos.enviar}`}
            disabled={enviando}
          >
            {enviando ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className={estilos.rodape}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
