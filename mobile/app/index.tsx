import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Botao } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

export default function Inicio() {
  const { usuario, carregando } = useAuth();

  useEffect(() => {
    if (!carregando && usuario) router.replace("/(tabs)/triagem");
  }, [carregando, usuario]);

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.topo}>
        <Image
          source={require("../assets/icon.png")}
          style={estilos.logo}
          accessibilityLabel="Zela"
        />
        <Text style={estilos.marca}>Zela</Text>
        <Text style={estilos.titulo}>Cuidado em saúde que começa em você</Text>
        <Text style={estilos.sub}>
          Conte o que está sentindo por voz, foto ou texto e receba na hora o
          próximo passo: cuidar em casa, procurar a UBS ou chamar o socorro.
        </Text>
      </View>

      <View style={estilos.acoes}>
        <Botao titulo="Entrar" onPress={() => router.push("/login")} />
        <Botao
          titulo="Criar conta"
          variante="contorno"
          onPress={() => router.push("/cadastro")}
          style={{ marginTop: espaco.sm }}
        />
        <Text style={estilos.nota}>
          A Zela orienta e prioriza, não substitui a avaliação médica.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundoSuave,
    paddingHorizontal: espaco.lg,
    justifyContent: "space-between",
  },
  topo: { alignItems: "center", marginTop: espaco.xl * 2 },
  logo: { width: 86, height: 86, borderRadius: 22 },
  marca: {
    fontSize: fonte.grande,
    fontWeight: "800",
    color: cores.azulProfundo,
    marginTop: espaco.md,
  },
  titulo: {
    fontSize: fonte.titulo,
    fontWeight: "800",
    color: cores.tinta,
    textAlign: "center",
    marginTop: espaco.lg,
    lineHeight: 36,
  },
  sub: {
    fontSize: fonte.base,
    color: cores.texto,
    textAlign: "center",
    marginTop: espaco.md,
    lineHeight: 25,
  },
  acoes: { marginBottom: espaco.xl },
  nota: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    textAlign: "center",
    marginTop: espaco.lg,
  },
});
