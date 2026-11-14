import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { Hello, VingaLogo } from "@/components/vinga";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Eyebrow, Heading, IconBadge, LinkButton, Page, ProgressBar, SectionTitle, Tag, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useMunicipalInsights } from "@/hooks/use-municipal-insights";
import { activityIcon, findActivity } from "@/shared/catalog";
import { calculateScenario, MISSIONS } from "@/shared/finance";
import { computeIndice } from "@/shared/indice";
import { formatMoney } from "@/shared/format";
import { PLANNED_SIGNALS, SMALL_SAMPLE_THRESHOLD, type InsightSignal } from "@/shared/insights";

function Welcome() {
  const router = useRouter();
  const sobe = useRef(new Animated.Value(0)).current;
  const resto = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(sobe, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(resto, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [sobe, resto]);
  const fade = (v: Animated.Value, dy: number) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] });
  return <View style={{ flex: 1, backgroundColor: palette.white }}>
    <Page style={{ flex: 1, paddingTop: 28, paddingBottom: 36 }}>
      <Animated.View style={[{ alignItems: "center" }, fade(resto, 8)]}><VingaLogo size={22} /></Animated.View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Animated.View style={fade(sobe, 24)}><Hello width={320} /></Animated.View>
        <Animated.View style={fade(resto, 12)}>
          <Text style={{ color: palette.ink, fontSize: 24, lineHeight: 32, fontWeight: "800", textAlign: "center", maxWidth: 320 }}>Vamos tirar o seu negócio do papel.</Text>
        </Animated.View>
      </View>
      <Animated.View style={[{ gap: 16, alignItems: "stretch" }, fade(resto, 12)]}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/onboarding")} style={({ pressed }) => ({ backgroundColor: palette.brand, borderRadius: 999, minHeight: 60, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: palette.navy, fontWeight: "800", fontSize: 18 }}>Começar</Text>
        </Pressable>
        <Text style={{ color: palette.muted, fontSize: 15, textAlign: "center" }}>
          Já tem conta? <Text accessibilityRole="link" onPress={() => router.push("/cadastro?modo=entrar")} style={{ color: palette.brandText, fontWeight: "700" }}>Entrar</Text>
        </Text>
      </Animated.View>
    </Page>
  </View>;
}

const LOCKED = ["E se você vender menos que o previsto?", "Quanto tempo o seu dinheiro aguenta", "Como ganhar dos concorrentes da sua cidade", "Seu Plano B, passo a passo"];

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
  const indice = computeIndice(data, insights.status === "ready" ? insights.data.marketScore ?? null : null);
  const pending = MISSIONS.filter((m) => !data.completedMissions.includes(m.id));
  const progress = Math.round((data.completedMissions.length / MISSIONS.length) * 100);

  return <View style={{ flex: 1, backgroundColor: palette.paper }}><ScrollView style={{ flex: 1 }}><Page>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View><Text style={{ color: palette.muted, fontSize: 14 }}>{name ? `Olá, ${name}` : "Sua análise"}</Text><Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20 }}>Seu negócio, analisado.</Text></View>
      <Pressable onPress={() => router.push("/onboarding")} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: palette.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
        <Ionicons name="create-outline" size={15} color={palette.brand} /><Text style={{ color: palette.brand, fontWeight: "700", fontSize: 13 }}>Refazer</Text>
      </Pressable>
    </View>

    {/* Índice Vinga: 1 número, 1 motivo, 1 ação */}
    <View style={{ backgroundColor: palette.white, borderRadius: 30, padding: 22, gap: 16, borderWidth: 2, borderColor: palette.brand }}>
      <View>
        <View style={{ gap: 2 }}>
          <Text style={{ color: palette.brandText, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>ÍNDICE VINGA</Text>
          <Text accessibilityLabel={`Índice Vinga ${indice.score} de 100`} style={{ color: palette.ink, fontSize: 56, fontWeight: "800", letterSpacing: -2, ...numStyle }}>{indice.score}<Text style={{ fontSize: 20, color: palette.muted }}> /100</Text></Text>
        </View>
      </View>
      <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}>{indice.label}</Text>
      <View style={{ gap: 4 }}>
        <Text style={{ color: palette.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>POR QUÊ</Text>
        <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 23 }}>{indice.reason}</Text>
      </View>
      <View style={{ backgroundColor: palette.brandSoft, borderRadius: 18, padding: 14, gap: 4 }}>
        <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>FAÇA ESTA SEMANA</Text>
        <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 23, fontWeight: "600" }}>{indice.action}</Text>
      </View>
      {indice.partial ? <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>{insights.status === "loading" ? "Buscando os dados da sua cidade…" : "Nota parcial: sem os dados da cidade, usamos só as suas contas e o seu preparo."}</Text> : null}
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

    {/* Dados do município — espaço da API */}
    <Card>
      <SectionTitle title={`${place}: vale a pena?`} subtitle="Prós e contras do local para o seu tipo de negócio."
        right={insights.status === "ready" ? (insights.savedAt ? <Tag tone="attention">SALVO</Tag> : <Tag tone="positive">AO VIVO</Tag>) : <Tag tone="attention">EM BREVE</Tag>} />
      {insights.status === "ready" && insights.savedAt ? <Body size={13}>Não deu para atualizar agora. Estes são os dados de {new Date(insights.savedAt).toLocaleDateString("pt-BR")}.</Body> : null}
      {insights.status === "ready"
        ? <>{insights.data.signals.map((s) => <SignalRow key={s.id} s={s} />)}</>
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

    {/* Riscos: 1 aberto, os outros com o olho fechado → página de compra */}
    <View style={{ backgroundColor: palette.navy, borderRadius: 30, padding: 22, gap: 14 }}>
      <Text style={{ color: palette.lime, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>ANTES DE COLOCAR SEU DINHEIRO</Text>
      <Text style={{ color: palette.white, fontSize: 24, lineHeight: 30, fontWeight: "800" }}>{name ? `${name}, veja` : "Veja"} o que pode dar errado no seu plano.</Text>
      <View style={{ backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 18, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Ionicons name="eye" size={20} color={palette.lime} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.lime, fontWeight: "800", fontSize: 12 }}>SEU MAIOR RISCO</Text>
          <Text style={{ color: palette.white, fontSize: 15, lineHeight: 22 }}>{indice.reason}</Text>
        </View>
      </View>
      {LOCKED.map((t, i) => <Pressable key={t} accessibilityRole="button" accessibilityLabel={`${t}. Bloqueado. Ver no plano completo.`} onPress={() => router.push("/report")}
        style={{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Ionicons name="eye-off" size={20} color="#AEB9CF" />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: palette.white, fontWeight: "700", fontSize: 15 }}>{t}</Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.14)", width: `${70 - i * 12}%` }} />
        </View>
        <Ionicons name="lock-closed" size={16} color="#AEB9CF" />
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => router.push("/report")} style={({ pressed }) => ({ backgroundColor: palette.brand, borderRadius: 999, minHeight: 60, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Ionicons name="eye" size={20} color={palette.navy} /><Text style={{ color: palette.navy, fontWeight: "800", fontSize: 17 }}>Ver os riscos e abrir meu negócio</Text>
      </Pressable>
    </View>

    <View style={{ height: 24 }} />
  </Page></ScrollView>
  </View>;
}
