import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
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
  atualizarUsuario: (u: Usuario) => void;
  sair: () => Promise<void>;
}

const AuthContext = createContext<ContextoAuth | null>(null);

async function lerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CHAVE);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const salvo = await lerToken();
      if (!ativo) return;
      if (!salvo) {
        setCarregando(false);
        return;
      }
      setToken(salvo);
      try {
        const u = await obterMe(salvo);
        if (ativo) setUsuario(u);
      } catch {
        try {
          await SecureStore.deleteItemAsync(CHAVE);
        } catch {
          /* ignora */
        }
        if (ativo) setToken(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const aplicar = useCallback(async (r: RespostaAuth) => {
    try {
      await SecureStore.setItemAsync(CHAVE, r.token);
    } catch {
      /* ignora */
    }
    setToken(r.token);
    setUsuario(r.usuario);
  }, []);

  const entrar = useCallback(
    async (login: string, senha: string) => {
      await aplicar(await apiLogin(login, senha));
    },
    [aplicar],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      await aplicar(await apiCadastrar(dados));
    },
    [aplicar],
  );

  const atualizarUsuario = useCallback((u: Usuario) => {
    setUsuario(u);
  }, []);

  const sair = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(CHAVE);
    } catch {
      /* ignora */
    }
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, entrar, cadastrar, atualizarUsuario, sair }}
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
