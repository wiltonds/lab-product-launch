import { PropsWithChildren, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Design system do Lab do Meu Negócio.
 * Direção "Energia": laranja (ação), azul-marinho (confiança), amarelo (destaque). Um número forte por bloco,
 * prós e contras do local, faixa de comparação ao lado de cada número.
 */
export const palette = {
  // marca: energia (laranja) + confiança (azul-marinho) + destaque (amarelo)
  brand: "#FF6B2C", brandDeep: "#14213D", brandSoft: "#FFF0E8", lime: "#FFC93C",
  navy: "#14213D", navySoft: "#E8ECF5", sky: "#3D7BFF", skySoft: "#E9F0FF",
  // texto e superfícies
  ink: "#14213D", muted: "#5B6478", faint: "#9AA1B2",
  paper: "#F6F7FB", white: "#FFFFFF", line: "#E4E7EF",
  // estados
  green: "#12A150", greenSoft: "#E3F7EC", amber: "#C77700", amberSoft: "#FFF4D6",
  red: "#E5484D", redSoft: "#FDECEC",
  // compatibilidade com telas antigas
  teal: "#FF6B2C", tealSoft: "#FFF0E8",
};

/** Cores dos ícones de negócio (fundo, ícone). */
export const TILE_COLORS: [string, string][] = [
  ["#FFE6DA", "#E2531A"], ["#FFF1C7", "#B07A00"], ["#E3ECFF", "#2F62D9"], ["#E2F6EA", "#13864A"],
  ["#F3E8FF", "#7A3BD1"], ["#FFE3EC", "#C9305E"], ["#E0F5F7", "#0F8090"], ["#FFEFD9", "#C25E00"],
];

const num = { fontVariant: ["tabular-nums" as const] };
const shadow = Platform.select({
  web: { boxShadow: "0 1px 2px rgba(16,35,28,0.04), 0 8px 24px rgba(16,35,28,0.06)" } as any,
  default: { shadowColor: "#10231C", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
});

export function Page({ children, style }: PropsWithChildren<{ style?: any }>) { return <View style={[styles.page, style]}>{children}</View>; }
export function Eyebrow({ children, color = palette.brand }: PropsWithChildren<{ color?: string }>) { return <Text style={[styles.eyebrow, { color }]}>{children}</Text>; }
export function Heading({ children, size = 28, color = palette.ink }: PropsWithChildren<{ size?: number; color?: string }>) { return <Text style={[styles.heading, { fontSize: size, lineHeight: Math.round(size * 1.18), color }]}>{children}</Text>; }
export function Body({ children, color = palette.muted, size = 15 }: PropsWithChildren<{ color?: string; size?: number }>) { return <Text style={[styles.body, { color, fontSize: size, lineHeight: Math.round(size * 1.47) }]}>{children}</Text>; }
export function Card({ children, style }: PropsWithChildren<{ style?: any }>) { return <View style={[styles.card, style]}>{children}</View>; }

export function Button({ title, onPress, secondary = false, disabled = false, icon }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }, disabled && { opacity: 0.45 }]}>
    <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    {icon ? <Ionicons name={icon} size={18} color={secondary ? palette.brand : palette.white} /> : null}
  </Pressable>;
}

export function LinkButton({ title, onPress, color = palette.brand }: { title: string; onPress: () => void; color?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text style={{ color, fontWeight: "700", fontSize: 15 }}>{title}</Text><Ionicons name="chevron-forward" size={16} color={color} />
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, helper }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: TextInputProps["keyboardType"]; multiline?: boolean; helper?: string }) {
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.faint} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && { minHeight: 96, textAlignVertical: "top" }]} />{helper ? <Text style={styles.helper}>{helper}</Text> : null}</View>;
}

export function Choice({ label, selected, onPress, detail }: { label: string; selected: boolean; onPress: () => void; detail?: string }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && { opacity: 0.9 }]}>
    <View style={{ flex: 1, gap: 2 }}><Text style={[styles.choiceText, selected && { color: palette.brandDeep, fontWeight: "700" }]}>{label}</Text>{detail ? <Text style={styles.helper}>{detail}</Text> : null}</View>
    <View style={[styles.check, selected && styles.checkOn]}>{selected ? <Ionicons name="checkmark" size={14} color={palette.white} /> : null}</View>
  </Pressable>;
}

/** Cartão grande com ícone, para escolhas visuais (tipo de negócio). */
export function OptionTile({ label, icon, selected, onPress, color = 0 }: { label: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; onPress: () => void; color?: number }) {
  const [bg, fg] = TILE_COLORS[color % TILE_COLORS.length];
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && { transform: [{ scale: 0.97 }] }]}>
    <View style={[styles.tileIcon, { backgroundColor: selected ? palette.white : bg }]}><Ionicons name={icon} size={26} color={fg} /></View>
    <Text style={[styles.tileText, selected && { color: palette.white }]} numberOfLines={2}>{label}</Text>
  </Pressable>;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
    <Text style={[styles.chipText, selected && { color: palette.white }]}>{label}</Text>
  </Pressable>;
}

