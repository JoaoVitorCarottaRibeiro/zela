import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import {
  analisarFoto,
  ApiError,
  conversarTriagem,
  transcreverAudio,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Destino, MensagemConversa, Nivel, Triagem } from "@/lib/tipos";
import { cores, corNivel, corNivelSuave, espaco, fonte, raio } from "@/theme";

type Balao = { autor: "usuario" | "zela"; texto: string; local?: boolean };

const SAUDACAO =
  "Olá! Sou a Zela. Me conte, com suas palavras, o que você está sentindo. Pode ser por texto, por voz ou enviando uma foto.";

const TITULO_NIVEL: Record<Nivel, string> = {
  verde: "Pode ser cuidado com orientação",
  amarelo: "Vale procurar atendimento",
  vermelho: "Procure ajuda agora",
};

const DESTINO_ROTULO: Record<Destino, string> = {
  casa: "Cuidar em casa",
  ubs: "Procurar a UBS",
  telessaude: "Teleconsulta",
  samu: "Acionar o SAMU 192",
};

function idadeDe(nascimento?: string | null): number | null {
  if (!nascimento) return null;
  const nasc = new Date(nascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos -= 1;
  return anos >= 0 && anos <= 130 ? anos : null;
}

export default function TelaTriagem() {
  const { token, usuario } = useAuth();
  const idade = idadeDe(usuario?.data_nascimento);
  const primeiroNome = usuario?.nome_completo?.trim().split(" ")[0];

  const [baloes, setBaloes] = useState<Balao[]>([
    {
      autor: "zela",
      texto: primeiroNome ? `Olá, ${primeiroNome}! ${SAUDACAO}` : SAUDACAO,
      local: true,
    },
  ]);
  const baloesRef = useRef<Balao[]>(baloes);
  useEffect(() => {
    baloesRef.current = baloes;
  }, [baloes]);

  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [entrada, setEntrada] = useState("");
  const [contextoFoto, setContextoFoto] = useState<string | null>(null);
  const [triagem, setTriagem] = useState<Triagem | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ouvir, setOuvir] = useState(true);

  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const gravacaoRef = useRef<Audio.Recording | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const encerrado = triagem !== null;

  function rolar() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  function falar(texto: string) {
    if (!ouvir) return;
    try {
      Speech.stop();
      Speech.speak(texto, { language: "pt-BR" });
    } catch {
      /* sem TTS neste aparelho */
    }
  }
  function pararFala() {
    try {
      Speech.stop();
    } catch {
      /* ignora */
    }
  }

  function historicoDe(lista: Balao[]): MensagemConversa[] {
    return lista
      .filter((b) => !b.local && b.texto.trim())
      .map((b) => ({ autor: b.autor, texto: b.texto }));
  }

  function aplicar(r: Awaited<ReturnType<typeof conversarTriagem>>) {
    if (r.estado === "pergunta" && r.pergunta) {
      const texto = r.pergunta;
      setBaloes((b) => [...b, { autor: "zela", texto }]);
      setSugestoes(r.sugestoes ?? []);
      falar(texto);
    } else if (r.estado === "concluido" && r.triagem) {
      setTriagem(r.triagem);
      setSugestoes([]);
      falar(`${TITULO_NIVEL[r.triagem.nivel]}. ${r.triagem.orientacao}`);
    }
    rolar();
  }

  async function enviar(texto: string, canal: string, extraContexto?: string | null) {
    const t = texto.trim();
    if ((!t && !extraContexto) || carregando || encerrado) return;
    setErro(null);
    setSugestoes([]);
    const novos: Balao[] = [...baloesRef.current, { autor: "usuario", texto: t || "Enviei uma foto." }];
    baloesRef.current = novos;
    setBaloes(novos);
    setEntrada("");
    rolar();
    setCarregando(true);
    try {
      const r = await conversarTriagem(historicoDe(novos), {
        idade,
        canal,
        token,
        contextoFoto: extraContexto ?? contextoFoto,
      });
      aplicar(r);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Algo deu errado. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  // ----------------------------------------------------------------- voz
  async function iniciarGravacao() {
    pararFala();
    setErro(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setErro("Para falar, permita o microfone nas configurações.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      gravacaoRef.current = recording;
      setGravando(true);
    } catch {
      setErro("Não consegui usar o microfone. Você pode escrever os sintomas.");
    }
  }

  async function pararGravacao() {
    const rec = gravacaoRef.current;
    setGravando(false);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      gravacaoRef.current = null;
      if (!uri) return;
      setTranscrevendo(true);
      const r = await transcreverAudio(uri);
      const texto = (r.texto || "").trim();
      if (texto) await enviar(texto, "voz");
      else setErro("Não consegui entender. Fale de novo, por favor.");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao transcrever o áudio.");
    } finally {
      setTranscrevendo(false);
    }
  }

  // ----------------------------------------------------------------- foto
  async function enviarFoto(usarCamera: boolean) {
    if (carregando || encerrado) return;
    setErro(null);
    try {
      const perm = usarCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErro("Permita o acesso à câmera/galeria para enviar a foto.");
        return;
      }
      const res = usarCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      setCarregando(true);
      const v = await analisarFoto(uri);
      setContextoFoto(v.descricao);
      await enviar("Enviei uma foto.", "foto", v.descricao);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao analisar a foto.");
    } finally {
      setCarregando(false);
    }
  }

  function recomecar() {
    pararFala();
    const inicio: Balao[] = [
      { autor: "zela", texto: primeiroNome ? `Olá, ${primeiroNome}! ${SAUDACAO}` : SAUDACAO, local: true },
    ];
    baloesRef.current = inicio;
    setBaloes(inicio);
    setSugestoes([]);
    setEntrada("");
    setContextoFoto(null);
    setTriagem(null);
    setErro(null);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.tituloTopo}>Triagem</Text>
        <View style={{ flexDirection: "row", gap: espaco.sm }}>
          <Pressable
            onPress={() => {
              if (ouvir) pararFala();
              setOuvir((v) => !v);
            }}
            style={estilos.iconeBtn}
            accessibilityLabel={ouvir ? "Desligar a voz da Zela" : "Ligar a voz da Zela"}
          >
            <Ionicons
              name={ouvir ? "volume-high" : "volume-mute"}
              size={22}
              color={ouvir ? cores.azulProfundo : cores.textoSuave}
            />
          </Pressable>
          <Pressable onPress={recomecar} style={estilos.iconeBtn} accessibilityLabel="Nova triagem">
            <Ionicons name="refresh" size={22} color={cores.azulProfundo} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={60}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={estilos.thread}
          onContentSizeChange={rolar}
          keyboardShouldPersistTaps="handled"
        >
          {baloes.map((b, i) => (
            <View
              key={i}
              style={[
                estilos.balao,
                b.autor === "zela" ? estilos.balaoZela : estilos.balaoUsuario,
              ]}
            >
              <Text style={b.autor === "zela" ? estilos.txtZela : estilos.txtUsuario}>
                {b.texto}
              </Text>
            </View>
          ))}

          {(carregando || transcrevendo) && (
            <View style={[estilos.balao, estilos.balaoZela]}>
              <ActivityIndicator color={cores.textoSuave} />
            </View>
          )}

          {triagem && <CartaoResultado triagem={triagem} />}
        </ScrollView>

        {/* Sugestões de resposta rápida */}
        {!encerrado && sugestoes.length > 0 && (
          <View style={estilos.chips}>
            {sugestoes.map((s) => (
              <Pressable key={s} style={estilos.chip} onPress={() => enviar(s, "app")}>
                <Text style={estilos.chipTxt}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {erro && (
          <Text style={estilos.erro} accessibilityRole="alert">
            {erro}
          </Text>
        )}

        {/* Barra de entrada */}
        {encerrado ? (
          <View style={estilos.barraFim}>
            <Pressable style={estilos.botaoFim} onPress={recomecar}>
              <Ionicons name="refresh" size={18} color={cores.azulProfundo} />
              <Text style={estilos.botaoFimTxt}>Fazer nova triagem</Text>
            </Pressable>
          </View>
        ) : (
          <View style={estilos.barra}>
            <Pressable
              onPress={() => enviarFoto(false)}
              style={estilos.acaoIcone}
              accessibilityLabel="Enviar foto"
            >
              <Ionicons name="image-outline" size={24} color={cores.azulProfundo} />
            </Pressable>
            <Pressable
              onPress={gravando ? pararGravacao : iniciarGravacao}
              style={[estilos.acaoIcone, gravando && estilos.acaoGravando]}
              accessibilityLabel={gravando ? "Parar e enviar a fala" : "Falar os sintomas"}
            >
              <Ionicons
                name={gravando ? "stop" : "mic-outline"}
                size={24}
                color={gravando ? cores.branco : cores.azulProfundo}
              />
            </Pressable>
            <TextInput
              style={estilos.input}
              placeholder="Escreva ou fale o que está sentindo…"
              placeholderTextColor={cores.textoSuave}
              value={entrada}
              onChangeText={setEntrada}
              multiline
            />
            <Pressable
              onPress={() => enviar(entrada, "app")}
              disabled={carregando || !entrada.trim()}
              style={[estilos.enviar, (carregando || !entrada.trim()) && { opacity: 0.5 }]}
              accessibilityLabel="Enviar"
            >
              <Ionicons name="send" size={20} color={cores.branco} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CartaoResultado({ triagem }: { triagem: Triagem }) {
  const enc = triagem.encaminhamentos[0];
  return (
    <View style={[estilos.resultado, { borderLeftColor: corNivel[triagem.nivel] }]}>
      <View
        style={[estilos.selo, { backgroundColor: corNivelSuave[triagem.nivel] }]}
      >
        <Text style={[estilos.seloTxt, { color: corNivel[triagem.nivel] }]}>
          {triagem.nivel === "verde"
            ? "Risco baixo"
            : triagem.nivel === "amarelo"
              ? "Atenção"
              : "Urgência"}
        </Text>
      </View>
      <Text style={estilos.resTitulo}>{TITULO_NIVEL[triagem.nivel]}</Text>
      <Text style={estilos.resTexto}>{triagem.orientacao}</Text>
      {triagem.justificativa && (
        <Text style={estilos.resJust}>{triagem.justificativa}</Text>
      )}
      {enc && (
        <View style={estilos.proximo}>
          <Text style={estilos.proximoRot}>PRÓXIMO PASSO</Text>
          <Text style={estilos.proximoTit}>{DESTINO_ROTULO[enc.destino]}</Text>
        </View>
      )}
      <Text style={estilos.isencao}>
        A Zela orienta e prioriza, não substitui a avaliação de um profissional.
        Em caso de urgência, ligue 192.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  tituloTopo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  iconeBtn: { padding: 8, borderRadius: raio.pill },

  thread: { padding: espaco.md, gap: 10 },
  balao: { maxWidth: "86%", padding: espaco.md, borderRadius: 16 },
  balaoZela: {
    alignSelf: "flex-start",
    backgroundColor: cores.fundoSuave,
    borderBottomLeftRadius: 4,
  },
  balaoUsuario: {
    alignSelf: "flex-end",
    backgroundColor: cores.azul,
    borderBottomRightRadius: 4,
  },
  txtZela: { fontSize: fonte.base, color: cores.texto, lineHeight: 24 },
  txtUsuario: { fontSize: fonte.base, color: cores.branco, lineHeight: 24 },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: espaco.md,
    paddingBottom: espaco.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: cores.azul,
    borderRadius: raio.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: cores.branco,
  },
  chipTxt: { color: cores.azulProfundo, fontWeight: "600", fontSize: fonte.pequeno },

  erro: { color: cores.vermelho, paddingHorizontal: espaco.md, paddingBottom: espaco.sm },

  barra: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
  },
  acaoIcone: {
    width: 46,
    height: 46,
    borderRadius: raio.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoSuave,
  },
  acaoGravando: { backgroundColor: cores.vermelho },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    paddingTop: 10,
    fontSize: fonte.base,
    color: cores.tinta,
  },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: raio.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.azulEscuro,
  },

  barraFim: {
    padding: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
  },
  botaoFim: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: raio.pill,
    borderWidth: 1.5,
    borderColor: cores.linha,
  },
  botaoFimTxt: { color: cores.azulProfundo, fontWeight: "700", fontSize: fonte.base },

  resultado: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderLeftWidth: 5,
    borderRadius: raio.md,
    padding: espaco.lg,
    marginTop: 6,
  },
  selo: { alignSelf: "flex-start", borderRadius: raio.pill, paddingHorizontal: 12, paddingVertical: 4 },
  seloTxt: { fontWeight: "700", fontSize: fonte.pequeno },
  resTitulo: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta, marginTop: espaco.sm },
  resTexto: { fontSize: fonte.base, color: cores.texto, lineHeight: 25, marginTop: espaco.sm },
  resJust: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: espaco.sm },
  proximo: {
    marginTop: espaco.md,
    paddingTop: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
  },
  proximoRot: { fontSize: 12, fontWeight: "700", letterSpacing: 1, color: cores.textoSuave },
  proximoTit: { fontSize: fonte.medio, fontWeight: "700", color: cores.tinta, marginTop: 2 },
  isencao: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: espaco.md },
});
