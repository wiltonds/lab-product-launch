import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Chip, Choice, Heading, OptionTile, Page, ProgressBar, Stepper, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { BUSINESS_CATEGORIES, POPULAR_MUNICIPALITIES } from "@/shared/catalog";
import { formatMoney } from "@/shared/format";
import municipalityData from "@/shared/data/alagoas-municipios.json";

const localities = municipalityData.municipalities as { ibgeCode: string; name: string }[];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const INVEST = [
  { label: "Até R$ 10 mil", value: 10000 }, { label: "Até R$ 30 mil", value: 30000 }, { label: "Até R$ 60 mil", value: 60000 },
  { label: "Até R$ 100 mil", value: 100000 }, { label: "Mais de R$ 100 mil", value: 100001 },
];
const RENT = [
  { label: "Vou trabalhar em casa", value: 0 }, { label: "Cerca de R$ 1.000", value: 1000 }, { label: "Cerca de R$ 1.800", value: 1800 },
  { label: "Cerca de R$ 3.000", value: 3000 }, { label: "Cerca de R$ 5.000", value: 5000 },
];
const STATUS = ["Trabalho com carteira assinada (CLT)", "Tenho um MEI", "Sou autônomo(a)", "Estou desempregado(a)", "Já tenho outro negócio"];
const RESERVE = [{ label: "Não tenho", value: 0 }, { label: "Até R$ 5 mil", value: 5000 }, { label: "Até R$ 15 mil", value: 15000 }, { label: "Até R$ 30 mil", value: 30000 }, { label: "Mais de R$ 30 mil", value: 30001 }];
const LIVING = [{ label: "Até R$ 1.500", value: 1500 }, { label: "Até R$ 3.000", value: 3000 }, { label: "Até R$ 5.000", value: 5000 }, { label: "Mais de R$ 5.000", value: 6000 }];