export function Segmented<T extends string>({ options, value, onChange, dark = false }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; dark?: boolean }) {
  return <View style={[styles.segment, dark && { backgroundColor: "rgba(255,255,255,0.12)" }]}>
    {options.map((o) => {
      const on = o.id === value;
      return <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o.id)} style={[styles.segmentItem, on && { backgroundColor: dark ? palette.lime : palette.white }]}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: on ? palette.brandDeep : dark ? "#C9D2E3" : palette.muted }}>{o.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** Linha de premissa com − / + e valor editável por toque. */
export function Stepper({ label, value, onChange, step, format, min = 0, max, hint }: { label: string; value: number; onChange: (v: number) => void; step: number; format: (v: number) => string; min?: number; max?: number; hint?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const clamp = (v: number) => Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, v));
  const commit = () => { const n = Number(draft.replace(/\./g, "").replace(",", ".")); if (Number.isFinite(n)) onChange(clamp(n)); setEditing(false); };
  return <View style={styles.stepRow}>
    <View style={{ flex: 1, gap: 2 }}><Text style={styles.stepLabel}>{label}</Text>{hint ? <Text style={styles.helper}>{hint}</Text> : null}</View>
    <View style={styles.stepCtl}>
      <Pressable accessibilityLabel={`Diminuir ${label}`} onPress={() => onChange(clamp(value - step))} style={styles.stepBtn} hitSlop={6}><Ionicons name="remove" size={18} color={palette.brand} /></Pressable>
      {editing
        ? <TextInput autoFocus value={draft} onChangeText={setDraft} onBlur={commit} onSubmitEditing={commit} keyboardType="decimal-pad" style={[styles.stepValue, styles.stepInput]} />
        : <Pressable accessibilityLabel={`Editar ${label}`} onPress={() => { setDraft(String(value)); setEditing(true); }}><Text style={styles.stepValue}>{format(value)}</Text></Pressable>}
      <Pressable accessibilityLabel={`Aumentar ${label}`} onPress={() => onChange(clamp(value + step))} style={styles.stepBtn} hitSlop={6}><Ionicons name="add" size={18} color={palette.brand} /></Pressable>
    </View>
  </View>;
}

export function ProgressBar({ value, color = palette.brand, track = "#ECE7DD", height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  return <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}><View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height, backgroundColor: color, borderRadius: height }} /></View>;
}

export function Tag({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "positive" | "attention" | "risk" | "dark" }>) {
  const [bg, fg] = { neutral: [palette.brandSoft, palette.brand], positive: [palette.greenSoft, palette.green], attention: [palette.amberSoft, palette.amber], risk: [palette.redSoft, palette.red], dark: ["rgba(255,255,255,0.14)", "#E8ECF5"] }[tone];
  return <View style={[styles.tag, { backgroundColor: bg }]}><Text style={[styles.tagText, { color: fg }]}>{children}</Text></View>;
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}><View style={{ gap: 4, flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.helper}>{subtitle}</Text> : null}</View>{right}</View>;
}

export function IconBadge({ icon, bg = palette.brandSoft, color = palette.brand, size = 40 }: { icon: keyof typeof Ionicons.glyphMap; bg?: string; color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={size * 0.5} color={color} /></View>;
}

export const numStyle = num;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, gap: 16, width: "100%", maxWidth: 560, alignSelf: "center" },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
  heading: { fontWeight: "800", letterSpacing: -0.6 },
  body: {},
  card: { padding: 20, borderRadius: 24, backgroundColor: palette.white, gap: 14, ...shadow },
  button: { minHeight: 56, borderRadius: 999, paddingHorizontal: 22, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { color: palette.white, fontSize: 16, fontWeight: "800" },
  buttonSecondary: { backgroundColor: palette.brandSoft }, buttonSecondaryText: { color: palette.brand },
  fieldWrap: { gap: 7 }, label: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: palette.white, borderColor: palette.line, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: palette.ink, fontSize: 16, minHeight: 54 },
  helper: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  choice: { minHeight: 58, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.white, borderRadius: 18, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  choiceSelected: { borderColor: palette.brand, backgroundColor: palette.brandSoft },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "#CBC4B6", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  choiceText: { color: palette.ink, fontSize: 16, fontWeight: "600" },
  tile: { flexBasis: "47%", flexGrow: 1, maxWidth: "48.6%", minHeight: 112, borderRadius: 22, backgroundColor: palette.white, padding: 16, justifyContent: "space-between", gap: 12, borderWidth: 2, borderColor: "transparent", ...shadow },
  tileOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tileText: { color: palette.ink, fontSize: 15, fontWeight: "700", lineHeight: 19 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: palette.white, borderWidth: 1.5, borderColor: palette.line },
  chipOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  chipText: { color: palette.ink, fontSize: 15, fontWeight: "700" },
  segment: { flexDirection: "row", backgroundColor: "#ECE7DD", borderRadius: 999, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1ECE3" },
  stepLabel: { color: palette.ink, fontSize: 15, fontWeight: "600" },
  stepCtl: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 86, textAlign: "center", color: palette.ink, fontSize: 16, fontWeight: "800", ...num },
  stepInput: { borderBottomWidth: 2, borderBottomColor: palette.brand, paddingVertical: 2 },
  tag: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
});
