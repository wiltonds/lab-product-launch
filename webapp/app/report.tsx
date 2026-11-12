import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Heading, Page, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { calculateScenario } from "@/shared/finance";
import { formatMoney } from "@/shared/format";

const PARCELA = 199;
const PARCELAS = 10;
const TOTAL = PARCELA * PARCELAS;

const JORNADA: { quando: string; titulo: string; texto: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { quando: "Na hora", titulo: "Seu relatório completo", texto: "Mercado, concorrência, sobrevivência e números do seu negócio na sua cidade, em PDF.", icon: "document-text" },
  { quando: "Semana 1", titulo: "1ª mentoria: o diagnóstico", texto: "A gente revisa seus números junto e acha onde está o risco.", icon: "people" },
  { quando: "Semanas 2 e 3", titulo: "Ponto, preço e fornecedores", texto: "Escolha do ponto, preço que fecha a conta e quanto pedir de estoque.", icon: "storefront" },
  { quando: "Semana 4", titulo: "Plano de abertura", texto: "Data, checklist de abertura e os primeiros 90 dias definidos.", icon: "rocket" },
  { quando: "3 meses", titulo: "Acompanhamento mensal", texto: "Depois de abrir, revisamos as vendas reais todo mês e ajustamos.", icon: "trending-up" },
];

const FAQ = [
  { p: "Ainda não tenho certeza do negócio. Serve para mim?", r: "Serve, e é o melhor momento. Descobrir antes de assinar o aluguel é o que mais economiza dinheiro." },
  { p: "Preciso ter CNPJ ou ponto?", r: "Não. A gente começa com a ideia e o dinheiro que você tem, e chega no plano de abertura." },
  { p: "E se eu não gostar?", r: "Você tem 7 dias para desistir e recebe 100% de volta, sem perguntas." },
];

