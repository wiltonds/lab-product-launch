/** Marca Vinga: o "V que brota" (o V é a curva de quem caiu e voltou a subir; a folha é o negócio que vingou). */
import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { palette } from "@/components/lab-ui";

export function VingaSymbol({ size = 28, stroke = palette.navy, leaf = palette.brand }: { size?: number; stroke?: string; leaf?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
    <Path d="M9 11l11 26 9-21" stroke={stroke} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M29 16c0-7 6-12 13-12 0 7-6 12-13 12z" fill={leaf} />
  </Svg>;
}

export function VingaLogo({ size = 22, dark = false }: { size?: number; dark?: boolean }) {
  return <View accessible accessibilityLabel="vinga" style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
    <VingaSymbol size={size * 1.3} stroke={dark ? palette.white : palette.navy} />
    <Text style={{ color: dark ? palette.white : palette.ink, fontWeight: "800", fontSize: size, letterSpacing: -size * 0.04 }}>vinga</Text>
  </View>;
}

/** "Olá." com degradê das cores da marca (laranja → amarelo → azul). */
export function Hello({ width = 300 }: { width?: number }) {
  const h = width * 0.42;
  return <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} accessibilityLabel="Olá">
    <Defs>
      <LinearGradient id="ola" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor={palette.brand} />
        <Stop offset="0.55" stopColor={palette.lime} />
        <Stop offset="1" stopColor={palette.sky} />
      </LinearGradient>
    </Defs>
    <SvgText x={width / 2} y={h * 0.82} textAnchor="middle" fontSize={h * 0.95} fontWeight="800" fill="url(#ola)" letterSpacing={-h * 0.05}>Olá.</SvgText>
  </Svg>;
}
