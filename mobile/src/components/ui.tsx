import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { cores, espaco, fonte, raio } from "@/theme";

/** Botão grande e acessível (alvo de toque confortável). */
export function Botao({
  titulo,
  onPress,
  variante = "primario",
  carregando = false,
  desabilitado = false,
  style,
}: {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "contorno" | "perigo";
  carregando?: boolean;
  desabilitado?: boolean;
  style?: ViewStyle;
}) {
  const off = desabilitado || carregando;
  const base: ViewStyle[] = [estilos.botao];
  if (variante === "primario") base.push(estilos.botaoPrimario);
  if (variante === "contorno") base.push(estilos.botaoContorno);
  if (variante === "perigo") base.push(estilos.botaoPerigo);
  if (off) base.push(estilos.botaoOff);
  if (style) base.push(style);

  const corTexto =
    variante === "contorno" ? cores.azulProfundo : cores.branco;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={base}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

/** Campo de texto com rótulo grande. */
export function Campo({
  rotulo,
  style,
  ...props
}: { rotulo: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textoSuave}
        style={[estilos.input, style]}
        {...props}
      />
    </View>
  );
}

/** Cartão branco com borda e sombra leve. */
export function Cartao({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

/** Grupo de opções de seleção única (tipo radio), em "chips". */
export function SeletorUnico({
  rotulo,
  opcoes,
  valor,
  onChange,
  opcional = false,
}: {
  rotulo?: string;
  opcoes: readonly string[];
  valor: string | null | undefined;
  onChange: (v: string) => void;
  opcional?: boolean;
}) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      <View style={estilos.chips}>
        {opcoes.map((op) => {
          const ativo = valor === op;
          return (
            <Pressable
              key={op}
              onPress={() => onChange(opcional && ativo ? "" : op)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
            >
              <Text style={[estilos.chipTxt, ativo && estilos.chipTxtAtivo]}>{op}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Grupo de opções de múltipla seleção (checkboxes), em "chips". */
export function SeletorMulti({
  rotulo,
  opcoes,
  valores,
  onToggle,
}: {
  rotulo?: string;
  opcoes: readonly string[];
  valores: string[];
  onToggle: (op: string) => void;
}) {
  return (
    <View style={{ marginBottom: espaco.md }}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      <View style={estilos.chips}>
        {opcoes.map((op) => {
          const ativo = valores.includes(op);
          return (
            <Pressable
              key={op}
              onPress={() => onToggle(op)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ativo }}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
            >
              <Text style={[estilos.chipTxt, ativo && estilos.chipTxtAtivo]}>{op}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Linha de consentimento (caixa de seleção + texto). */
export function LinhaConsent({
  texto,
  marcado,
  onToggle,
}: {
  texto: string;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      style={estilos.consent}
    >
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado ? <Text style={estilos.caixaCheck}>✓</Text> : null}
      </View>
      <Text style={estilos.consentTxt}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    minHeight: 54,
    borderRadius: raio.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espaco.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  botaoPrimario: { backgroundColor: cores.azulEscuro },
  botaoContorno: { backgroundColor: "transparent", borderColor: cores.linha },
  botaoPerigo: { backgroundColor: cores.vermelho },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { fontSize: fonte.medio, fontWeight: "700" },

  rotulo: {
    fontSize: fonte.pequeno,
    fontWeight: "700",
    color: cores.tinta,
    marginBottom: espaco.sm,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
    fontSize: fonte.base,
    color: cores.tinta,
    backgroundColor: cores.branco,
  },

  cartao: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.lg,
    padding: espaco.lg,
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: espaco.sm },
  chip: {
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.branco,
    borderRadius: raio.pill,
    paddingHorizontal: espaco.md,
    paddingVertical: 10,
  },
  chipAtivo: { borderColor: cores.azulEscuro, backgroundColor: cores.fundoSuave },
  chipTxt: { fontSize: fonte.base, color: cores.texto },
  chipTxtAtivo: { color: cores.azulProfundo, fontWeight: "700" },

  consent: {
    flexDirection: "row",
    gap: espaco.sm,
    alignItems: "flex-start",
    paddingVertical: espaco.sm,
  },
  caixa: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.linha,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  caixaMarcada: { backgroundColor: cores.azulEscuro, borderColor: cores.azulEscuro },
  caixaCheck: { color: cores.branco, fontWeight: "900", fontSize: 16 },
  consentTxt: { flex: 1, fontSize: fonte.base, color: cores.texto, lineHeight: 23 },
});