export default function ReportScreen() {
  const router = useRouter();
  const { data } = useAppData();
  const [aberta, setAberta] = useState<number | null>(0);
  const nome = data.profile.name.trim().split(" ")[0];
  const negocio = data.idea.activity ? data.idea.activity.toLowerCase() : "o seu negócio";
  const cidade = data.idea.outsideState || data.idea.municipality;
  const r = calculateScenario(data.finance, "intermediario");
  const emJogo = data.finance.initialInvestment + r.workingCapital;
  const pct = emJogo > 0 ? Math.max(1, Math.round((TOTAL / emJogo) * 100)) : null;

  const comprar = () => {
    if (!data.profile.verified) { router.push("/cadastro"); return; }
    const msg = "Recebemos seu interesse! Vamos te chamar no WhatsApp para fechar o pagamento e marcar a 1ª mentoria.";
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(msg); else Alert.alert("Quase lá", msg);
  };

  return <View style={{ flex: 1, backgroundColor: palette.paper }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}><Page>

      {/* Promessa */}
      <View style={{ backgroundColor: palette.navy, borderRadius: 30, padding: 24, gap: 14, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(61,123,255,0.28)" }} />
        <View style={{ alignSelf: "flex-start", backgroundColor: palette.brand, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: palette.white, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>PLANO COMPLETO + MENTORIA</Text></View>
        <Heading color={palette.white} size={30}>{nome ? `${nome}, vamos` : "Vamos"} abrir {negocio === "o seu negócio" ? negocio : `sua ${negocio}`}{cidade ? ` em ${cidade}` : ""} <Text style={{ color: palette.lime }}>juntos.</Text></Heading>
        <Body color="#C9D2E3" size={16}>Você não precisa decidir sozinho. A gente pega sua análise, transforma num plano de abertura e acompanha você até as primeiras vendas.</Body>
      </View>

      {/* Ancoragem com o número da pessoa */}
      {pct !== null ? <View style={{ backgroundColor: palette.lime, borderRadius: 24, padding: 20, gap: 6 }}>
        <Text style={{ color: palette.navy, fontSize: 15 }}>Você vai colocar cerca de</Text>
        <Text style={{ color: palette.navy, fontSize: 30, fontWeight: "800", ...numStyle }}>{formatMoney(emJogo)}</Text>
        <Text style={{ color: palette.navy, fontSize: 15, lineHeight: 22 }}>nesse negócio (abertura + 3 meses de contas). O plano custa <Text style={{ fontWeight: "800" }}>{pct}% disso</Text>, e um ponto ou preço errado custa muito mais.</Text>
      </View> : null}

      {/* Sozinho x com o Lab */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: palette.white, borderRadius: 22, padding: 16, gap: 10 }}>
          <Text style={{ color: palette.red, fontWeight: "800" }}>Sozinho</Text>
          {["Escolhe o ponto no olho", "Preço no chute", "Descobre o erro no 3º mês"].map((t) => <View key={t} style={{ flexDirection: "row", gap: 8 }}><Ionicons name="close-circle" size={18} color={palette.red} /><Text style={{ color: palette.ink, flex: 1, fontSize: 14 }}>{t}</Text></View>)}
        </View>
        <View style={{ flex: 1, backgroundColor: palette.white, borderRadius: 22, padding: 16, gap: 10, borderWidth: 2, borderColor: palette.green }}>
          <Text style={{ color: palette.green, fontWeight: "800" }}>Com o Lab</Text>
          {["Ponto escolhido com dados", "Preço que fecha a conta", "Erro corrigido antes de abrir"].map((t) => <View key={t} style={{ flexDirection: "row", gap: 8 }}><Ionicons name="checkmark-circle" size={18} color={palette.green} /><Text style={{ color: palette.ink, flex: 1, fontSize: 14 }}>{t}</Text></View>)}
        </View>
      </View>

      {/* O que acontece depois da compra */}
      <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20, marginTop: 4 }}>O que acontece depois que você entra</Text>
      <View style={{ backgroundColor: palette.white, borderRadius: 24, padding: 18, gap: 4 }}>
        {JORNADA.map((j, i) => <View key={j.titulo} style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: i === 0 ? palette.brand : palette.brandSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={j.icon} size={20} color={i === 0 ? palette.white : palette.brand} /></View>
            {i < JORNADA.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: palette.line, marginVertical: 4 }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 16, gap: 2 }}>
            <Text style={{ color: palette.brand, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>{j.quando}</Text>
            <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>{j.titulo}</Text>
            <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>{j.texto}</Text>
          </View>
        </View>)}
      </View>

      {/* Preço */}
      <View style={{ backgroundColor: palette.navy, borderRadius: 26, padding: 22, gap: 8 }}>
        <Text style={{ color: "#AEB9CF", fontSize: 14 }}>Tudo isso por</Text>
        <Text style={{ color: palette.white, fontSize: 40, fontWeight: "800", ...numStyle }}>{PARCELAS}× {formatMoney(PARCELA)}</Text>
        <Text style={{ color: palette.lime, fontSize: 15, fontWeight: "700" }}>Menos de {formatMoney(Math.ceil((PARCELA / 30) * 100) / 100)} por dia</Text>
        <Text style={{ color: "#AEB9CF", fontSize: 13 }}>Total {formatMoney(TOTAL)} · pagamento único, sem mensalidade escondida</Text>
      </View>

      {/* Garantia */}
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: palette.greenSoft, borderRadius: 22, padding: 18 }}>
        <Ionicons name="shield-checkmark" size={34} color={palette.green} />
        <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.green, fontWeight: "800", fontSize: 16 }}>Garantia de 7 dias</Text><Text style={{ color: palette.ink, fontSize: 14, lineHeight: 20 }}>Entrou e não gostou? Devolvemos 100% do valor. O risco é nosso.</Text></View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingHorizontal: 4 }}>
        <Ionicons name="time-outline" size={18} color={palette.amber} />
        <Text style={{ color: palette.ink, fontSize: 14, flex: 1 }}>As mentorias são individuais, então abrimos poucas vagas por mês.</Text>
      </View>

      {/* Objeções */}
      <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20, marginTop: 4 }}>Perguntas comuns</Text>
      {FAQ.map((f, i) => <Pressable key={f.p} onPress={() => setAberta(aberta === i ? null : i)} style={{ backgroundColor: palette.white, borderRadius: 18, padding: 16, gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><Text style={{ color: palette.ink, fontWeight: "700", fontSize: 15, flex: 1 }}>{f.p}</Text><Ionicons name={aberta === i ? "remove" : "add"} size={20} color={palette.brand} /></View>
        {aberta === i ? <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21 }}>{f.r}</Text> : null}
      </Pressable>)}

      <Text style={{ color: palette.faint, fontSize: 11, textAlign: "center", lineHeight: 16 }}>Análise feita com dados públicos oficiais. A decisão de abrir é sempre sua.</Text>
    </Page></ScrollView>

    {/* Botão de compra sempre visível */}
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
      <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View><Text style={{ color: palette.muted, fontSize: 12 }}>{PARCELAS}× sem juros</Text><Text style={{ color: palette.ink, fontWeight: "800", fontSize: 20, ...numStyle }}>{formatMoney(PARCELA)}</Text></View>
        <Pressable accessibilityRole="button" onPress={comprar} style={({ pressed }) => ({ flex: 1, backgroundColor: palette.brand, borderRadius: 999, minHeight: 54, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: palette.white, fontWeight: "800", fontSize: 16 }}>Quero meu plano</Text><Ionicons name="arrow-forward" size={18} color={palette.white} />
        </Pressable>
      </View>
    </View>
  </View>;
}
