import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { Botao, Cartao } from "@/components/ui";
import { cores, espaco, fonte, raio } from "@/theme";

export default function TelaAjuda() {
  const { usuario, sair } = useAuth();

  async function aoSair() {
    await sair();
    router.replace("/");
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={estilos.corpo}>
        <Text style={estilos.titulo}>Ajuda e emergência</Text>

        {/* Emergência */}
        <Pressable
          style={estilos.emergencia}
          onPress={() => Linking.openURL("tel:192")}
          accessibilityLabel="Ligar para o SAMU 192"
        >
          <Ionicons name="call" size={26} color={cores.branco} />
          <View style={{ flex: 1 }}>
            <Text style={estilos.emergenciaTit}>Ligar para o SAMU 192</Text>
            <Text style={estilos.emergenciaSub}>
              Em risco de vida, ligue agora ou vá ao pronto-socorro mais próximo.
            </Text>
          </View>
        </Pressable>

        {/* Orientações */}
        <Cartao style={{ marginTop: espaco.lg }}>
          <Text style={estilos.secao}>Como a Zela ajuda</Text>
          <Linha texto="Conte seus sintomas por voz, foto ou texto na aba Triagem." />
          <Linha texto="A Zela pergunta o que precisa e mostra o próximo passo: cuidar em casa, ir à UBS ou chamar o socorro." />
          <Linha texto="Seus atendimentos ficam salvos na aba Resultados." />
          <Linha texto="A Zela orienta e prioriza, não substitui a avaliação de um profissional de saúde." />
        </Cartao>

        {/* Conta */}
        <Cartao style={{ marginTop: espaco.lg }}>
          <Text style={estilos.secao}>Sua conta</Text>
          {usuario && (
            <Text style={estilos.conta}>
              {usuario.nome_completo}
            </Text>
          )}
          <Botao
            titulo="Sair"
            variante="contorno"
            onPress={aoSair}
            style={{ marginTop: espaco.md }}
          />
        </Cartao>
      </ScrollView>
    </SafeAreaView>
  );
}

function Linha({ texto }: { texto: string }) {
  return (
    <View style={estilos.linha}>
      <Ionicons name="checkmark-circle" size={18} color={cores.azulEscuro} />
      <Text style={estilos.linhaTxt}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: espaco.lg },
  titulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta, marginBottom: espaco.lg },

  emergencia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    backgroundColor: cores.vermelho,
    borderRadius: raio.md,
    padding: espaco.lg,
  },
  emergenciaTit: { color: cores.branco, fontSize: fonte.medio, fontWeight: "800" },
  emergenciaSub: { color: cores.branco, fontSize: fonte.pequeno, marginTop: 2, lineHeight: 20 },

  secao: { fontSize: fonte.medio, fontWeight: "800", color: cores.tinta, marginBottom: espaco.sm },
  linha: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: espaco.sm },
  linhaTxt: { flex: 1, fontSize: fonte.base, color: cores.texto, lineHeight: 24 },
  conta: { fontSize: fonte.base, color: cores.texto, marginTop: espaco.xs },
});
