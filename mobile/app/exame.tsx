import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { analisarExame, ApiError, salvarExame } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ItemExame, ResultadoExame } from "@/lib/tipos";
import { Botao } from "@/components/ui";
import { cores, corNivel, espaco, fonte, raio } from "@/theme";

const SITUACAO: Record<ItemExame["situacao"], { rotulo: string; cor: string; fundo: string }> = {
  dentro: { rotulo: "Dentro da faixa", cor: cores.verde, fundo: cores.verdeSuave },
  fora: { rotulo: "Fora da faixa", cor: cores.vermelho, fundo: cores.vermelhoSuave },
  atencao: { rotulo: "Verificar", cor: cores.amarelo, fundo: cores.amareloSuave },
};

export default function Exame() {
  const { token } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoExame | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  async function enviar(uri: string, nome: string, mime: string) {
    if (!token) return;
    setErro(null);
    setResultado(null);
    setGuardado(false);
    setErroSalvar(null);
    setNomeArquivo(nome);
    setCarregando(true);
    try {
      const r = await analisarExame(uri, nome, mime, token);
      setResultado(r);
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : "Não consegui ler o exame. Tente uma foto mais nítida ou um PDF.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function escolherFoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErro("Para enviar uma foto, permita o acesso às imagens.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await enviar(a.uri, a.fileName ?? "exame.jpg", a.mimeType ?? "image/jpeg");
  }

  async function escolherArquivo() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await enviar(a.uri, a.name ?? "exame.pdf", a.mimeType ?? "application/pdf");
  }

  function recomecar() {
    setResultado(null);
    setErro(null);
    setNomeArquivo(null);
    setGuardado(false);
    setErroSalvar(null);
  }

  async function salvar() {
    if (!resultado || !token) return;
    setErroSalvar(null);
    setSalvando(true);
    try {
      await salvarExame(resultado, token);
      setGuardado(true);
    } catch (err) {
      setErroSalvar(err instanceof ApiError ? err.message : "Não consegui guardar agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.topoBar}>
        <Ionicons name="arrow-back" size={26} color={cores.tinta} onPress={() => router.back()} />
        <Text style={estilos.topoTitulo}>Entenda seu exame</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={estilos.corpo}>
        <View style={estilos.aviso}>
          <Text style={estilos.avisoTxt}>
            <Text style={{ fontWeight: "800" }}>Isto é uma explicação, não um diagnóstico. </Text>
            A Zela ajuda você a entender seu exame em palavras simples, mas quem
            interpreta o resultado é um profissional de saúde.
          </Text>
        </View>

        {!resultado ? (
          <View>
            <View style={estilos.painel}>
              <Ionicons name="document-text-outline" size={40} color={cores.azulEscuro} />
              <Text style={estilos.painelTitulo}>
                {carregando ? "Lendo seu exame…" : "Envie uma foto ou PDF do seu exame"}
              </Text>
              <Text style={estilos.painelNota}>
                JPG, PNG ou PDF. Uma foto nítida e com boa luz ajuda na leitura.
              </Text>
            </View>

            <Botao titulo="Enviar foto" onPress={escolherFoto} carregando={carregando} />
            <Botao
              titulo="Escolher arquivo (PDF)"
              variante="contorno"
              onPress={escolherArquivo}
              desabilitado={carregando}
              style={{ marginTop: espaco.sm }}
            />

            <Text style={estilos.transparencia}>
              Seu exame é lido por uma inteligência artificial só para te explicar.
              Nada fica guardado sem você pedir.
            </Text>
            {nomeArquivo && <Text style={estilos.arquivo}>Arquivo: {nomeArquivo}</Text>}
            {erro && <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text>}
          </View>
        ) : (
          <View>
            <Text style={estilos.resumo}>{resultado.resumo}</Text>

            {resultado.itens.map((it, i) => (
              <View key={i} style={estilos.item}>
                <View style={estilos.itemTopo}>
                  <Text style={estilos.itemNome}>{it.nome}</Text>
                  <View style={[estilos.badge, { backgroundColor: SITUACAO[it.situacao].fundo }]}>
                    <Text style={[estilos.badgeTxt, { color: SITUACAO[it.situacao].cor }]}>
                      {SITUACAO[it.situacao].rotulo}
                    </Text>
                  </View>
                </View>
                {(it.valor || it.referencia) && (
                  <Text style={estilos.itemValores}>
                    {it.valor ? it.valor : ""}
                    {it.referencia ? `   ·   Referência: ${it.referencia}` : ""}
                  </Text>
                )}
                {it.explicacao ? <Text style={estilos.itemExpl}>{it.explicacao}</Text> : null}
              </View>
            ))}

            {resultado.precisa_cuidado && (
              <View style={[estilos.cuidado, resultado.nivel === "vermelho" && { borderLeftColor: corNivel.vermelho }]}>
                <Text style={estilos.cuidadoTxt}>
                  <Text style={{ fontWeight: "800" }}>Próximo passo: </Text>
                  leve este exame a um profissional de saúde.
                  {resultado.nivel === "vermelho"
                    ? " Como há um valor bem alterado, não demore, procure atendimento o quanto antes."
                    : " Na UBS ou na próxima consulta, mostre esses resultados."}
                </Text>
              </View>
            )}

            {resultado.origem === "ia" && (
              <View style={estilos.consent}>
                {guardado ? (
                  <Text style={estilos.guardado}>
                    Guardado no seu histórico. Você pode apagar quando quiser, em Resultados.
                  </Text>
                ) : (
                  <>
                    <Text style={estilos.consentTxt}>
                      Quer guardar este exame no seu histórico? Só você vê, e pode apagar quando quiser.
                    </Text>
                    {erroSalvar && <Text style={estilos.erro}>{erroSalvar}</Text>}
                    <Botao titulo="Guardar no meu histórico" onPress={salvar} carregando={salvando} />
                  </>
                )}
              </View>
            )}

            <Text style={estilos.rodape}>
              A Zela orienta e prioriza, não substitui a avaliação de um profissional.
              Em caso de urgência, ligue 192.
            </Text>

            <Botao titulo="Enviar outro exame" variante="contorno" onPress={recomecar} style={{ marginTop: espaco.md }} />
          </View>
        )}

        <View style={{ height: espaco.xl }} />
      </ScrollView>
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
  aviso: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.lg,
  },
  avisoTxt: { fontSize: fonte.base, color: cores.texto, lineHeight: 23 },
  painel: {
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: cores.linha,
    borderRadius: raio.lg,
    paddingVertical: espaco.xl,
    paddingHorizontal: espaco.lg,
    marginBottom: espaco.lg,
  },
  painelTitulo: { fontSize: fonte.medio, fontWeight: "700", color: cores.tinta, textAlign: "center", marginTop: espaco.md },
  painelNota: { fontSize: fonte.pequeno, color: cores.textoSuave, textAlign: "center", marginTop: espaco.sm },
  transparencia: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20, marginTop: espaco.md, textAlign: "center" },
  arquivo: { fontSize: fonte.pequeno, color: cores.texto, marginTop: espaco.sm, textAlign: "center" },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginTop: espaco.sm },

  resumo: { fontSize: fonte.medio, color: cores.tinta, lineHeight: 26, marginBottom: espaco.lg },
  item: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.sm,
  },
  itemTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espaco.sm },
  itemNome: { flex: 1, fontSize: fonte.base, fontWeight: "700", color: cores.tinta },
  badge: { borderRadius: raio.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
  itemValores: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: espaco.xs },
  itemExpl: { fontSize: fonte.base, color: cores.texto, lineHeight: 23, marginTop: espaco.xs },
  cuidado: {
    backgroundColor: cores.amareloSuave,
    borderLeftWidth: 4,
    borderLeftColor: cores.amarelo,
    borderRadius: raio.md,
    padding: espaco.md,
    marginTop: espaco.sm,
  },
  cuidadoTxt: { fontSize: fonte.base, color: cores.tinta, lineHeight: 23 },
  consent: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.md,
    padding: espaco.md,
    marginTop: espaco.lg,
  },
  consentTxt: { fontSize: fonte.base, color: cores.texto, lineHeight: 23, marginBottom: espaco.md },
  guardado: { fontSize: fonte.base, color: cores.verde, fontWeight: "600", lineHeight: 23 },
  rodape: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20, marginTop: espaco.lg, textAlign: "center" },
});
