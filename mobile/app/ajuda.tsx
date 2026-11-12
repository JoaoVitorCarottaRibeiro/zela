import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Cartao } from "@/components/ui";
import { cores, espaco, fonte, raio } from "@/theme";

export default function Ajuda() {
  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.topoBar}>
        <Ionicons name="arrow-back" size={26} color={cores.tinta} onPress={() => router.back()} />
        <Text style={estilos.topoTitulo}>Ajuda e emergência</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={estilos.corpo}>
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

        <Cartao style={{ marginTop: espaco.lg }}>
          <Text style={estilos.secao}>Como a Zela ajuda</Text>
          <Linha texto="Conte seus sintomas por voz, foto ou texto na aba Triagem." />
          <Linha texto="A Zela pergunta o que precisa e mostra o próximo passo: cuidar em casa, ir à UBS ou chamar o socorro." />
          <Linha texto="Veja unidades públicas perto de você na aba Mapa." />
          <Linha texto="Seus atendimentos e exames ficam salvos na aba Resultados." />
          <Linha texto="A Zela orienta e prioriza, não substitui a avaliação de um profissional de saúde." />
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
});
