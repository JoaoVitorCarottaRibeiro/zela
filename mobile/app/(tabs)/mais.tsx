import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { cores, espaco, fonte, raio } from "@/theme";

type ItemMenu = {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  destino: Href;
};

const ITENS: ItemMenu[] = [
  {
    icone: "clipboard-outline",
    titulo: "Ficha médica",
    descricao: "Seu pré-atendimento para a IA contextualizar a triagem.",
    destino: "/ficha-medica",
  },
  {
    icone: "document-text-outline",
    titulo: "Entenda seu exame",
    descricao: "Envie um exame e receba a explicação em linguagem simples.",
    destino: "/exame",
  },
  {
    icone: "person-outline",
    titulo: "Meu perfil",
    descricao: "Seus dados pessoais, endereço e segurança.",
    destino: "/perfil",
  },
  {
    icone: "medkit-outline",
    titulo: "Ajuda e emergência",
    descricao: "Como a Zela ajuda e o acesso rápido ao SAMU 192.",
    destino: "/ajuda",
  },
];

export default function Mais() {
  const { usuario, sair } = useAuth();

  async function aoSair() {
    await sair();
    router.replace("/");
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Mais</Text>
        {usuario && <Text style={estilos.ola}>Olá, {usuario.nome_completo.split(" ")[0]}</Text>}
      </View>

      <ScrollView contentContainerStyle={estilos.corpo}>
        {ITENS.map((it) => (
          <Pressable key={it.titulo} style={estilos.item} onPress={() => router.push(it.destino)}>
            <View style={estilos.iconeBox}>
              <Ionicons name={it.icone} size={24} color={cores.azulProfundo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.itemTitulo}>{it.titulo}</Text>
              <Text style={estilos.itemDesc}>{it.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} />
          </Pressable>
        ))}

        <Pressable style={[estilos.item, estilos.sair]} onPress={aoSair}>
          <View style={estilos.iconeBox}>
            <Ionicons name="log-out-outline" size={24} color={cores.vermelho} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.itemTitulo, { color: cores.vermelho }]}>Sair</Text>
            <Text style={estilos.itemDesc}>Encerrar a sessão neste aparelho.</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: espaco.lg, paddingVertical: espaco.sm },
  titulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  ola: { fontSize: fonte.base, color: cores.textoSuave, marginTop: 2 },
  corpo: { padding: espaco.md, gap: espaco.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.md,
    padding: espaco.md,
  },
  iconeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: cores.fundoSuave,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitulo: { fontSize: fonte.base, fontWeight: "700", color: cores.tinta },
  itemDesc: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: 2, lineHeight: 18 },
  sair: { marginTop: espaco.md },
});
