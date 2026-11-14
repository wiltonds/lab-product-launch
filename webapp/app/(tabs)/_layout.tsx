import { Tabs, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VingaLogo } from "@/components/vinga";
import { useColors } from "@/hooks/use-colors";
import { useAppData } from "@/hooks/use-app-data";
import { palette } from "@/components/lab-ui";

const WIDE = 768;
const NAV: { route: "/" | "/simulator" | "/missions"; name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: "/", name: "index", title: "Análise", icon: "analytics-outline" },
  { route: "/simulator", name: "simulator", title: "Simulador", icon: "calculator-outline" },
  { route: "/missions", name: "missions", title: "Plano", icon: "checkmark-circle-outline" },
];

/** Avatar do perfil: inicial do nome (laranja) ou ícone de pessoa para quem ainda não tem nome/conta. */
function Avatar() {
  const router = useRouter();
  const { data } = useAppData();
  const initial = data.profile.name.trim().charAt(0).toUpperCase();
  return <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push("/profile")} hitSlop={8}
    style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: initial ? palette.brand : palette.navySoft, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1, borderWidth: data.profile.verified ? 2 : 0, borderColor: palette.lime })}>
    {initial ? <Text style={{ color: palette.white, fontWeight: "800", fontSize: 17 }}>{initial}</Text> : <Ionicons name="person-outline" size={20} color={palette.navy} />}
  </Pressable>;
}

/** Cabeçalho fixo: logo à esquerda, avatar à direita; em tela larga, as abas ficam aqui no meio. */
function AppHeader({ wide }: { wide: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: palette.white, borderBottomWidth: 1, borderBottomColor: palette.line, paddingTop: Platform.OS === "web" ? 0 : insets.top }}>
    <View style={{ height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 16, width: "100%", maxWidth: wide ? 1080 : 560, alignSelf: "center" }}>
      <Pressable onPress={() => router.push("/")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="link" accessibilityLabel="Início">
        <VingaLogo size={20} />
      </Pressable>
      <View style={{ flex: 1 }} />
      {wide ? <View style={{ flexDirection: "row", gap: 4 }}>
        {NAV.map((n) => {
          const on = n.route === "/" ? path === "/" : path.startsWith(n.route);
          return <Pressable key={n.name} onPress={() => router.push(n.route)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? palette.brandSoft : "transparent" }}>
            <Ionicons name={n.icon} size={18} color={on ? palette.brand : palette.muted} />
            <Text style={{ color: on ? palette.brand : palette.ink, fontWeight: "700", fontSize: 15 }}>{n.title}</Text>
          </Pressable>;
        })}
      </View> : null}
      <Avatar />
    </View>
  </View>;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data } = useAppData();
  const wide = width >= WIDE;
  const started = Boolean(data.idea.activity);       // antes da 1ª análise: só a tela de boas-vindas, sem menu
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const hideBar = !started || wide;
  return (
    <Tabs screenOptions={{
      headerShown: started,
      header: () => <AppHeader wide={wide} />,
      tabBarActiveTintColor: palette.brand,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: hideBar ? { display: "none" } : { height: 62 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: "#FFFFFF", borderTopColor: palette.line, borderTopWidth: 1 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
    }}>
      {NAV.map((n) => <Tabs.Screen key={n.name} name={n.name} options={{ title: n.title, tabBarIcon: ({ color, size }) => <Ionicons name={n.icon} color={color} size={size} /> }} />)}
      <Tabs.Screen name="profile" options={{ title: "Perfil", href: null }} />
    </Tabs>
  );
}
