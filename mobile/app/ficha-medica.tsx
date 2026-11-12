import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";
import { ApiError, obterFicha, salvarFicha } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  CONSENTIMENTOS,
  SECOES,
  temEmergencia,
  type CampoFicha,
  type Medicamento,
  type Respostas,
} from "@/lib/fichaDefs";
import { gerarFichaPdf } from "@/lib/fichaPdf";
import { Botao, Campo, LinhaConsent, SeletorMulti, SeletorUnico } from "@/components/ui";
import { cores, espaco, fonte, raio } from "@/theme";

const MED_VAZIO: Medicamento = { nome: "", dosagem: "", frequencia: "", motivo: "" };

function ehExclusiva(opcao: string): boolean {
  return /^(Nenhum|Nenhuma|Não possuo|Não conheço|Não sei)/.test(opcao);
}

export default function FichaMedica() {
  const { usuario, token } = useAuth();
  const [respostas, setRespostas] = useState<Respostas>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    obterFicha(token)
      .then((f) => {
        if (f?.dados) setRespostas(f.dados as Respostas);
      })
      .catch(() => {
        /* mantém ficha vazia */
      })
      .finally(() => setCarregando(false));
  }, [token]);

  function set(id: string, valor: unknown) {
    setSucesso(null);
    setRespostas((r) => ({ ...r, [id]: valor }));
  }

  function toggleCheckbox(campoId: string, opcao: string) {
    setSucesso(null);
    setRespostas((r) => {
      const atual = (r[campoId] as string[]) ?? [];
      let novo: string[];
      if (atual.includes(opcao)) {
        novo = atual.filter((o) => o !== opcao);
      } else if (ehExclusiva(opcao)) {
        novo = [opcao];
      } else {
        novo = [...atual.filter((o) => !ehExclusiva(o)), opcao];
      }
      return { ...r, [campoId]: novo };
    });
  }

  const meds = (): Medicamento[] => (respostas.medicamentos as Medicamento[]) ?? [{ ...MED_VAZIO }];

  function setMed(i: number, campo: keyof Medicamento, valor: string) {
    const lista = meds().map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m));
    set("medicamentos", lista);
  }
  function addMed() {
    set("medicamentos", [...meds(), { ...MED_VAZIO }]);
  }
  function removeMed(i: number) {
    const lista = meds().filter((_, idx) => idx !== i);
    set("medicamentos", lista.length ? lista : [{ ...MED_VAZIO }]);
  }

  const consentimentosOk = CONSENTIMENTOS.every((c) => respostas[c] === true);

  async function salvar() {
    if (!token) return;
    if (!consentimentosOk) {
      setErro("Para salvar, confirme os três itens de consentimento na seção 7.");
      setSucesso(null);
      return;
    }
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      await salvarFicha(token, respostas);
      setSucesso("Ficha médica salva com sucesso.");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar a ficha.");
    } finally {
      setSalvando(false);
    }
  }

  async function exportarPdf() {
    if (!usuario) return;
    try {
      await gerarFichaPdf(usuario, respostas);
    } catch {
      setErro("Não foi possível gerar o PDF agora.");
    }
  }

  function renderCampo(campo: CampoFicha) {
    if (campo.mostrarSe && !campo.mostrarSe(respostas)) return null;
    const valor = respostas[campo.id];

    if (campo.tipo === "consent") {
      return (
        <LinhaConsent
          key={campo.id}
          texto={campo.rotulo}
          marcado={valor === true}
          onToggle={() => set(campo.id, valor !== true)}
        />
      );
    }

    if (campo.tipo === "checkboxes") {
      return (
        <SeletorMulti
          key={campo.id}
          rotulo={campo.rotulo}
          opcoes={campo.opcoes ?? []}
          valores={(valor as string[]) ?? []}
          onToggle={(op) => toggleCheckbox(campo.id, op)}
        />
      );
    }

    if (campo.tipo === "radio") {
      return (
        <SeletorUnico
          key={campo.id}
          rotulo={campo.rotulo}
          opcoes={campo.opcoes ?? []}
          valor={(valor as string) ?? ""}
          onChange={(v) => set(campo.id, v)}
        />
      );
    }

    if (campo.tipo === "texto" || campo.tipo === "textarea") {
      return (
        <Campo
          key={campo.id}
          rotulo={campo.rotulo}
          value={(valor as string) ?? ""}
          onChangeText={(t) => set(campo.id, t)}
          multiline={campo.tipo === "textarea"}
          style={campo.tipo === "textarea" ? { minHeight: 90, paddingTop: espaco.sm, textAlignVertical: "top" } : undefined}
        />
      );
    }

    if (campo.tipo === "medicamentos") {
      return (
        <View key={campo.id} style={{ marginBottom: espaco.md }}>
          <Text style={estilos.perguntaMed}>{campo.rotulo}</Text>
          {meds().map((m, i) => (
            <View key={i} style={estilos.medCartao}>
              <View style={estilos.medTopo}>
                <Text style={estilos.medNum}>Medicamento {i + 1}</Text>
                <Pressable onPress={() => removeMed(i)} hitSlop={8} accessibilityLabel="Remover medicamento">
                  <Ionicons name="trash-outline" size={20} color={cores.vermelho} />
                </Pressable>
              </View>
              <Campo rotulo="Nome" value={m.nome} onChangeText={(t) => setMed(i, "nome", t)} />
              <Campo rotulo="Dosagem" value={m.dosagem} onChangeText={(t) => setMed(i, "dosagem", t)} />
              <Campo rotulo="Frequência" value={m.frequencia} onChangeText={(t) => setMed(i, "frequencia", t)} />
              <Campo rotulo="Motivo" value={m.motivo} onChangeText={(t) => setMed(i, "motivo", t)} />
            </View>
          ))}
          <Botao titulo="+ Adicionar medicamento" variante="contorno" onPress={addMed} />
        </View>
      );
    }

    return null;
  }

  if (!usuario) return null;

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.topoBar}>
        <Ionicons name="arrow-back" size={26} color={cores.tinta} onPress={() => router.back()} />
        <Text style={estilos.topoTitulo}>Ficha médica</Text>
        <View style={{ width: 26 }} />
      </View>

      {carregando ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color={cores.azulEscuro} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
            <Text style={estilos.intro}>
              Essas informações ajudam a Zela a contextualizar a sua triagem. Preencha
              o que souber, você pode atualizar quando quiser. Não substitui avaliação
              profissional.
            </Text>

            {temEmergencia(respostas) && (
              <View style={estilos.emergencia}>
                <Text style={estilos.emergenciaTxt}>
                  <Text style={{ fontWeight: "800" }}>Sinal de emergência marcado. </Text>
                  Se você está passando por isso agora, não espere a ficha: ligue para o
                  SAMU 192 ou vá ao serviço de emergência mais próximo.
                </Text>
              </View>
            )}

            {SECOES.map((secao) => (
              <View key={secao.id} style={estilos.secao}>
                <Text style={estilos.secaoTitulo}>{secao.titulo}</Text>
                {secao.descricao && <Text style={estilos.secaoDesc}>{secao.descricao}</Text>}
                {secao.campos.map(renderCampo)}
              </View>
            ))}

            {erro && <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text>}
            {sucesso && <Text style={estilos.sucesso} accessibilityRole="alert">{sucesso}</Text>}

            <Botao titulo="Salvar ficha" onPress={salvar} carregando={salvando} style={{ marginTop: espaco.sm }} />
            <Botao
              titulo="Salvar em PDF"
              variante="contorno"
              onPress={exportarPdf}
              style={{ marginTop: espaco.sm }}
            />

            <View style={{ height: espaco.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  intro: { fontSize: fonte.base, color: cores.textoSuave, lineHeight: 24, marginBottom: espaco.lg },
  emergencia: {
    backgroundColor: cores.vermelhoSuave,
    borderLeftWidth: 4,
    borderLeftColor: cores.vermelho,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.lg,
  },
  emergenciaTxt: { fontSize: fonte.base, color: cores.tinta, lineHeight: 23 },
  secao: {
    marginBottom: espaco.lg,
    paddingBottom: espaco.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  secaoTitulo: { fontSize: fonte.medio, fontWeight: "800", color: cores.azulProfundo, marginBottom: espaco.sm },
  secaoDesc: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20, marginBottom: espaco.md },
  perguntaMed: { fontSize: fonte.pequeno, fontWeight: "700", color: cores.tinta, marginBottom: espaco.sm },
  medCartao: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.md,
    padding: espaco.md,
    marginBottom: espaco.md,
  },
  medTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: espaco.sm },
  medNum: { fontSize: fonte.pequeno, fontWeight: "800", color: cores.textoSuave },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginTop: espaco.sm },
  sucesso: { color: cores.verde, fontSize: fonte.base, marginTop: espaco.sm, fontWeight: "600" },
});
