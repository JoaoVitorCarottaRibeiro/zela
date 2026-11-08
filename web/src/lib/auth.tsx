"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  cadastrar as apiCadastrar,
  login as apiLogin,
  obterMe,
  type DadosCadastro,
} from "./api";
import type { RespostaAuth, Usuario } from "./tipos";

const CHAVE = "zela_token";

interface ContextoAuth {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
  definirSessao: (resposta: RespostaAuth) => void;
  atualizarUsuario: (usuario: Usuario) => void;
  sair: () => void;
}

const AuthContext = createContext<ContextoAuth | null>(null);

function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao carregar, recupera o token salvo e valida com /auth/me.
  useEffect(() => {
    const salvo = lerToken();
    if (!salvo) {
      setCarregando(false);
      return;
    }
    setToken(salvo);
    obterMe(salvo)
      .then((u) => setUsuario(u))
      .catch(() => {
        try {
          localStorage.removeItem(CHAVE);
        } catch {
          /* ignore */
        }
        setToken(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const aplicar = useCallback((r: RespostaAuth) => {
    try {
      localStorage.setItem(CHAVE, r.token);
    } catch {
      /* ignore */
    }
    setToken(r.token);
    setUsuario(r.usuario);
  }, []);

  const entrar = useCallback(
    async (login: string, senha: string) => {
      aplicar(await apiLogin(login, senha));
    },
    [aplicar],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      aplicar(await apiCadastrar(dados));
    },
    [aplicar],
  );

  const atualizarUsuario = useCallback((u: Usuario) => {
    setUsuario(u);
  }, []);

  const sair = useCallback(() => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignore */
    }
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        carregando,
        entrar,
        cadastrar,
        definirSessao: aplicar,
        atualizarUsuario,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
