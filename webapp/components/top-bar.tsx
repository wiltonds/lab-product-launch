import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VingaLogo } from "@/components/vinga";
import { palette } from "@/components/lab-ui";

/** Volta uma tela; se a pessoa chegou direto por um link (sem histórico), vai para o início. */
export function useVoltar() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace("/"));
}

/** Logo do Vinga que leva sempre ao início (mesmo padrão do cabeçalho das abas). */
export function LogoInicio({ dark = false, size = 18 }: { dark?: boolean; size?: number }) {
  const router = useRouter();
  return <Pressable accessibilityRole="link" accessibilityLabel="Ir para o início" onPress={() => router.replace("/")} hitSlop={8}>
    <VingaLogo size={size} dark={dark} />
  </Pressable>;
}

/**
 * Barra do topo das telas fora das abas: voltar à esquerda, logo (início) no meio, ação opcional à direita.
 * `onBack` troca o voltar padrão (ex.: voltar uma etapa dentro do cadastro).
 */
export function TopBar({ dark = false, onBack, right }: { dark?: boolean; onBack?: () => void; right?: ReactNode }) {
  const voltar = useVoltar();
  return <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}>
    <View style={{ flex: 1, alignItems: "flex-start" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack ?? voltar} hitSlop={10}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dark ? "rgba(255,255,255,0.12)" : palette.white, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="arrow-back" size={20} color={dark ? palette.white : palette.ink} />
      </Pressable>
    </View>
    <LogoInicio dark={dark} />
    <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
  </View>;
}
