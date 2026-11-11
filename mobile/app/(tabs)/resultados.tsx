import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, listarMinhasTriagens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, Nivel, Triagem } from "@/lib/tipos";
import { cores, corNivel, corNivelSuave, espaco, fonte, raio } from "@/theme";

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

export default function TelaResultados() {
  const { token } = useAuth();
  const [triagens, setTriagens] = useState<Triagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      setErro(null);
      const lista = await listarMinhasTriagens(token);
      setTriagens(lista);
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

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Minhas triagens</Text>
      </View>

      <ScrollView
        contentContainerStyle={estilos.corpo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />}
      >
        {erro && <Text style={estilos.aviso}>{erro}</Text>}

        {triagens === null && !erro && (
          <View style={{ paddingTop: 40 }}>
            <ActivityIndicator color={cores.azulEscuro} />
          </View>
        )}

        {triagens !== null && triagens.length === 0 && (
          <Text style={estilos.aviso}>
            Você ainda não fez nenhuma triagem. Quando fizer, o resultado aparece
            aqui.
          </Text>
        )}

        {triagens?.map((t) => {
          const enc = t.encaminhamentos[0];
          return (
            <View
              key={t.id}
              style={[estilos.item, { borderLeftColor: corNivel[t.nivel] }]}
            >
              <View style={estilos.itemTopo}>
                <Text style={estilos.data}>{formatarData(t.criado_em)}</Text>
                <View style={[estilos.selo, { backgroundColor: corNivelSuave[t.nivel] }]}>
                  <Text style={[estilos.seloTxt, { color: corNivel[t.nivel] }]}>
                    {SELO[t.nivel]}
                  </Text>
                </View>
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
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  titulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  corpo: { padding: espaco.md, gap: 14 },
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
  proximo: {
    marginTop: espaco.sm,
    paddingTop: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
    color: cores.textoSuave,
  },
  proximoForte: { color: cores.tinta, fontWeight: "700" },
});
