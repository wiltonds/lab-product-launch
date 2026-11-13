import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Chip, Choice, Heading, OptionTile, Page, ProgressBar, Stepper, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { BUSINESS_CATEGORIES } from "@/shared/catalog";
import { formatMoney } from "@/shared/format";
import { validateName } from "@/shared/validation";
import { citiesOf, searchCities, stateName, STATES, type City } from "@/shared/cities";
const ACTIVITIES = BUSINESS_CATEGORIES.flatMap((c) => c.activities.map((a) => ({ ...a, category: c.id })));

const MOTIVATION = [
  { label: "Ter meu próprio negócio e sair da CLT", icon: "rocket-outline" },
  { label: "Complementar a renda da família", icon: "wallet-outline" },
  { label: "Perdi o emprego e preciso de renda", icon: "refresh-outline" },
  { label: "Realizar um sonho antigo", icon: "star-outline" },
  { label: "Já empreendo e quero abrir outro", icon: "storefront-outline" },
] as const;
const STAGE = [
  { label: "Só tenho a ideia", detail: "Ainda não fiz contas nem pesquisa" },
  { label: "Estou pesquisando e fazendo contas", detail: "Já comparei preços e custos" },
  { label: "Já estou procurando o ponto", detail: "Falta pouco para abrir" },
  { label: "Já abri e quero melhorar", detail: "O negócio já funciona" },
];
const EXPERIENCE = ["Sim, mais de 2 anos", "Sim, um pouco", "Nunca trabalhei nisso"];
const INVEST = [
  { label: "Até R$ 10 mil", value: 10000 }, { label: "Até R$ 30 mil", value: 30000 }, { label: "Até R$ 60 mil", value: 60000 },
  { label: "Até R$ 100 mil", value: 100000 }, { label: "Mais de R$ 100 mil", value: 100001 },
];
const RENT = [
  { label: "Vou trabalhar em casa", value: 0 }, { label: "Cerca de R$ 1.000", value: 1000 }, { label: "Cerca de R$ 1.800", value: 1800 },
  { label: "Cerca de R$ 3.000", value: 3000 }, { label: "Cerca de R$ 5.000", value: 5000 },
];
const STATUS = ["Carteira assinada (CLT)", "Tenho MEI", "Autônomo(a)", "Sem trabalho no momento", "Já tenho outro negócio"];
const RESERVE = [{ label: "Não tenho", value: 0 }, { label: "Até R$ 5 mil", value: 5000 }, { label: "Até R$ 15 mil", value: 15000 }, { label: "Até R$ 30 mil", value: 30000 }, { label: "Mais de R$ 30 mil", value: 30001 }];
const LIVING = [{ label: "Até R$ 1.500", value: 1500 }, { label: "Até R$ 3.000", value: 3000 }, { label: "Até R$ 5.000", value: 5000 }, { label: "Mais de R$ 5.000", value: 6000 }];

const SECTIONS = ["Sobre você", "Sobre você", "Sobre você", "Seu negócio", "Seu negócio", "Seu negócio", "Seu dinheiro", "Seu dinheiro", "Seu dinheiro", "Seu dinheiro"];
const TOTAL = SECTIONS.length;
const AUTO = new Set([1, 2, 4, 6, 8]); // passos que avançam ao tocar

