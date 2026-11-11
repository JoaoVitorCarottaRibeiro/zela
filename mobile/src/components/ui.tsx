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
});
