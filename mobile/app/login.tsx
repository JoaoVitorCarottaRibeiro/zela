import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

export default function Login() {
  const { entrar } = useAuth();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEntrar() {
    if (!login.trim() || !senha) {
      setErro("Preencha o seu acesso e a senha.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      await entrar(login.trim(), senha);
      router.replace("/(tabs)/triagem");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível entrar.");
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
          <Text style={estilos.titulo}>Entrar</Text>
          <Text style={estilos.sub}>Use seu CPF ou e-mail e a sua senha.</Text>

          <Campo
            rotulo="CPF ou e-mail"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Somente números, ou seu e-mail"
          />
          <Campo
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="Sua senha"
          />

          {erro && (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erro}
            </Text>
          )}

          <Botao titulo="Entrar" onPress={aoEntrar} carregando={carregando} style={{ marginTop: espaco.sm }} />

          <Pressable onPress={() => router.replace("/cadastro")} style={{ marginTop: espaco.lg }}>
            <Text style={estilos.link}>Ainda não tem conta? Criar conta</Text>
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
  sub: { fontSize: fonte.base, color: cores.textoSuave, marginTop: espaco.sm, marginBottom: espaco.lg },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginBottom: espaco.sm },
  link: { color: cores.azulProfundo, fontSize: fonte.base, fontWeight: "600", textAlign: "center" },
});
