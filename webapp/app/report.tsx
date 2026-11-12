import { Alert, ScrollView, Text } from "react-native";
import { Body, Button, Card, Eyebrow, Heading, Page, SectionTitle, Tag, palette } from "@/components/lab-ui";

const items = ["Relatório completo em PDF", "Diagnóstico financeiro", "Análise de mercado", "Análise de sobrevivência", "Cenários e plano de ação", "Quatro encontros individuais de mentoria", "Acompanhamento mensal por três meses"];
export default function ReportScreen() {
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page><Eyebrow>PLANO COMPLETO · TESTE</Eyebrow><Heading>Transforme sua análise em um plano de decisão.</Heading><Body>Uma leitura mais completa para ajudar você a decidir com mais clareza, sem promessa de resultado.</Body>
    <Card style={{ backgroundColor: palette.navy, borderColor: palette.navy }}><Tag>COMPRA ÚNICA PARCELADA</Tag><Text style={{ color: "white", fontSize: 34, fontWeight: "800" }}>10 × R$ 199</Text><Text style={{ color: "#D3E0E3", fontSize: 15 }}>Total de R$ 1.990 · sem cobrança recorrente</Text></Card>
    <Card><SectionTitle title="O que inclui" />{items.map((item) => <Text key={item} style={{ color: palette.ink, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: palette.line }}>✓  {item}</Text>)}</Card>
    <Card><SectionTitle title="Pagamento ainda não conectado" subtitle="Mercado Pago ou Asaas precisam ser configurados antes de abrir o checkout." /><Body>Nenhum pagamento será iniciado nem marcado como aprovado nesta versão.</Body><Button title="Integração de pagamento pendente" disabled onPress={() => Alert.alert("Integração pendente", "Nenhuma cobrança foi feita.")} /></Card>
  </Page></ScrollView>;
}
