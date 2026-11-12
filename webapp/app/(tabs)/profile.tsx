import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Eyebrow, Field, Heading, Page, SectionTitle, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/shared/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const { data, update, importGuestDraft } = useAppData();
  const { user, isAuthenticated, logout } = useAuth();
  const [notice, setNotice] = useState("");
  const updateProfile = (key: keyof typeof data.profile, value: string) => void update({ profile: { ...data.profile, [key]: value } });
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
    <Card><SectionTitle title={data.profile.verified ? "Conta confirmada" : "Crie sua conta grátis"} subtitle={data.profile.verified ? data.profile.email : "Salve sua análise e acesse de qualquer aparelho. Sem senha: você entra com um código no e-mail."} />
      {data.profile.verified
        ? <Button title="Sair da conta" secondary onPress={() => void (async () => { await signOut(); await update({ profile: { ...data.profile, verified: false } }); })()} />
        : <><Button title="Criar conta" onPress={() => router.push("/cadastro")} /><Button title="Já tenho conta" secondary onPress={() => router.push("/cadastro?modo=entrar")} /></>}
    </Card>
    <Card><SectionTitle title="Sobre você" subtitle="Dados usados no seu próprio planejamento." />
      <Field label="Nome" value={data.profile.name} onChangeText={(v) => updateProfile("name", v)} placeholder={user?.name || "Seu nome"} />
      <Field label="WhatsApp" value={data.profile.whatsapp} onChangeText={(v) => updateProfile("whatsapp", v)} placeholder="(82) 9 0000-0000" keyboardType="phone-pad" helper="Usado só para falar com você sobre a sua análise." />
      <Field label="E-mail" value={data.profile.email || user?.email || ""} onChangeText={(v) => updateProfile("email", v)} placeholder="voce@exemplo.com" keyboardType="email-address" />
      <Field label="Cidade onde mora" value={data.profile.homeCity} onChangeText={(v) => updateProfile("homeCity", v)} placeholder="Município" />
      <Text style={{ color: palette.muted, fontSize: 13 }}>Aceite dos termos e política: {data.profile.termsAccepted ? "registrado" : "ainda não registrado"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name={data.profile.marketingConsent ? "checkbox" : "square-outline"} size={20} color={palette.teal} /><Text onPress={() => void update({ profile: { ...data.profile, marketingConsent: !data.profile.marketingConsent } })} style={{ flex: 1, color: palette.ink, lineHeight: 20 }}>Quero receber conteúdo e ofertas (opcional)</Text></View>
    </Card>
    <Card><SectionTitle title="Privacidade e dados" subtitle="Veja solicitações, exporte seu planejamento ou solicite exclusão." /><Button title="Abrir privacidade" onPress={() => router.push("/privacy")} secondary /></Card>
    <Card><SectionTitle title="Cobertura inicial" subtitle="Alagoas · nomes municipais consultados na fonte oficial do IBGE." /><Text style={{ color: palette.muted, fontSize: 13 }}>Análises locais de concorrência e sobrevivência ainda dependem de bases e métodos validados.</Text></Card>
  </Page></ScrollView>;
}
