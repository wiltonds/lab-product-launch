import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Eyebrow, Heading, IconBadge, LinkButton, Page, ProgressBar, SectionTitle, Tag, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useMunicipalInsights } from "@/hooks/use-municipal-insights";
import { activityIcon, findActivity } from "@/shared/catalog";
import { calculateScenario, MISSIONS } from "@/shared/finance";
import { formatMoney } from "@/shared/format";
import { PLANNED_SIGNALS, SMALL_SAMPLE_THRESHOLD, type InsightSignal } from "@/shared/insights";

function Welcome() {
  const router = useRouter();
  const steps: { icon: keyof typeof Ionicons.glyphMap; color: [string, string]; title: string; text: string }[] = [
    { icon: "chatbubble-ellipses-outline", color: ["#FFE6DA", "#E2531A"], title: "Conte sua ideia", text: "Negócio, cidade e quanto você tem. Leva 2 minutos." },
    { icon: "stats-chart-outline", color: ["#E3ECFF", "#2F62D9"], title: "Veja os números", text: "Quantos clientes por dia você precisa e o que os dados da cidade dizem." },
    { icon: "flag-outline", color: ["#FFF1C7", "#B07A00"], title: "Siga o plano", text: "Passos práticos para testar a ideia antes de gastar." },
  ];
  const bubbles: { icon: keyof typeof Ionicons.glyphMap; bg: string }[] = [
    { icon: "cut", bg: "#FF6B2C" }, { icon: "fast-food", bg: "#FFC93C" }, { icon: "construct", bg: "#3D7BFF" }, { icon: "sparkles", bg: "#13A35A" },
  ];
  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page style={{ paddingTop: 18 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center" }}><Ionicons name="flask" size={19} color={palette.white} /></View>
      <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16, flex: 1 }}>Lab do Meu Negócio</Text>
      <Pressable onPress={() => router.push("/cadastro?modo=entrar")} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.white }}>
        <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 14 }}>Entrar</Text>
      </Pressable>
    </View>

    <View style={{ backgroundColor: palette.navy, borderRadius: 32, padding: 24, gap: 18, overflow: "hidden" }}>
      <View style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(61,123,255,0.28)" }} />
      <View style={{ position: "absolute", right: 40, bottom: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,201,60,0.18)" }} />
      <View style={{ flexDirection: "row" }}>
        {bubbles.map((b, i) => <View key={b.icon} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: b.bg, alignItems: "center", justifyContent: "center", marginLeft: i ? -10 : 0, borderWidth: 3, borderColor: palette.navy }}>
          <Ionicons name={b.icon} size={22} color={palette.white} />
        </View>)}
      </View>
      <Heading color={palette.white} size={33}>Descubra se o seu negócio tem chance <Text style={{ color: palette.lime }}>antes de investir.</Text></Heading>
      <Body color="#C9D2E3" size={16}>Números da sua ideia + dados reais da sua cidade. De graça, sem planilha e sem enrolação.</Body>
      <Pressable accessibilityRole="button" onPress={() => router.push("/onboarding")} style={({ pressed }) => ({ backgroundColor: palette.brand, borderRadius: 999, minHeight: 58, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Text style={{ color: palette.white, fontWeight: "800", fontSize: 17 }}>Começar minha análise</Text><Ionicons name="arrow-forward" size={19} color={palette.white} />
      </Pressable>
      <Text style={{ color: "#AEB9CF", fontSize: 13, textAlign: "center" }}>Grátis · 2 minutos · sem cadastro para começar</Text>
    </View>

    <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20, marginTop: 6 }}>Como funciona</Text>
    {steps.map((st, i) => <View key={st.title} style={{ flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: palette.white, borderRadius: 22, padding: 16 }}>
      <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: st.color[0], alignItems: "center", justifyContent: "center" }}><Ionicons name={st.icon} size={24} color={st.color[1]} /></View>
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>{i + 1}. {st.title}</Text><Body size={14}>{st.text}</Body></View>
    </View>)}

    <View style={{ backgroundColor: palette.lime, borderRadius: 22, padding: 18, gap: 10 }}>
      <Text style={{ color: palette.navy, fontWeight: "800", fontSize: 16 }}>Dados oficiais, não achismo</Text>
      {[["business-outline", "Cadastro de empresas da Receita Federal"], ["people-outline", "População do IBGE"], ["map-outline", "Os 102 municípios de Alagoas"]].map(([ic, t]) =>
        <View key={t} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><Ionicons name={ic as any} size={18} color={palette.navy} /><Text style={{ color: palette.navy, fontSize: 15 }}>{t}</Text></View>)}
    </View>
    <Text style={{ color: palette.faint, fontSize: 12, textAlign: "center", lineHeight: 18 }}>A análise organiza premissas e riscos. Ela não garante sucesso.</Text>
  </Page></ScrollView>;
}

