import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoCadastrar() {
    if (!nome.trim() || !nascimento.trim() || !cpf.trim() || !senha) {
      setErro("Preencha nome, nascimento, CPF e senha.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      await cadastrar({
        nome_completo: nome.trim(),
        data_nascimento: nascimento.trim(),
        cpf: cpf.replace(/\D/g, ""),
        senha,
        confirmar_senha: confirmar,
      });
      router.replace("/(tabs)/triagem");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Criar conta</Text>
          <Text style={estilos.sub}>
            Só o necessário. A senha precisa de 6+ caracteres, com maiúscula,
            número e símbolo.
          </Text>

          <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} placeholder="Seu nome" />
          <Campo
            rotulo="Data de nascimento"
            value={nascimento}
            onChangeText={setNascimento}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Campo
            rotulo="CPF"
            value={cpf}
            onChangeText={setCpf}
            keyboardType="number-pad"
            placeholder="Somente números"
          />
          <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry placeholder="Crie uma senha" />
          <Campo
            rotulo="Confirmar senha"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Repita a senha"
          />

          {erro && (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erro}
            </Text>
          )}

          <Botao titulo="Criar conta" onPress={aoCadastrar} carregando={carregando} style={{ marginTop: espaco.sm }} />

          <Pressable onPress={() => router.replace("/login")} style={{ marginTop: espaco.lg }}>
            <Text style={estilos.link}>Já tem conta? Entrar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: espaco.lg, paddingTop: espaco.xl },
  titulo: { fontSize: fonte.titulo, fontWeight: "800", color: cores.tinta },
  sub: { fontSize: fonte.base, color: cores.textoSuave, marginTop: espaco.sm, marginBottom: espaco.lg, lineHeight: 24 },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginBottom: espaco.sm },
  link: { color: cores.azulProfundo, fontSize: fonte.base, fontWeight: "600", textAlign: "center" },
});
