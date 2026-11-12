import { useState } from "react";
import {
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
import { ApiError, atualizarPerfil, buscarCep } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GENEROS, IDENTIDADES_GENERO } from "@/lib/opcoes";
import { Botao, Campo, Cartao, SeletorUnico } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function cpfFormatado(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function Perfil() {
  const { usuario, token, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(usuario?.nome_completo ?? "");
  const [nascimento, setNascimento] = useState(usuario?.data_nascimento ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [genero, setGenero] = useState(usuario?.genero ?? "");
  const [identidadeGenero, setIdentidadeGenero] = useState(usuario?.identidade_genero ?? "");

  const [cep, setCep] = useState(usuario?.cep ?? "");
  const [logradouro, setLogradouro] = useState(usuario?.logradouro ?? "");
  const [bairro, setBairro] = useState(usuario?.bairro ?? "");
  const [cidade, setCidade] = useState(usuario?.cidade ?? "");
  const [uf, setUf] = useState(usuario?.uf ?? "");
  const [complemento, setComplemento] = useState(usuario?.complemento ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!usuario) return null;

  const anoMembro = new Date(usuario.criado_em).getFullYear();

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    setCep(digitos);
    if (digitos.length === 8) {
      setBuscandoCep(true);
      const end = await buscarCep(digitos);
      setBuscandoCep(false);
      if (end) {
        setLogradouro(end.logradouro);
        setBairro(end.bairro);
        setCidade(end.cidade);
        setUf(end.uf);
      }
    }
  }

  function validar(): string | null {
    if (nome.trim().length < 3) return "Informe seu nome completo.";
    if (!nascimento.trim()) return "Informe sua data de nascimento.";
    if (cep && cep.replace(/\D/g, "").length !== 8)
      return "O CEP deve ter 8 dígitos (ou deixe em branco).";
    if (uf && uf.trim().length !== 2) return "Informe o estado (UF) com 2 letras.";
    return null;
  }

  async function salvar() {
    const problema = validar();
    if (problema) {
      setErro(problema);
      setSucesso(null);
      return;
    }
    if (!token) return;
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil(token, {
        nome_completo: nome.trim(),
        data_nascimento: nascimento.trim(),
        email: email.trim() || null,
        genero: genero || null,
        identidade_genero: identidadeGenero || null,
        cep: cep.trim() || null,
        logradouro: logradouro.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        complemento: complemento.trim() || null,
      });
      atualizarUsuario(atualizado);
      setSucesso("Perfil atualizado com sucesso.");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.topoBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={26} color={cores.tinta} />
        </Pressable>
        <Text style={estilos.topoTitulo}>Meu perfil</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecalhoPerfil}>
            <View style={estilos.avatar}>
              <Text style={estilos.avatarTxt}>{iniciais(usuario.nome_completo)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.nome}>{usuario.nome_completo}</Text>
              <Text style={estilos.membro}>Membro desde {anoMembro}</Text>
            </View>
          </View>

          {!usuario.email && (
            <View style={estilos.dica}>
              <Text style={estilos.dicaTxt}>
                <Text style={{ fontWeight: "800" }}>Dica de segurança: </Text>
                adicione um e-mail para recuperar o acesso caso esqueça a senha.
              </Text>
            </View>
          )}

          <Text style={estilos.grupo}>Dados pessoais</Text>
          <Campo rotulo="Nome completo *" value={nome} onChangeText={setNome} />
          <Campo
            rotulo="Data de nascimento *"
            value={nascimento}
            onChangeText={setNascimento}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Campo rotulo="CPF (não pode ser alterado)" value={cpfFormatado(usuario.cpf)} editable={false} />
          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@exemplo.com"
          />
          <SeletorUnico rotulo="Gênero" opcoes={GENEROS} valor={genero} onChange={setGenero} opcional />
          <SeletorUnico
            rotulo="Identidade de gênero"
            opcoes={IDENTIDADES_GENERO}
            valor={identidadeGenero}
            onChange={setIdentidadeGenero}
            opcional
          />

          <Text style={estilos.grupo}>Endereço</Text>
          <Campo rotulo="CEP" value={cep} onChangeText={aoMudarCep} keyboardType="number-pad" placeholder="Somente números" />
          {buscandoCep && <Text style={estilos.ajuda}>Buscando endereço…</Text>}
          <Campo rotulo="Endereço" value={logradouro} onChangeText={setLogradouro} />
          <Campo rotulo="Bairro" value={bairro} onChangeText={setBairro} />
          <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} />
          <Campo
            rotulo="Estado (UF)"
            value={uf}
            onChangeText={(t) => setUf(t.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
            autoCapitalize="characters"
            placeholder="SP"
          />
          <Campo rotulo="Complemento" value={complemento} onChangeText={setComplemento} />

          {erro && <Text style={estilos.erro} accessibilityRole="alert">{erro}</Text>}
          {sucesso && <Text style={estilos.sucesso} accessibilityRole="alert">{sucesso}</Text>}

          <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} style={{ marginTop: espaco.sm }} />

          <Cartao style={{ marginTop: espaco.lg }}>
            <Text style={estilos.segTitulo}>Segurança</Text>
            <Botao
              titulo="Trocar senha"
              variante="contorno"
              onPress={() => router.push("/trocar-senha")}
              style={{ marginTop: espaco.md }}
            />
          </Cartao>

          <View style={{ height: espaco.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  cabecalhoPerfil: { flexDirection: "row", alignItems: "center", gap: espaco.md, marginBottom: espaco.lg },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: cores.azul,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: cores.branco, fontSize: fonte.medio, fontWeight: "800" },
  nome: { fontSize: fonte.grande, fontWeight: "800", color: cores.tinta },
  membro: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: 2 },
  dica: {
    backgroundColor: cores.amareloSuave,
    borderRadius: 12,
    padding: espaco.md,
    marginBottom: espaco.md,
  },
  dicaTxt: { fontSize: fonte.pequeno, color: cores.texto, lineHeight: 20 },
  grupo: {
    fontSize: fonte.medio,
    fontWeight: "800",
    color: cores.azulProfundo,
    marginTop: espaco.md,
    marginBottom: espaco.md,
  },
  ajuda: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: -espaco.sm, marginBottom: espaco.md },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginTop: espaco.sm },
  sucesso: { color: cores.verde, fontSize: fonte.base, marginTop: espaco.sm, fontWeight: "600" },
  segTitulo: { fontSize: fonte.medio, fontWeight: "800", color: cores.tinta },
});
