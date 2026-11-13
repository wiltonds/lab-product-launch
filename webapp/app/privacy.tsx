import { Alert, Platform, ScrollView, Share, Text } from "react-native";
import { Body, Button, Card, Eyebrow, Heading, Page, SectionTitle, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";

function notify(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
export default function PrivacyScreen() {
  const { data, update, getLatestData, isAuthenticated } = useAppData();
  const exportData = async () => {
    try {
      const createdAt = new Date().toISOString();
      const next = await update({ privacyRequests: [...data.privacyRequests, { type: "export", createdAt, status: "solicitada" }] });
      const completeData = await getLatestData(next);
      await Share.share({ title: "Exportação — Vinga", message: JSON.stringify(completeData, null, 2) });
    } catch {
      notify("Exportação indisponível", "Não foi possível carregar todos os dados da conta. Nenhum arquivo incompleto foi compartilhado; tente novamente.");
    }
  };
  const saveDeletionRequest = () => void update({ privacyRequests: [...data.privacyRequests, { type: "deletion", createdAt: new Date().toISOString(), status: "solicitada" }] });
  const requestDeletion = () => {
    const message = "Esta ação registra uma solicitação. Ela não apaga automaticamente os dados da conta nesta versão.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Solicitar exclusão?\n\n${message}`)) saveDeletionRequest();
      return;
    }
    Alert.alert("Solicitar exclusão?", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Registrar solicitação", style: "destructive", onPress: saveDeletionRequest },
    ]);
  };
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page><Eyebrow>PRIVACIDADE</Eyebrow><Heading>Seus dados pertencem a você.</Heading><Body>Veja o que está salvo neste planejamento e escolha o próximo passo.</Body>
    <Card><SectionTitle title="Exportar dados" subtitle={isAuthenticated ? "Busca os dados salvos na conta e inclui as alterações locais recentes." : "Compartilha o rascunho salvo localmente neste aparelho."} /><Button title="Compartilhar meus dados" onPress={() => void exportData()} secondary /></Card>
    <Card><SectionTitle title="Solicitar exclusão" subtitle="Uma solicitação fica registrada para tratamento; esta versão não remove automaticamente sua conta ou os dados do servidor." /><Button title="Registrar pedido de exclusão" onPress={requestDeletion} secondary /></Card>
    <Card><SectionTitle title="Termos e política" /><Text style={{ color: palette.muted, lineHeight: 21 }}>Os dados profissionais e financeiros informados servem para organizar cenários e atividades. Conteúdo e ofertas são opcionais. O WhatsApp não é verificado nem usado para mensagens nesta versão. Dados sincronizados ficam associados à conta Manus quando você entra.</Text></Card>
    <Card><SectionTitle title="Solicitações registradas" />{data.privacyRequests.length ? data.privacyRequests.map((request, i) => <Text key={`${request.createdAt}-${i}`} style={{ color: palette.ink, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: palette.line }}>{request.type === "export" ? "Exportação" : "Exclusão"} · {new Date(request.createdAt).toLocaleDateString("pt-BR")} · solicitada</Text>) : <Body>Nenhuma solicitação registrada.</Body>}</Card>
    <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>Solicitações de exclusão sincronizadas com a conta exigem atendimento operacional até existir um fluxo automático de exclusão.</Text>
  </Page></ScrollView>;
}
