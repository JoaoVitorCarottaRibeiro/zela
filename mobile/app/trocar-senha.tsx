import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, trocarSenha } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

export default function TrocarSenha() {
  const { token } = useAuth();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function validar(): string | null {
    if (!atual) return "Informe sua senha atual.";
    if (nova.length < 6) return "A nova senha deve ter pelo menos 6 caracteres.";
    if (!/[A-Z]/.test(nova)) return "A nova senha precisa de ao menos uma letra maiúscula.";
    if (!/\d/.test(nova)) return "A nova senha precisa de ao menos um número.";
    if (!/[^A-Za-z0-9]/.test(nova)) return "A nova senha precisa de ao menos um caractere especial.";
    if (nova === atual) return "A nova senha deve ser diferente da atual.";
    if (nova !== confirmar) return "As senhas não conferem.";
    return null;
  }

  async function salvar() {
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
      await trocarSenha(token, atual, nova, confirmar);
      setSucesso("Senha alterada com sucesso.");
      setAtual("");
      setNova("");
      setConfirmar("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível trocar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.topoBar}>
        <Ionicons name="arrow-back" size={26} color={cores.tinta} onPress={() => router.back()} />
        <Text style={estilos.topoTitulo}>Trocar senha</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
          <Text style={estilos.sub}>
            Para sua segurança, confirme a senha atual e escolha uma nova com 6+
            caracteres, maiúscula, número e símbolo.
          </Text>

          <Campo rotulo="Senha atual" value={atual} onChangeText={setAtual} secureTextEntry />
          <Campo rotulo="Nova senha" value={nova} onChangeText={setNova} secureTextEntry />
          <Campo rotulo="Confirmar nova senha" value={confirmar} onChangeText={setConfirmar} secureTextEntry />

          {erro && <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text>}
          {sucesso && <Text style={estilos.sucesso} accessibilityRole="alert">{sucesso}</Text>}

          <Botao titulo="Salvar nova senha" onPress={salvar} carregando={salvando} style={{ marginTop: espaco.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  topoTitulo: { fontSize: fonte.medio, fontWeight: "800", color: cores.tinta },
  corpo: { padding: espaco.lg },
  sub: { fontSize: fonte.base, color: cores.textoSuave, marginBottom: espaco.lg, lineHeight: 24 },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginTop: espaco.sm },
  sucesso: { color: cores.verde, fontSize: fonte.base, marginTop: espaco.sm, fontWeight: "600" },
});