const TOTAL = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const { data, update } = useAppData();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [outside, setOutside] = useState(Boolean(data.idea.outsideState));
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const cities = useMemo(() => (query ? localities.filter((c) => norm(c.name).includes(norm(query))).slice(0, 6) : []), [query]);
  const go = (n: number) => { setError(""); setStep(n); };
  const advance = () => setTimeout(() => go(step + 1), 180);

  const pickCity = (name: string) => {
    const city = localities.find((c) => c.name === name);
    if (!city) return;
    void update({ idea: { ...data.idea, municipality: city.name, municipalityCode: city.ibgeCode, outsideState: "" } });
    setQuery(""); setOutside(false); advance();
  };

  const finish = () => {
    if (!data.profile.termsAccepted) { setError("Para ver o resultado, aceite os termos de uso."); return; }
    setBuilding(true);
  };
  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => router.replace("/(tabs)"), 1400);
    return () => clearTimeout(t);
  }, [building, router]);

  const monthlySales = data.finance.averageTicket * data.finance.customersPerDay * data.finance.operatingDays;

  if (building) {
    return <View style={{ flex: 1, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", padding: 32, gap: 18 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: palette.lime, alignItems: "center", justifyContent: "center" }}><Ionicons name="analytics" size={34} color={palette.brandDeep} /></View>
      <Heading color={palette.white} size={26}>Montando sua análise…</Heading>
      <Body color="#CFE3DB">{data.idea.activity || "Seu negócio"} em {data.idea.municipality || "Alagoas"}: calculando quanto precisa vender para pagar as contas.</Body>
    </View>;
  }

  return <View style={{ flex: 1, backgroundColor: palette.paper }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable accessibilityLabel="Voltar" onPress={() => (step === 0 ? router.back() : go(step - 1))} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={20} color={palette.ink} />
        </Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={((step + 1) / TOTAL) * 100} height={6} /></View>
        <Text style={{ color: palette.muted, fontWeight: "700", ...numStyle }}>{step + 1}/{TOTAL}</Text>
      </View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}><Page style={{ paddingTop: 22 }}>

      {step === 0 ? <>
        <Heading>O que você quer abrir?</Heading>
        <Body>Escolha o mais parecido com a sua ideia.</Body>
        {BUSINESS_CATEGORIES.map((cat) => <View key={cat.id} style={{ gap: 10 }}>
          <Text style={{ color: palette.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>{cat.label}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {cat.activities.map((a) => <OptionTile key={a.id} label={a.label} icon={a.icon} selected={data.idea.activity === a.label}
              onPress={() => { void update({ idea: { ...data.idea, category: cat.id, activity: a.label } }); advance(); }} />)}
          </View>
        </View>)}
      </> : null}

      {step === 1 ? <>
        <Heading>Em qual cidade?</Heading>
        <Body>Começamos por Alagoas. Os dados do município entram na sua análise assim que estiverem conectados.</Body>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.white, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1.5, borderColor: palette.line }}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Buscar município" placeholderTextColor={palette.faint} style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: palette.ink }} accessibilityLabel="Buscar município" />
        </View>
        {cities.map((c) => <Pressable key={c.ibgeCode} onPress={() => pickCity(c.name)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: palette.line }}>
          <Ionicons name="location-outline" size={18} color={palette.brand} /><Text style={{ fontSize: 16, color: palette.ink, flex: 1 }}>{c.name}</Text><Ionicons name="chevron-forward" size={16} color={palette.faint} />
        </Pressable>)}
        {query && cities.length === 0 ? <Body>Nenhum município de Alagoas com esse nome.</Body> : null}
        {!query ? <>
          <Text style={{ color: palette.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Mais buscadas</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{POPULAR_MUNICIPALITIES.map((m) => <Chip key={m} label={m} selected={data.idea.municipality === m && !outside} onPress={() => pickCity(m)} />)}</View>
        </> : null}
        <Pressable onPress={() => setOutside(!outside)} style={{ paddingVertical: 8 }}><Text style={{ color: palette.brand, fontWeight: "700" }}>{outside ? "Voltar para Alagoas" : "Vou abrir fora de Alagoas"}</Text></Pressable>
        {outside ? <View style={{ gap: 10, backgroundColor: palette.amberSoft, padding: 16, borderRadius: 18 }}>
          <Text style={{ color: palette.amber, fontWeight: "800" }}>Ainda não cobrimos outros estados</Text>
          <Body color={palette.ink}>Deixe o estado e avisamos quando chegar. Você pode seguir com o simulador financeiro.</Body>
          <TextInput value={data.idea.outsideState === "Outro estado" ? "" : data.idea.outsideState} onChangeText={(v) => void update({ idea: { ...data.idea, outsideState: v || "Outro estado" } })} placeholder="Ex.: Pernambuco" placeholderTextColor={palette.faint} style={{ backgroundColor: palette.white, borderRadius: 14, padding: 14, fontSize: 16 }} />
          <Button title="Continuar" onPress={() => { if (!data.idea.outsideState) void update({ idea: { ...data.idea, outsideState: "Outro estado" } }); go(2); }} />
        </View> : null}
      </> : null}

      {step === 2 ? <>
        <Heading>Quanto você tem para investir?</Heading>
        <Body>Só o dinheiro que pode ir para o negócio. A reserva da família vem depois.</Body>
        <View style={{ gap: 10 }}>{INVEST.map((o) => <Choice key={o.label} label={o.label} selected={data.profile.investable === o.value}
          onPress={() => { void update({ profile: { ...data.profile, investable: o.value } }); advance(); }} />)}</View>
      </> : null}

      {step === 3 ? <>
        <Heading>Como você imagina as vendas?</Heading>
        <Body>Um palpite serve. Depois você testa com clientes de verdade e ajusta.</Body>
        <View style={{ backgroundColor: palette.white, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6 }}>
          <Stepper label="Cada cliente gasta" hint="Ticket médio" value={data.finance.averageTicket} step={5} format={formatMoney} onChange={(v) => void update({ finance: { ...data.finance, averageTicket: v } })} />
          <Stepper label="Clientes por dia" value={data.finance.customersPerDay} step={1} format={(v) => String(v)} onChange={(v) => void update({ finance: { ...data.finance, customersPerDay: v } })} />
          <Stepper label="Dias abertos no mês" value={data.finance.operatingDays} step={1} max={31} format={(v) => String(v)} onChange={(v) => void update({ finance: { ...data.finance, operatingDays: v } })} />
        </View>
        <View style={{ backgroundColor: palette.brandSoft, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="cash-outline" size={22} color={palette.brand} />
          <Text style={{ color: palette.brandDeep, fontSize: 15, flex: 1 }}>Isso dá cerca de <Text style={{ fontWeight: "800", ...numStyle }}>{formatMoney(monthlySales)}</Text> em vendas por mês.</Text>
        </View>
      </> : null}

      {step === 4 ? <>
        <Heading>E o aluguel do ponto?</Heading>
        <Body>Se ainda não sabe, escolha o mais próximo. Dá para mudar depois.</Body>
        <View style={{ gap: 10 }}>{RENT.map((o) => <Choice key={o.label} label={o.label} selected={data.finance.rent === o.value}
          onPress={() => { void update({ finance: { ...data.finance, rent: o.value } }); advance(); }} />)}</View>
      </> : null}

      {step === 5 ? <>
        <Heading>Por último: sua segurança</Heading>
        <Body>Negócio novo demora a pagar o dono. Isso mostra quanto tempo você aguenta.</Body>
        <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>Hoje você…</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{STATUS.map((s) => <Chip key={s} label={s} selected={data.profile.status === s} onPress={() => void update({ profile: { ...data.profile, status: s } })} />)}</View>
        <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>Reserva guardada para emergências</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{RESERVE.map((o) => <Chip key={o.label} label={o.label} selected={data.profile.reserve === o.value} onPress={() => void update({ profile: { ...data.profile, reserve: o.value } })} />)}</View>
        <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>Quanto sua casa gasta por mês</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{LIVING.map((o) => <Chip key={o.label} label={o.label} selected={data.profile.personalMonthly === o.value} onPress={() => void update({ profile: { ...data.profile, personalMonthly: o.value } })} />)}</View>
        <Pressable onPress={() => void update({ profile: { ...data.profile, termsAccepted: !data.profile.termsAccepted } })} style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 6 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: data.profile.termsAccepted ? palette.brand : "#CBC4B6", backgroundColor: data.profile.termsAccepted ? palette.brand : palette.white, alignItems: "center", justifyContent: "center" }}>
            {data.profile.termsAccepted ? <Ionicons name="checkmark" size={15} color={palette.white} /> : null}
          </View>
          <Text style={{ color: palette.ink, flex: 1, lineHeight: 20 }}>Aceito os termos e a política de privacidade. A análise é informativa e não garante resultado.</Text>
        </Pressable>
        {error ? <Text style={{ color: palette.red, fontWeight: "600" }}>{error}</Text> : null}
      </> : null}

      <View style={{ flex: 1 }} />
      {step === 3 ? <Button title="Continuar" icon="arrow-forward" onPress={() => go(4)} /> : null}
      {step === 5 ? <Button title="Ver meu resultado" icon="arrow-forward" onPress={finish} /> : null}
      {step === 0 || step === 2 || step === 4 ? <Text style={{ textAlign: "center", color: palette.faint, fontSize: 13 }}>Toque numa opção para seguir</Text> : null}
    </Page></ScrollView>
  </View>;
}
