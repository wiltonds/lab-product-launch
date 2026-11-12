import { ScrollView, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Heading, Page, ProgressBar, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { MISSIONS } from "@/shared/finance";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  investment: "construct-outline", competitors: "storefront-outline", "fixed-costs": "receipt-outline",
  price: "pricetag-outline", reserve: "shield-checkmark-outline", customers: "chatbubbles-outline",
};

export default function MissionsScreen() {
  const router = useRouter();
  const { data, update } = useAppData();
  const done = data.completedMissions.length;
  const progress = Math.round((done / MISSIONS.length) * 100);
  const toggle = (id: string) => {
    const on = data.completedMissions.includes(id);
    void update({ completedMissions: on ? data.completedMissions.filter((i) => i !== id) : [...data.completedMissions, id] });
  };
  const nextId = MISSIONS.find((m) => !data.completedMissions.includes(m.id))?.id;

  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page>
    <Heading>Seu plano de ação</Heading>
    <Body>Cada passo troca um palpite por informação real. Sem pressa e sem contagem regressiva.</Body>
    <View style={{ backgroundColor: palette.brand, borderRadius: 26, padding: 20, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View><Text style={{ color: "#BFD8CE", fontSize: 13 }}>Concluído</Text><Text style={{ color: palette.white, fontSize: 34, fontWeight: "800", ...numStyle }}>{done}<Text style={{ fontSize: 18, color: "#BFD8CE" }}> de {MISSIONS.length}</Text></Text></View>
        <Text style={{ color: palette.lime, fontSize: 26, fontWeight: "800", ...numStyle }}>{progress}%</Text>
      </View>
      <ProgressBar value={progress} color={palette.lime} track="rgba(255,255,255,0.15)" height={10} />
    </View>

    {MISSIONS.map((m, i) => {
      const isDone = data.completedMissions.includes(m.id);
      const isNext = m.id === nextId;
      return <Pressable key={m.id} onPress={() => toggle(m.id)} accessibilityRole="checkbox" accessibilityState={{ checked: isDone }}
        style={({ pressed }) => ({ flexDirection: "row", gap: 14, alignItems: "center", padding: 16, backgroundColor: palette.white, borderRadius: 22, borderWidth: 1.5, borderColor: isNext ? palette.brand : "transparent", opacity: pressed ? 0.92 : 1 })}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: isDone ? palette.greenSoft : palette.paper, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={ICONS[m.id] ?? "flag-outline"} size={22} color={isDone ? palette.green : palette.brand} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {isNext ? <Text style={{ color: palette.brand, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>PRÓXIMO PASSO</Text> : null}
          <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "700", textDecorationLine: isDone ? "line-through" : "none", opacity: isDone ? 0.55 : 1 }}>{i + 1}. {m.title}</Text>
          <Text style={{ color: palette.muted, lineHeight: 19, fontSize: 14 }}>{m.detail}</Text>
          {m.id === "price" || m.id === "customers" ? <Pressable onPress={() => router.push("/sales-test")} hitSlop={6}><Text style={{ color: palette.brand, fontWeight: "700", fontSize: 13, marginTop: 4 }}>Registrar teste com clientes →</Text></Pressable> : null}
        </View>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: isDone ? palette.green : "#CBC4B6", backgroundColor: isDone ? palette.green : "transparent", alignItems: "center", justifyContent: "center" }}>
          {isDone ? <Ionicons name="checkmark" size={16} color={palette.white} /> : null}
        </View>
      </Pressable>;
    })}
  </Page></ScrollView>;
}
