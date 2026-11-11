import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { Body, Button, Card, Eyebrow, Field, Heading, Page, SectionTitle, Tag, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";

export default function SalesTestScreen() {
  const router = useRouter();
  const { data, update } = useAppData();
  const [days, setDays] = useState("1"); const [approached, setApproached] = useState("0"); const [interested, setInterested] = useState("0");
  const [intent, setIntent] = useState("0"); const [bought, setBought] = useState("0"); const [price, setPrice] = useState(String(data.finance.averageTicket));
  const save = async () => {
    const item = { days: Number(days) || 0, approached: Number(approached) || 0, interested: Number(interested) || 0, intendToBuy: Number(intent) || 0, bought: Number(bought) || 0, price: Number(price) || 0, createdAt: new Date().toISOString() };
    await update({ salesTests: [...data.salesTests, item], finance: { ...data.finance, averageTicket: item.price || data.finance.averageTicket } });
    router.back();
  };
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page><Eyebrow>VALIDAÇÃO COM CLIENTES</Eyebrow><Heading>Teste sua ideia antes de investir.</Heading><Body>Registre o que aconteceu. Uma amostra pequena descreve apenas as pessoas abordadas; não representa todo o mercado.</Body>
    <Card><SectionTitle title="Sobre o teste" /><Field label="Quantos dias durou?" value={days} onChangeText={setDays} keyboardType="numeric" /><Field label="Quantas pessoas você abordou?" value={approached} onChangeText={setApproached} keyboardType="numeric" /><Field label="Quantas demonstraram interesse?" value={interested} onChangeText={setInterested} keyboardType="numeric" /><Field label="Quantas disseram que comprariam?" value={intent} onChangeText={setIntent} keyboardType="numeric" /><Field label="Quantas efetivamente compraram?" value={bought} onChangeText={setBought} keyboardType="numeric" /><Field label="Preço testado (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></Card>
    <Card><Tag>OBSERVAÇÃO DA SUA AMOSTRA</Tag><Text style={{ color: palette.ink }}>Testes registrados: {data.salesTests.length}</Text>{data.salesTests.length > 0 ? <Body>Último teste: {data.salesTests[data.salesTests.length - 1].bought} compras entre {data.salesTests[data.salesTests.length - 1].approached} pessoas abordadas.</Body> : <Body>Depois de salvar, você verá seus registros aqui. Não calculamos uma taxa de conversão de mercado.</Body>}</Card>
    <Button title="Salvar teste e ajustar meu ticket" onPress={() => void save()} /><Button title="Cancelar" secondary onPress={() => router.back()} />
  </Page></ScrollView>;
}