export default function OnboardingScreen() {
  const router = useRouter();
  const { data, update } = useAppData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.profile.name);
  const [query, setQuery] = useState("");
  const [ufPick, setUfPick] = useState("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const first = (data.profile.name || name).trim().split(" ")[0];
  const cities = useMemo(() => (ufPick || query.trim() ? searchCities(query, { uf: ufPick || undefined, limit: ufPick ? 12 : 8 }) : []), [query, ufPick]);
  const go = (n: number) => { setError(""); setStep(n); };
  const advance = () => setTimeout(() => go(step + 1), 200);
  const setProfile = (patch: Partial<typeof data.profile>) => void update({ profile: { ...data.profile, ...patch } });

  const saveName = () => {
    const e = validateName(name);
    if (e) { setError(e); return; }
    setProfile({ name: name.trim() });
    go(1);
  };
  const pickCity = (city: City | undefined) => {
    if (!city) return;
    void update({ idea: { ...data.idea, municipality: city.name, municipalityCode: city.code, municipalityUf: city.uf, outsideState: "" } });
    setQuery(""); advance();
  };
  const finish = () => {
    if (!data.profile.termsAccepted) { setError("Para ver o resultado, aceite os termos de uso."); return; }
    setBuilding(true);
  };
  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => router.replace("/(tabs)"), 1600);
    return () => clearTimeout(t);
  }, [building, router]);

  const monthlySales = data.finance.averageTicket * data.finance.customersPerDay * data.finance.operatingDays;
  const label = (t: string) => <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16, marginTop: 4 }}>{t}</Text>;

  if (building) {
    return <View style={{ flex: 1, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center", padding: 32, gap: 18 }}>
      <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center" }}><Ionicons name="analytics" size={36} color={palette.white} /></View>
      <Heading color={palette.white} size={26}>{first ? `Pronto, ${first}!` : "Pronto!"}</Heading>
      <Body color="#C9D2E3">Cruzando seus números com os dados de {data.idea.municipality || "sua cidade"} para {data.idea.activity.toLowerCase() || "o seu negócio"}…</Body>
    </View>;
  }

  return <View style={{ flex: 1, backgroundColor: palette.paper }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10, width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable accessibilityLabel="Voltar" onPress={() => (step === 0 ? router.back() : go(step - 1))} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={20} color={palette.ink} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: palette.brand, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>{SECTIONS[step]}</Text>
          <ProgressBar value={((step + 1) / TOTAL) * 100} height={6} />
        </View>
        <Text style={{ color: palette.muted, fontWeight: "700", ...numStyle }}>{step + 1}/{TOTAL}</Text>
      </View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}><Page style={{ paddingTop: 22 }}>

      {step === 0 ? <>
        <Heading>Oi! Como podemos te chamar?</Heading>
        <Body>Vamos montar uma análise só sua. Leva uns 2 minutos.</Body>
        <TextInput autoFocus value={name} onChangeText={(v) => { setName(v); setError(""); }} onSubmitEditing={saveName} placeholder="Seu primeiro nome" placeholderTextColor={palette.faint} autoCapitalize="words"
          style={{ backgroundColor: palette.white, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 18, fontSize: 20, fontWeight: "700", color: palette.ink, borderWidth: 2, borderColor: error ? palette.red : palette.line }} accessibilityLabel="Seu nome" />
      </> : null}

      {step === 1 ? <>
        <Heading>{first ? `${first}, o que te faz querer empreender?` : "O que te faz querer empreender?"}</Heading>
        <Body>Isso muda o tipo de conselho que faz sentido para você.</Body>
        <View style={{ gap: 10 }}>{MOTIVATION.map((m) => <Pressable key={m.label} onPress={() => { setProfile({ motivation: m.label }); advance(); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: data.profile.motivation === m.label ? palette.brandSoft : palette.white, borderWidth: 2, borderColor: data.profile.motivation === m.label ? palette.brand : "transparent", borderRadius: 18, padding: 14 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={m.icon} size={21} color={palette.brand} /></View>
          <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "600", flex: 1 }}>{m.label}</Text>
        </Pressable>)}</View>
      </> : null}

      {step === 2 ? <>
        <Heading>Em que ponto você está?</Heading>
        <Body>Sem certo ou errado. Cada fase pede um próximo passo diferente.</Body>
        <View style={{ gap: 10 }}>{STAGE.map((s) => <Choice key={s.label} label={s.label} detail={s.detail} selected={data.profile.stage === s.label} onPress={() => { setProfile({ stage: s.label }); advance(); }} />)}</View>
      </> : null}

      {step === 3 ? <>
        <Heading>Qual negócio você quer abrir?</Heading>
        <Body>Escolha o mais parecido com a sua ideia.</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {ACTIVITIES.map((a, i) => <OptionTile key={a.id} label={a.label} icon={a.icon} color={i} selected={data.idea.activity === a.label}
            onPress={() => { void update({ idea: { ...data.idea, category: a.category, activity: a.label } }); advance(); }} />)}
        </View>
        <Text style={{ color: palette.faint, fontSize: 13, textAlign: "center" }}>Mais tipos de negócio em breve.</Text>
      </> : null}

      {step === 4 ? <>
        <Heading>Você já trabalhou com {data.idea.activity ? data.idea.activity.toLowerCase() : "esse tipo de negócio"}?</Heading>
        <Body>Experiência no ramo é um dos fatores que mais pesam na sobrevivência de um negócio novo.</Body>
        <View style={{ gap: 10 }}>{EXPERIENCE.map((x) => <Choice key={x} label={x} selected={data.profile.experience === x} onPress={() => { setProfile({ experience: x }); advance(); }} />)}</View>
      </> : null}

      {step === 5 ? (!ufPick ? <>
        <Heading>Em qual estado?</Heading>
        <Body>Depois você escolhe a cidade. Temos dados de todas as cidades do Brasil.</Body>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.white, borderRadius: 18, paddingHorizontal: 16, borderWidth: 2, borderColor: palette.line }}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Ou digite a cidade direto" placeholderTextColor={palette.faint} style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: palette.ink }} accessibilityLabel="Buscar cidade em todo o Brasil" />
        </View>
        {query ? <>
          {cities.map((c) => <CityRow key={c.code} city={c} onPress={() => pickCity(c)} showUf />)}
          {cities.length === 0 ? <Body>Nenhuma cidade com esse nome. Confira a grafia ou escolha o estado abaixo.</Body> : null}
        </> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATES.map((st) => <Pressable key={st.uf} accessibilityRole="button" accessibilityLabel={st.name} onPress={() => { setUfPick(st.uf); setQuery(""); }}
            style={{ width: "31%", minHeight: 64, backgroundColor: data.idea.municipalityUf === st.uf ? palette.brandSoft : palette.white, borderRadius: 16, borderWidth: 2, borderColor: data.idea.municipalityUf === st.uf ? palette.brand : palette.line, padding: 10, justifyContent: "center" }}>
            <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>{st.uf}</Text>
            <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 12 }}>{st.name}</Text>
          </Pressable>)}
        </View>
      </> : <>
        <Pressable onPress={() => { setUfPick(""); setQuery(""); }} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
          <Ionicons name="swap-horizontal" size={16} color={palette.brandText} /><Text style={{ color: palette.brandText, fontWeight: "700" }}>Trocar estado</Text>
        </Pressable>
        <Heading>Em qual cidade de {stateName(ufPick)}?</Heading>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.white, borderRadius: 18, paddingHorizontal: 16, borderWidth: 2, borderColor: palette.line }}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput value={query} onChangeText={setQuery} autoFocus placeholder={`Buscar entre ${citiesOf(ufPick)} cidades`} placeholderTextColor={palette.faint} style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: palette.ink }} accessibilityLabel={`Buscar cidade de ${stateName(ufPick)}`} />
        </View>
        {!query ? <Text style={{ color: palette.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>MAIORES CIDADES</Text> : null}
        {cities.map((c) => <CityRow key={c.code} city={c} onPress={() => pickCity(c)} />)}
        {query && cities.length === 0 ? <Body>Nenhuma cidade de {stateName(ufPick)} com esse nome. Confira a grafia.</Body> : null}
      </>) : null}

      {step === 6 ? <>
        <Heading>Quanto você tem para investir?</Heading>
        <Body>Só o dinheiro que pode ir para o negócio. A reserva da família vem depois.</Body>
        <View style={{ gap: 10 }}>{INVEST.map((o) => <Choice key={o.label} label={o.label} selected={data.profile.investable === o.value}
          onPress={() => { setProfile({ investable: o.value }); advance(); }} />)}</View>
      </> : null}

      {step === 7 ? <>
        <Heading>Como você imagina as vendas?</Heading>
        <Body>Um palpite serve. Depois você testa com clientes de verdade e ajusta.</Body>
        <View style={{ backgroundColor: palette.white, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6 }}>
          <Stepper label="Cada cliente gasta" hint="Ticket médio" value={data.finance.averageTicket} step={5} format={formatMoney} onChange={(v) => void update({ finance: { ...data.finance, averageTicket: v } })} />
          <Stepper label="Clientes por dia" value={data.finance.customersPerDay} step={1} format={(v) => String(v)} onChange={(v) => void update({ finance: { ...data.finance, customersPerDay: v } })} />
          <Stepper label="Dias abertos no mês" value={data.finance.operatingDays} step={1} max={31} format={(v) => String(v)} onChange={(v) => void update({ finance: { ...data.finance, operatingDays: v } })} />
        </View>
        <View style={{ backgroundColor: palette.lime, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="cash-outline" size={22} color={palette.navy} />
          <Text style={{ color: palette.navy, fontSize: 15, flex: 1 }}>Isso dá cerca de <Text style={{ fontWeight: "800", ...numStyle }}>{formatMoney(monthlySales)}</Text> em vendas por mês.</Text>
        </View>
      </> : null}

      {step === 8 ? <>
        <Heading>E o aluguel do ponto?</Heading>
        <Body>Se ainda não sabe, escolha o mais próximo. Dá para mudar depois.</Body>
        <View style={{ gap: 10 }}>{RENT.map((o) => <Choice key={o.label} label={o.label} selected={data.finance.rent === o.value}
          onPress={() => { void update({ finance: { ...data.finance, rent: o.value } }); advance(); }} />)}</View>
      </> : null}

      {step === 9 ? <>
        <Heading>Última: sua segurança</Heading>
        <Body>Negócio novo demora a pagar o dono. Isso mostra quanto tempo você aguenta.</Body>
        {label("Hoje você…")}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{STATUS.map((s) => <Chip key={s} label={s} selected={data.profile.status === s} onPress={() => setProfile({ status: s })} />)}</View>
        {label("Reserva guardada para emergências")}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{RESERVE.map((o) => <Chip key={o.label} label={o.label} selected={data.profile.reserve === o.value} onPress={() => setProfile({ reserve: o.value })} />)}</View>
        {label("Quanto sua casa gasta por mês")}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{LIVING.map((o) => <Chip key={o.label} label={o.label} selected={data.profile.personalMonthly === o.value} onPress={() => setProfile({ personalMonthly: o.value })} />)}</View>
        <Pressable onPress={() => setProfile({ termsAccepted: !data.profile.termsAccepted })} style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 6 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: data.profile.termsAccepted ? palette.brand : "#C5CAD6", backgroundColor: data.profile.termsAccepted ? palette.brand : palette.white, alignItems: "center", justifyContent: "center" }}>
            {data.profile.termsAccepted ? <Ionicons name="checkmark" size={15} color={palette.white} /> : null}
          </View>
          <Text style={{ color: palette.ink, flex: 1, lineHeight: 20 }}>Aceito os termos e a política de privacidade. A análise é informativa e não garante resultado.</Text>
        </Pressable>
      </> : null}

      {error ? <Text style={{ color: palette.red, fontWeight: "600" }}>{error}</Text> : null}
      <View style={{ flex: 1 }} />
      {step === 0 ? <Button title="Continuar" icon="arrow-forward" onPress={saveName} /> : null}
      {step === 7 ? <Button title="Continuar" icon="arrow-forward" onPress={() => go(8)} /> : null}
      {step === 9 ? <Button title="Ver minha análise" icon="arrow-forward" onPress={finish} /> : null}
      {AUTO.has(step) || step === 3 || step === 5 ? <Text style={{ textAlign: "center", color: palette.faint, fontSize: 13 }}>Toque numa opção para seguir</Text> : null}
    </Page></ScrollView>
  </View>;
}

function CityRow({ city, onPress, showUf = false }: { city: City; onPress: () => void; showUf?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: palette.line }}>
    <Ionicons name="location" size={18} color={palette.brandText} />
    <Text style={{ fontSize: 16, color: palette.ink, flex: 1 }}>{city.name}{showUf ? <Text style={{ color: palette.muted }}> · {city.uf}</Text> : null}</Text>
    <Ionicons name="chevron-forward" size={16} color={palette.faint} />
  </Pressable>;
}