function SignalRow({ s }: { s: InsightSignal }) {
  const tone = { favoravel: ["checkmark-circle", palette.green], atencao: ["alert-circle", palette.amber], risco: ["close-circle", palette.red], neutro: ["ellipse-outline", palette.muted] }[s.verdict] as [keyof typeof Ionicons.glyphMap, string];
  return <View style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
    <Ionicons name={tone[0]} size={22} color={tone[1]} />
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }}>{s.title}</Text>
      <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "700" }}>{s.headline}</Text>
      {s.detail ? <Body size={14} color={palette.ink}>{s.detail}</Body> : null}
      {s.comparison ? <Body size={14}>{s.comparison}</Body> : null}
      {s.sampleSize !== undefined && s.sampleSize < SMALL_SAMPLE_THRESHOLD ? <Text style={{ color: palette.amber, fontSize: 12 }}>Poucos negócios na amostra ({s.sampleSize}). Leia com cautela.</Text> : null}
      <Text style={{ color: palette.faint, fontSize: 12 }}>{s.confidence} · {s.source}</Text>
    </View>
  </View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useAppData();
  const { user } = useAuth();
  const activity = findActivity(data.idea.activity);
  const insights = useMunicipalInsights(data.idea.outsideState ? "" : data.idea.municipalityCode, activity?.id ?? "");
  if (!data.idea.activity) return <Welcome />;

  const f = data.finance;
  const r = calculateScenario(f, "intermediario");
  const need = r.breakEvenCustomersPerDay === null ? null : Math.ceil(r.breakEvenCustomersPerDay);
  const positive = r.operatingResult >= 0;
  const gap = need === null ? null : Math.round((f.customersPerDay - need) * 10) / 10;
  const name = (data.profile.name || user?.name || "").split(" ")[0];
  const place = data.idea.outsideState ? data.idea.outsideState : data.idea.municipality;

  const months = data.profile.personalMonthly > 0 ? data.profile.reserve / data.profile.personalMonthly : null;
  const atLeast = data.profile.reserve > 30000 ? "mais de " : "";
  const capitalNeeded = f.initialInvestment + r.workingCapital;
  const investableLabel = data.profile.investable > 100000 ? "mais de R$ 100 mil" : formatMoney(data.profile.investable);
  const capitalOk = data.profile.investable >= capitalNeeded;
  const pending = MISSIONS.filter((m) => !data.completedMissions.includes(m.id));
  const progress = Math.round((data.completedMissions.length / MISSIONS.length) * 100);

  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View><Text style={{ color: palette.muted, fontSize: 14 }}>{name ? `Olá, ${name}` : "Sua análise"}</Text><Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20 }}>Seu negócio, analisado.</Text></View>
      <Pressable onPress={() => router.push("/onboarding")} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: palette.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
        <Ionicons name="create-outline" size={15} color={palette.brand} /><Text style={{ color: palette.brand, fontWeight: "700", fontSize: 13 }}>Refazer</Text>
      </Pressable>
    </View>

    {/* Resultado principal */}
    <View style={{ backgroundColor: palette.navy, borderRadius: 30, padding: 22, gap: 16, overflow: "hidden" }}>
      <View style={{ position: "absolute", right: -50, bottom: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(61,123,255,0.22)" }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: palette.lime, alignItems: "center", justifyContent: "center" }}><Ionicons name={activityIcon(data.idea.activity) as any} size={22} color={palette.brandDeep} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: palette.white, fontWeight: "800", fontSize: 17 }}>{data.idea.activity}</Text><Text style={{ color: "#AEB9CF", fontSize: 14 }}>{place}</Text></View>
        <Tag tone="dark">SIMULAÇÃO</Tag>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ color: "#AEB9CF", fontSize: 14 }}>Sobra por mês, depois de pagar tudo e a sua retirada</Text>
        <Text style={{ color: positive ? palette.lime : "#FFB4A8", fontSize: 44, fontWeight: "800", letterSpacing: -1.5, ...numStyle }}>{formatMoney(r.operatingResult)}</Text>
        <Text style={{ color: "#C9D2E3", fontSize: 14, ...numStyle }}>{formatMoney(r.revenue)} em vendas · {f.customersPerDay} clientes/dia a {formatMoney(f.averageTicket)}</Text>
      </View>
      <Pressable onPress={() => router.push("/(tabs)/simulator")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 }}>
        <Text style={{ color: palette.white, fontWeight: "700" }}>Mexer nos números</Text><Ionicons name="options-outline" size={18} color={palette.white} />
      </Pressable>
    </View>

    {/* Ponto de equilíbrio */}
    <Card>
      <SectionTitle title="Quantos clientes você precisa" subtitle={`Para pagar aluguel, contas, custos e a sua retirada de ${formatMoney(f.ownerPay)}.`} />
      {need === null ? <Body>Informe um ticket médio maior que o custo variável para calcular.</Body> : <>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: palette.paper, borderRadius: 18, padding: 14, gap: 2 }}>
            <Text style={{ color: palette.muted, fontSize: 13 }}>Precisa de</Text>
            <Text style={{ color: palette.ink, fontSize: 30, fontWeight: "800", ...numStyle }}>{need}<Text style={{ fontSize: 15, color: palette.muted }}> /dia</Text></Text>
          </View>
          <View style={{ flex: 1, backgroundColor: positive ? palette.greenSoft : palette.redSoft, borderRadius: 18, padding: 14, gap: 2 }}>
            <Text style={{ color: positive ? palette.green : palette.red, fontSize: 13 }}>Você espera</Text>
            <Text style={{ color: positive ? palette.green : palette.red, fontSize: 30, fontWeight: "800", ...numStyle }}>{f.customersPerDay}<Text style={{ fontSize: 15 }}> /dia</Text></Text>
          </View>
        </View>
        <ProgressBar value={(f.customersPerDay / Math.max(need, f.customersPerDay, 1)) * 100} color={positive ? palette.green : palette.red} height={10} />
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Ionicons name={positive ? "checkmark-circle" : "alert-circle"} size={20} color={positive ? palette.green : palette.red} />
          <Text style={{ color: palette.ink, flex: 1, fontSize: 15, lineHeight: 21 }}>{gap !== null && gap >= 0
            ? `Folga de ${gap} cliente${gap === 1 ? "" : "s"} por dia. Seu próximo passo é confirmar se esse movimento é real.`
            : `Faltam ${Math.abs(gap ?? 0)} clientes por dia. Reveja preço, custos ou aluguel antes de investir.`}</Text>
        </View>
      </>}
    </Card>

    {/* Dinheiro e fôlego */}
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Card style={{ flex: 1, padding: 16, gap: 8 }}>
        <IconBadge icon="wallet-outline" bg={capitalOk ? palette.greenSoft : palette.amberSoft} color={capitalOk ? palette.green : palette.amber} size={36} />
        <Text style={{ color: palette.muted, fontSize: 13 }}>Para abrir e aguentar 3 meses</Text>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800", ...numStyle }}>{formatMoney(capitalNeeded)}</Text>
        <Text style={{ color: capitalOk ? palette.green : palette.amber, fontSize: 13, fontWeight: "600" }}>Você tem {investableLabel}</Text>
      </Card>
      <Card style={{ flex: 1, padding: 16, gap: 8 }}>
        <IconBadge icon="shield-checkmark-outline" bg={months !== null && months >= 6 ? palette.greenSoft : palette.amberSoft} color={months !== null && months >= 6 ? palette.green : palette.amber} size={36} />
        <Text style={{ color: palette.muted, fontSize: 13 }}>Sua reserva sustenta a casa por</Text>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800", ...numStyle }}>{months === null ? "—" : `${atLeast}${months < 1 ? "menos de 1" : Math.floor(months)} ${Math.floor(months) === 1 ? "mês" : "meses"}`}</Text>
        <Text style={{ color: palette.muted, fontSize: 13 }}>Ideal: 6 meses ou mais</Text>
      </Card>
    </View>
    <Text style={{ color: palette.faint, fontSize: 12, marginTop: -6, paddingHorizontal: 4 }}>Investimento de {formatMoney(f.initialInvestment)} e custos são premissas suas. Ajuste no simulador.</Text>

    {/* Dados do município — espaço da API */}
    <Card>
      <SectionTitle title={`O que os dados dizem sobre ${place}`} subtitle={insights.status === "ready" ? `Modelo ${insights.data.modelVersion}` : "Prós e contras do local para o seu tipo de negócio."}
        right={insights.status === "ready" ? <Tag tone="positive">AO VIVO</Tag> : <Tag tone="attention">EM BREVE</Tag>} />
      {insights.status === "ready"
        ? <>{insights.data.signals.map((s) => <SignalRow key={s.id} s={s} />)}{insights.data.limitations.length ? <Text style={{ color: palette.faint, fontSize: 12 }}>{insights.data.limitations.join(" ")}</Text> : null}</>
        : <>
          {PLANNED_SIGNALS.map((s) => <View key={s.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 6 }}>
            <IconBadge icon={s.icon} bg={palette.paper} color={palette.faint} size={40} />
            <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.ink, fontWeight: "700", fontSize: 15 }}>{s.title}</Text><Text style={{ color: palette.muted, fontSize: 13, lineHeight: 18 }}>{s.question}</Text></View>
            <Ionicons name="lock-closed-outline" size={16} color={palette.faint} />
          </View>)}
          <View style={{ backgroundColor: palette.paper, borderRadius: 14, padding: 12 }}><Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>{insights.status === "loading" ? "Consultando…" : `${insights.reason} Não mostramos número sem fonte.`}</Text></View>
        </>}
    </Card>

    {/* Próximos passos */}
    <Card>
      <SectionTitle title="Seu plano de ação" subtitle={`${data.completedMissions.length} de ${MISSIONS.length} passos feitos`} right={<Text style={{ color: palette.brand, fontWeight: "800", fontSize: 18, ...numStyle }}>{progress}%</Text>} />
      <ProgressBar value={progress} />
      {pending.slice(0, 3).map((m, i) => <Pressable key={m.id} onPress={() => router.push("/(tabs)/missions")} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 4 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: i === 0 ? palette.brand : palette.line, alignItems: "center", justifyContent: "center" }}><Text style={{ color: i === 0 ? palette.brand : palette.faint, fontWeight: "800", fontSize: 13 }}>{MISSIONS.indexOf(m) + 1}</Text></View>
        <Text style={{ color: palette.ink, fontSize: 15, flex: 1, fontWeight: i === 0 ? "700" : "500" }}>{m.title}</Text>
        <Ionicons name="chevron-forward" size={16} color={palette.faint} />
      </Pressable>)}
      {pending.length === 0 ? <Body>Todos os passos feitos. Hora de conversar com um mentor.</Body> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button title="Testar com clientes" secondary onPress={() => router.push("/sales-test")} /></View>
      </View>
    </Card>

    {/* Conta */}
    {!data.profile.verified ? <Pressable onPress={() => router.push("/cadastro")} style={{ backgroundColor: palette.brand, borderRadius: 26, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}><Ionicons name="bookmark-outline" size={22} color={palette.white} /></View>
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.white, fontWeight: "800", fontSize: 16 }}>Salve sua análise</Text><Text style={{ color: "#FFE3D6", fontSize: 13 }}>Crie sua conta grátis e acesse de qualquer aparelho</Text></View>
      <Ionicons name="arrow-forward" size={20} color={palette.white} />
    </Pressable> : null}

    {/* Oferta */}
    <Pressable onPress={() => router.push("/report")} style={{ backgroundColor: palette.ink, borderRadius: 26, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: palette.lime, alignItems: "center", justifyContent: "center" }}><Ionicons name="document-text-outline" size={22} color={palette.brandDeep} /></View>
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.white, fontWeight: "800", fontSize: 16 }}>Relatório completo + mentoria</Text><Text style={{ color: "#AEB9CF", fontSize: 13 }}>Plano de decisão com um especialista ao seu lado</Text></View>
      <Ionicons name="arrow-forward" size={20} color={palette.lime} />
    </Pressable>

    <Text style={{ color: palette.faint, fontSize: 12, lineHeight: 18, textAlign: "center" }}>Análise informativa, baseada nas premissas que você informou. Não substitui orientação contábil ou financeira.</Text>
  </Page></ScrollView>;
}
