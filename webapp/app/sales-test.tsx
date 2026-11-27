import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Body, Button, Card, Choice, Eyebrow, Field, Heading, Page, SectionTitle, Tag, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { TopBar, useVoltar } from "@/components/top-bar";
import { registrarEvento } from "@/shared/leads";
import { alavancasIniciais } from "@/shared/plano";
import { validarTesteVendas, type TesteVendasForm } from "@/shared/validation";

const VAZIO: TesteVendasForm = { days: "", approached: "", interested: "", intent: "", bought: "", price: "" };

export default function SalesTestScreen() {
  const voltar = useVoltar();
  const { data, update } = useAppData();
  const precoDoPlano = alavancasIniciais(data).preco;
  // Campos começam vazios: no navegador, um "0" já escrito fazia "25" virar "025" e o preço R$ 45 virar R$ 4.525.
  const [form, setForm] = useState<TesteVendasForm>({ ...VAZIO, price: String(precoDoPlano) });
  const [usarPreco, setUsarPreco] = useState(false);
  const [tentou, setTentou] = useState(false);
  const set = (k: keyof TesteVendasForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { erros, valores } = validarTesteVendas(form);
  const ok = Object.keys(erros).length === 0 && valores !== null;

  const save = async () => {
    setTentou(true);
    if (!ok || !valores) return;
    const item = { ...valores, createdAt: new Date().toISOString() };
    const feitos = Array.from(new Set([...data.completedMissions, "price", "customers"]));
    const patch: Parameters<typeof update>[0] = { salesTests: [...data.salesTests, item], completedMissions: feitos };
    // O preço do plano só muda se a pessoa pedir.
    if (usarPreco && valores.price !== precoDoPlano) patch.plano = { ...alavancasIniciais(data), preco: valores.price };
    await update(patch);
    void registrarEvento("teste_clientes", { atividade: data.idea.activity, municipioCodigo: data.idea.municipalityCode });
    voltar();
  };

  const erro = (k: keyof TesteVendasForm) => (tentou ? erros[k] : undefined);
  const ultimo = data.salesTests[data.salesTests.length - 1];

  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page><TopBar /><Eyebrow>VALIDAÇÃO COM CLIENTES</Eyebrow><Heading>Teste sua ideia antes de investir.</Heading><Body>Registre o que aconteceu. Uma amostra pequena descreve apenas as pessoas abordadas; não representa todo o mercado.</Body>
    <Card><SectionTitle title="Sobre o teste" />
      <Field label="Quantos dias durou?" value={form.days} onChangeText={set("days")} placeholder="Ex.: 3" keyboardType="number-pad" error={erro("days")} />
      <Field label="Quantas pessoas você abordou?" value={form.approached} onChangeText={set("approached")} placeholder="Ex.: 20" keyboardType="number-pad" error={erro("approached")} />
      <Field label="Quantas demonstraram interesse?" value={form.interested} onChangeText={set("interested")} placeholder="Ex.: 8" keyboardType="number-pad" error={erro("interested")} />
      <Field label="Quantas disseram que comprariam?" value={form.intent} onChangeText={set("intent")} placeholder="Ex.: 5" keyboardType="number-pad" error={erro("intent")} />
      <Field label="Quantas efetivamente compraram?" value={form.bought} onChangeText={set("bought")} placeholder="Ex.: 3" keyboardType="number-pad" error={erro("bought")} />
      <Field label="Preço testado (R$)" value={form.price} onChangeText={set("price")} placeholder={`Ex.: ${precoDoPlano}`} keyboardType="decimal-pad" error={erro("price")} helper={`Hoje seu plano usa R$ ${String(precoDoPlano).replace(".", ",")}.`} />
      <Choice label="Usar este preço no meu plano" detail="Se não marcar, o teste fica registrado e o plano não muda." selected={usarPreco} onPress={() => setUsarPreco((v) => !v)} />
    </Card>
    {tentou && !ok ? <Text accessibilityRole="alert" style={{ color: palette.red, fontWeight: "700" }}>Confira os campos marcados acima.</Text> : null}
    <Card><Tag>OBSERVAÇÃO DA SUA AMOSTRA</Tag><Text style={{ color: palette.ink }}>Testes registrados: {data.salesTests.length}</Text>{ultimo ? <Body>Último teste: {ultimo.bought} compras entre {ultimo.approached} pessoas abordadas, a R$ {String(ultimo.price).replace(".", ",")}.</Body> : <Body>Depois de salvar, você verá seus registros aqui. Não calculamos uma taxa de conversão de mercado.</Body>}</Card>
    <Button title="Salvar teste" onPress={() => void save()} /><Button title="Cancelar" secondary onPress={() => voltar()} />
  </Page></ScrollView>;
}
