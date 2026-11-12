import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ApiError,
  listarMeusExames,
  listarMinhasTriagens,
  removerExame,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, ExameAnaliseOut, ItemExame, Nivel, Triagem } from "@/lib/tipos";
import { Botao } from "@/components/ui";
import { cores, corNivel, corNivelSuave, espaco, fonte, raio } from "@/theme";

type Aba = "triagens" | "exames";

const DESTINO_ROTULO: Record<Destino, string> = {
  casa: "Cuidar em casa",
  ubs: "Procurar a UBS",
  telessaude: "Teleconsulta",
  samu: "Acionar o SAMU 192",
};
const SELO: Record<Nivel, string> = {
  verde: "Risco baixo",
  amarelo: "Atenção",
  vermelho: "Urgência",
};
const SITUACAO_ROTULO: Record<ItemExame["situacao"], string> = {
  dentro: "Dentro da faixa",
  fora: "Fora da faixa",
  atencao: "Verificar",
};

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Selo({ nivel }: { nivel: Nivel }) {
  return (
    <View style={[estilos.selo, { backgroundColor: corNivelSuave[nivel] }]}>
      <Text style={[estilos.seloTxt, { color: corNivel[nivel] }]}>{SELO[nivel]}</Text>
    </View>
  );
}

export default function TelaResultados() {
  const { token } = useAuth();
  const [triagens, setTriagens] = useState<Triagem[] | null>(null);
  const [exames, setExames] = useState<ExameAnaliseOut[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [aba, setAba] = useState<Aba>("triagens");

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      setErro(null);
      const [t, e] = await Promise.all([
        listarMinhasTriagens(token),
        listarMeusExames(token),
      ]);
      setTriagens(t);
      setExames(e);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar.");
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aoAtualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  function removerUm(id: number) {
    Alert.alert(
      "Remover exame",
      "Remover este exame do seu histórico? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await removerExame(id, token);
              setExames((atual) => (atual ? atual.filter((e) => e.id !== id) : atual));
            } catch (e) {
              setErro(e instanceof ApiError ? e.message : "Não foi possível remover agora.");
            }
          },
        },
      ],
    );
  }

  const carregando = triagens === null || exames === null;

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Meus resultados</Text>
      </View>

      {!carregando && (
        <View style={estilos.abas}>
          <Pressable
            style={[estilos.aba, aba === "triagens" && estilos.abaAtiva]}
            onPress={() => setAba("triagens")}
          >
            <Text style={[estilos.abaTxt, aba === "triagens" && estilos.abaTxtAtiva]}>
              Triagens ({triagens?.length ?? 0})
            </Text>
          </Pressable>
          <Pressable
            style={[estilos.aba, aba === "exames" && estilos.abaAtiva]}
            onPress={() => setAba("exames")}
          >
            <Text style={[estilos.abaTxt, aba === "exames" && estilos.abaTxtAtiva]}>
              Exames ({exames?.length ?? 0})
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={estilos.corpo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />}
      >
        {erro && <Text style={estilos.aviso}>{erro}</Text>}

        {carregando && !erro && (
          <View style={{ paddingTop: 40 }}>
            <ActivityIndicator color={cores.azulEscuro} />
          </View>
        )}

        {/* ---------------------------- Triagens ---------------------------- */}
        {!carregando && aba === "triagens" && (
          triagens!.length === 0 ? (
            <View style={estilos.vazio}>
              <Text style={estilos.aviso}>Você ainda não fez nenhuma triagem.</Text>
              <Botao titulo="Fazer minha triagem" onPress={() => router.push("/(tabs)/triagem")} />
            </View>
          ) : (
            triagens!.map((t) => {
              const enc = t.encaminhamentos[0];
              return (
                <View key={t.id} style={[estilos.item, { borderLeftColor: corNivel[t.nivel] }]}>
                  <View style={estilos.itemTopo}>
                    <Text style={estilos.data}>{formatarData(t.criado_em)}</Text>
                    <Selo nivel={t.nivel} />
                  </View>
                  <Text style={estilos.relato}>
                    <Text style={estilos.etiqueta}>Você relatou: </Text>
                    {t.sintomas}
                  </Text>
                  <Text style={estilos.orientacao}>{t.orientacao}</Text>
                  {enc && (
                    <Text style={estilos.proximo}>
                      Próximo passo: <Text style={estilos.proximoForte}>{DESTINO_ROTULO[enc.destino]}</Text>
                    </Text>
                  )}
                </View>
              );
            })
          )
        )}

        {/* ----------------------------- Exames ----------------------------- */}
        {!carregando && aba === "exames" && (
          exames!.length === 0 ? (
            <View style={estilos.vazio}>
              <Text style={estilos.aviso}>Você ainda não enviou nenhum exame.</Text>
              <Botao titulo="Entender um exame" onPress={() => router.push("/exame")} />
            </View>
          ) : (
            exames!.map((ex) => (
              <View
                key={ex.id}
                style={[estilos.item, { borderLeftColor: ex.nivel ? corNivel[ex.nivel] : cores.linha }]}
              >
                <View style={estilos.itemTopo}>
                  <Text style={estilos.data}>{formatarData(ex.criado_em)}</Text>
                  {ex.nivel && <Selo nivel={ex.nivel} />}
                </View>
                <Text style={estilos.orientacao}>{ex.resumo}</Text>
                {ex.itens.map((it, i) => (
                  <View key={i} style={estilos.linhaExame}>
                    <Text style={estilos.linhaExameNome}>
                      {it.nome}
                      {it.valor ? `: ${it.valor}` : ""}
                    </Text>
                    <Text style={estilos.linhaExameSit}>{SITUACAO_ROTULO[it.situacao]}</Text>
                  </View>
                ))}
                {ex.precisa_cuidado && (
                  <Text style={estilos.proximo}>
                    Próximo passo: <Text style={estilos.proximoForte}>levar o exame a um profissional de saúde</Text>
                  </Text>
                )}
                <Pressable onPress={() => removerUm(ex.id)} style={estilos.remover} hitSlop={6}>
                  <Text style={estilos.removerTxt}>Remover do histórico</Text>
                </Pressable>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
  },
  titulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  abas: {
    flexDirection: "row",
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingBottom: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  aba: {
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pill,
    backgroundColor: cores.fundoSuave,
  },
  abaAtiva: { backgroundColor: cores.azulEscuro },
  abaTxt: { fontSize: fonte.base, fontWeight: "700", color: cores.texto },
  abaTxtAtiva: { color: cores.branco },
  corpo: { padding: espaco.md, gap: 14 },
  vazio: { gap: espaco.md, paddingTop: espaco.lg },
  aviso: { color: cores.textoSuave, textAlign: "center", padding: espaco.lg, fontSize: fonte.base },

  item: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderLeftWidth: 5,
    borderRadius: raio.md,
    padding: espaco.lg,
  },
  itemTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: espaco.sm,
  },
  data: { fontSize: fonte.pequeno, color: cores.textoSuave, fontWeight: "600" },
  selo: { borderRadius: raio.pill, paddingHorizontal: 10, paddingVertical: 3 },
  seloTxt: { fontSize: 12, fontWeight: "700" },
  relato: { fontSize: fonte.base, color: cores.texto, marginBottom: espaco.sm },
  etiqueta: { color: cores.textoSuave, fontWeight: "700", fontSize: fonte.pequeno },
  orientacao: { fontSize: fonte.base, color: cores.texto, lineHeight: 24 },
  linhaExame: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  linhaExameNome: { flex: 1, fontSize: fonte.base, color: cores.tinta },
  linhaExameSit: { fontSize: fonte.pequeno, color: cores.textoSuave, fontWeight: "600" },
  proximo: {
    marginTop: espaco.sm,
    paddingTop: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
    color: cores.textoSuave,
  },
  proximoForte: { color: cores.tinta, fontWeight: "700" },
  remover: { marginTop: espaco.md, alignSelf: "flex-start" },
  removerTxt: { color: cores.vermelho, fontWeight: "700", fontSize: fonte.base },
});
