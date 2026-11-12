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
import { ApiError, buscarCep } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GENEROS, IDENTIDADES_GENERO } from "@/lib/opcoes";
import { Botao, Campo, SeletorUnico } from "@/components/ui";
import { cores, espaco, fonte } from "@/theme";

export default function Cadastro() {
  const { cadastrar } = useAuth();

  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [identidadeGenero, setIdentidadeGenero] = useState("");

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    setCep(digitos);
    setAvisoCep(null);
    if (digitos.length === 8) {
      setBuscandoCep(true);
      const end = await buscarCep(digitos);
      setBuscandoCep(false);
      if (end) {
        setLogradouro(end.logradouro);
        setBairro(end.bairro);
        setCidade(end.cidade);
        setUf(end.uf);
      } else {
        setAvisoCep("CEP não encontrado. Preencha o endereço manualmente.");
      }
    }
  }

  function validar(): string | null {
    if (nome.trim().length < 3) return "Informe seu nome completo.";
    if (!nascimento.trim()) return "Informe sua data de nascimento.";
    if (cpf.length !== 11) return "O CPF deve ter 11 dígitos (somente números).";
    if (cep.length !== 8) return "Informe um CEP válido (8 dígitos).";
    if (!logradouro.trim()) return "Informe o endereço.";
    if (!bairro.trim()) return "Informe o bairro.";
    if (!cidade.trim()) return "Informe a cidade.";
    if (uf.trim().length !== 2) return "Informe o estado (UF).";
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    if (!/[A-Z]/.test(senha)) return "A senha precisa de ao menos uma letra maiúscula.";
    if (!/\d/.test(senha)) return "A senha precisa de ao menos um número.";
    if (!/[^A-Za-z0-9]/.test(senha))
      return "A senha precisa de ao menos um caractere especial.";
    if (senha !== confirmar) return "As senhas não conferem.";
    return null;
  }

  async function aoCadastrar() {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      await cadastrar({
        nome_completo: nome.trim(),
        data_nascimento: nascimento.trim(),
        cpf,
        senha,
        confirmar_senha: confirmar,
        email: email.trim() || null,
        genero: genero || null,
        identidade_genero: identidadeGenero || null,
        cep,
        logradouro: logradouro.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim(),
        complemento: complemento.trim() || null,
      });
      router.replace("/(tabs)/triagem");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.corpo} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo}>Criar conta</Text>
          <Text style={estilos.sub}>
            Preencha seus dados. A senha precisa de 6+ caracteres, com maiúscula,
            número e símbolo.
          </Text>

          <Text style={estilos.grupo}>Dados pessoais</Text>
          <Campo rotulo="Nome completo *" value={nome} onChangeText={setNome} placeholder="Seu nome" />
          <Campo
            rotulo="Data de nascimento *"
            value={nascimento}
            onChangeText={setNascimento}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Campo
            rotulo={`CPF *  (${cpf.length}/11)`}
            value={cpf}
            onChangeText={(t) => setCpf(t.replace(/\D/g, "").slice(0, 11))}
            keyboardType="number-pad"
            placeholder="Somente números"
          />
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
          <Campo
            rotulo="CEP *"
            value={cep}
            onChangeText={aoMudarCep}
            keyboardType="number-pad"
            placeholder="Somente números"
          />
          {buscandoCep ? (
            <Text style={estilos.ajuda}>Buscando endereço…</Text>
          ) : avisoCep ? (
            <Text style={estilos.ajuda}>{avisoCep}</Text>
          ) : null}
          <Campo rotulo="Endereço *" value={logradouro} onChangeText={setLogradouro} placeholder="Rua, avenida…" />
          <Campo rotulo="Bairro *" value={bairro} onChangeText={setBairro} placeholder="Seu bairro" />
          <Campo rotulo="Cidade *" value={cidade} onChangeText={setCidade} placeholder="Sua cidade" />
          <Campo
            rotulo="Estado (UF) *"
            value={uf}
            onChangeText={(t) => setUf(t.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
            autoCapitalize="characters"
            placeholder="SP"
          />
          <Campo
            rotulo="Complemento"
            value={complemento}
            onChangeText={setComplemento}
            placeholder="Apto, bloco, referência…"
          />

          <Text style={estilos.grupo}>Senha</Text>
          <Campo rotulo="Senha *" value={senha} onChangeText={setSenha} secureTextEntry placeholder="Crie uma senha" />
          <Campo
            rotulo="Confirmar senha *"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Repita a senha"
          />

          {erro && (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erro}
            </Text>
          )}

          <Botao titulo="Criar conta" onPress={aoCadastrar} carregando={carregando} style={{ marginTop: espaco.sm }} />

          <Pressable onPress={() => router.replace("/login")} style={{ marginTop: espaco.lg }}>
            <Text style={estilos.link}>Já tem conta? Entrar</Text>
          </Pressable>

          <View style={{ height: espaco.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  corpo: { padding: espaco.lg, paddingTop: espaco.xl },
  titulo: { fontSize: fonte.titulo, fontWeight: "800", color: cores.tinta },
  sub: { fontSize: fonte.base, color: cores.textoSuave, marginTop: espaco.sm, marginBottom: espaco.lg, lineHeight: 24 },
  grupo: {
    fontSize: fonte.medio,
    fontWeight: "800",
    color: cores.azulProfundo,
    marginTop: espaco.sm,
    marginBottom: espaco.md,
  },
  ajuda: { fontSize: fonte.pequeno, color: cores.textoSuave, marginTop: -espaco.sm, marginBottom: espaco.md },
  erro: { color: cores.vermelho, fontSize: fonte.base, marginBottom: espaco.sm },
  link: { color: cores.azulProfundo, fontSize: fonte.base, fontWeight: "600", textAlign: "center" },
});
