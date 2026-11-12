import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Eyebrow, Field, Heading, Page, SectionTitle, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

export default function ProfileScreen() {
  const router = useRouter();
  const { data, update, importGuestDraft } = useAppData();
  const { user, isAuthenticated, logout } = useAuth();
  const [notice, setNotice] = useState("");
  const updateProfile = (key: keyof typeof data.profile, value: string) => void update({ profile: { ...data.profile, [key]: value } });
  const login = async () => {
    try { await startOAuthLogin(); }
    catch { Alert.alert("Login indisponível", "A configuração de login Manus não está disponível nesta execução."); }
  };
  const finishImport = async () => {
    try {
      const imported = await importGuestDraft();
      setNotice(imported ? "Rascunho importado e sincronizado com esta conta." : "Nenhum rascunho local foi encontrado.");
    } catch {
      setNotice("A importação falhou; o rascunho local foi mantido neste aparelho.");
    }
  };
  const requestImport = () => {
    const message = "Copiar o rascunho deste aparelho para esta conta? Isso combina as informações do rascunho com os dados atuais da conta.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) void finishImport();
      return;
    }
    Alert.alert("Importar rascunho?", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Importar", onPress: () => void finishImport() },
    ]);
  };
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page>
    <Eyebrow>PERFIL</Eyebrow><Heading>Seus dados, sob seu controle.</Heading>
    <Card><SectionTitle title={isAuthenticated ? "Conta conectada" : "Entre para sincronizar"} subtitle={isAuthenticated ? (user?.email || "Sessão Manus ativa") : "Este app usa login Manus real. Não há verificação falsa por WhatsApp ou senha local."} />
      {!isAuthenticated ? <Button title="Entrar com Manus" onPress={() => void login()} /> : <Button title="Sair da conta" secondary onPress={() => void logout()} />}
      {!isAuthenticated ? <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>Rascunhos de convidado ficam isolados neste aparelho; não são copiados automaticamente para nenhuma conta. O WhatsApp é um dado de perfil e não é verificado nesta versão.</Text> : null}
      {isAuthenticated ? <><Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>Os dados locais desta conta são separados dos rascunhos de convidado e de outras contas.</Text><Button title="Importar rascunho deste aparelho" secondary onPress={requestImport} />{notice ? <Text style={{ color: palette.teal, fontSize: 13 }}>{notice}</Text> : null}</> : null}
    </Card>
    <Card><SectionTitle title="Sobre você" subtitle="Dados usados no seu próprio planejamento." />
      <Field label="Nome" value={data.profile.name} onChangeText={(v) => updateProfile("name", v)} placeholder={user?.name || "Seu nome"} />
      <Field label="WhatsApp" value={data.profile.whatsapp} onChangeText={(v) => updateProfile("whatsapp", v)} placeholder="(82) 9 0000-0000" keyboardType="phone-pad" helper="Não validamos nem enviamos mensagens sem integração conectada." />
      <Field label="E-mail" value={data.profile.email || user?.email || ""} onChangeText={(v) => updateProfile("email", v)} placeholder="voce@exemplo.com" keyboardType="email-address" />
      <Field label="Cidade onde mora" value={data.profile.homeCity} onChangeText={(v) => updateProfile("homeCity", v)} placeholder="Município" />
      <Text style={{ color: palette.muted, fontSize: 13 }}>Aceite dos termos e política: {data.profile.termsAccepted ? "registrado" : "ainda não registrado"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name={data.profile.marketingConsent ? "checkbox" : "square-outline"} size={20} color={palette.teal} /><Text onPress={() => void update({ profile: { ...data.profile, marketingConsent: !data.profile.marketingConsent } })} style={{ flex: 1, color: palette.ink, lineHeight: 20 }}>Quero receber conteúdo e ofertas (opcional)</Text></View>
    </Card>
    <Card><SectionTitle title="Privacidade e dados" subtitle="Veja solicitações, exporte seu planejamento ou solicite exclusão." /><Button title="Abrir privacidade" onPress={() => router.push("/privacy")} secondary /></Card>
    <Card><SectionTitle title="Cobertura inicial" subtitle="Alagoas · nomes municipais consultados na fonte oficial do IBGE." /><Text style={{ color: palette.muted, fontSize: 13 }}>Análises locais de concorrência e sobrevivência ainda dependem de bases e métodos validados.</Text></Card>
  </Page></ScrollView>;
}
