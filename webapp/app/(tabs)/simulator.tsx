import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Card, Page, SectionTitle, Segmented, Stepper, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { calculateScenario, type FinanceInputs, type ScenarioName } from "@/shared/finance";
import { formatMoney } from "@/shared/format";

type Row = { key: keyof FinanceInputs; label: string; step: number; hint?: string; pct?: boolean; count?: boolean; max?: number };
const GROUPS: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; rows: Row[] }[] = [
  { title: "Vendas", subtitle: "O que entra", icon: "trending-up-outline", rows: [
    { key: "averageTicket", label: "Cada cliente gasta", step: 5, hint: "Ticket médio" },
    { key: "customersPerDay", label: "Clientes por dia", step: 1, count: true },
    { key: "operatingDays", label: "Dias abertos no mês", step: 1, count: true, max: 31 },
  ] },
  { title: "Custos fixos", subtitle: "Todo mês, vendendo ou não", icon: "home-outline", rows: [
    { key: "rent", label: "Aluguel", step: 100 },
    { key: "energy", label: "Energia", step: 50 },
    { key: "water", label: "Água", step: 20 },
    { key: "internet", label: "Internet e telefone", step: 20 },
    { key: "employees", label: "Funcionários", step: 200, hint: "Custo total por mês, em R$" },
    { key: "ownerPay", label: "Sua retirada", step: 100, hint: "O seu salário" },
  ] },
  { title: "Custos que acompanham a venda", subtitle: "Produto, insumos, taxas de cartão", icon: "pie-chart-outline", rows: [
    { key: "variableCostPercent", label: "Parte de cada venda", step: 5, pct: true, max: 95 },
  ] },
  { title: "Para abrir", subtitle: "Reforma, equipamentos, estoque inicial", icon: "construct-outline", rows: [
    { key: "initialInvestment", label: "Investimento inicial", step: 1000 },
  ] },
];

const SCENARIOS: { id: ScenarioName; label: string }[] = [{ id: "conservador", label: "Pessimista" }, { id: "intermediario", label: "Seu plano" }, { id: "otimista", label: "Otimista" }];
const SCENARIO_NOTE: Record<ScenarioName, string> = {
  conservador: "30% menos clientes e ticket 10% menor",
  intermediario: "Exatamente os números que você informou",
  otimista: "30% mais clientes e ticket 10% maior",
};

export default function SimulatorScreen() {
  const { data, update } = useAppData();
  const [scenario, setScenario] = useState<ScenarioName>("intermediario");
  const [showMethod, setShowMethod] = useState(false);
  const f = data.finance;
  const r = calculateScenario(f, scenario);
  const positive = r.operatingResult >= 0;
  const set = (key: keyof FinanceInputs, v: number) => void update({ finance: { ...f, [key]: v } });

  const total = Math.max(r.revenue, r.fixedCosts + r.variableCosts, 1);
  const parts = [
    { label: "Custos da venda", value: r.variableCosts, color: "#E8B04B" },
    { label: "Custos fixos", value: r.fixedCosts, color: "#8FB3A6" },
    { label: positive ? "Sobra" : "Falta", value: Math.abs(r.operatingResult), color: positive ? palette.lime : "#FF8F7E" },
  ];

  return <View style={{ flex: 1, backgroundColor: palette.paper }}>
    {/* Resultado sempre visível */}
    <View style={{ backgroundColor: palette.brand, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
      <View style={{ width: "100%", maxWidth: 520, alignSelf: "center", gap: 12 }}>
        <Segmented dark options={SCENARIOS} value={scenario} onChange={setScenario} />
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#BFD8CE", fontSize: 13 }}>{positive ? "Sobra por mês" : "Falta por mês"}</Text>
            <Text style={{ color: positive ? palette.lime : "#FFB4A8", fontSize: 38, fontWeight: "800", letterSpacing: -1.2, ...numStyle }}>{formatMoney(r.operatingResult)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "#BFD8CE", fontSize: 13 }}>Equilíbrio</Text>
            <Text style={{ color: palette.white, fontSize: 20, fontWeight: "800", ...numStyle }}>{r.breakEvenCustomersPerDay === null ? "—" : `${Math.ceil(r.breakEvenCustomersPerDay)} clientes/dia`}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 }}>
          {parts.map((p) => <View key={p.label} style={{ flex: Math.max(p.value / total, 0.001), backgroundColor: p.color }} />)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {parts.map((p) => <View key={p.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} /><Text style={{ color: "#CFE3DB", fontSize: 12, ...numStyle }}>{p.label} {formatMoney(p.value)}</Text></View>)}
        </View>
        <Text style={{ color: "#9FC1B4", fontSize: 12 }}>{SCENARIO_NOTE[scenario]} · vendas de {formatMoney(r.revenue)}/mês</Text>
      </View>
    </View>

    <ScrollView><Page>
      {GROUPS.map((g) => <Card key={g.title} style={{ gap: 4 }}>
        <SectionTitle title={g.title} subtitle={g.subtitle} right={<Ionicons name={g.icon} size={20} color={palette.brand} />} />
        {g.rows.map((row) => <Stepper key={row.key} label={row.label} hint={row.hint} value={f[row.key]} step={row.step} max={row.max}
          format={(v) => (row.pct ? `${v}%` : row.count ? String(v) : formatMoney(v))} onChange={(v) => set(row.key, v)} />)}
      </Card>)}

      <Card style={{ gap: 6 }}>
        <SectionTitle title="Capital de giro" subtitle="Dinheiro para aguentar os primeiros meses sem depender das vendas." />
        <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "800", ...numStyle }}>{formatMoney(r.workingCapital)}</Text>
        <Body size={14}>Referência simples: 3 meses de custos fixos.</Body>
      </Card>

      <Pressable onPress={() => setShowMethod(!showMethod)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 6 }}>
        <Text style={{ color: palette.brand, fontWeight: "700" }}>Como calculamos</Text><Ionicons name={showMethod ? "chevron-up" : "chevron-down"} size={18} color={palette.brand} />
      </Pressable>
      {showMethod ? <Card style={{ gap: 8 }}>
        <Body size={14}>Vendas = ticket × clientes por dia × dias abertos. Equilíbrio = custos fixos ÷ (ticket × (1 − % de custos da venda)) ÷ dias abertos. Os cenários mudam apenas clientes e ticket, pelos fatores indicados acima.</Body>
        <Text style={{ color: palette.faint, fontSize: 12 }}>Simulação determinística · sem distribuição estatística calibrada · versão 1</Text>
      </Card> : null}
    </Page></ScrollView>
  </View>;
}
