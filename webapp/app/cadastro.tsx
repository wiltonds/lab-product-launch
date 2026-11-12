import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Heading, Page, palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { savePerfil, sendCode, supabaseConfigured, verifyCode } from "@/shared/supabase";
import { maskWhatsapp, normalizeEmail, onlyDigits, suggestEmail, validateCode, validateEmail, validateName, validateWhatsapp } from "@/shared/validation";
import municipalityData from "@/shared/data/alagoas-municipios.json";

const localities = municipalityData.municipalities as { ibgeCode: string; name: string }[];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Input({ label, error, icon, ...props }: TextInputProps & { label: string; error?: string | null; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={{ gap: 6 }}>
    <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 14 }}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.white, borderRadius: 16, paddingHorizontal: 14, borderWidth: 2, borderColor: error ? palette.red : palette.line }}>
      <Ionicons name={icon} size={18} color={error ? palette.red : palette.muted} />
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={palette.faint} style={{ flex: 1, paddingVertical: 15, fontSize: 16, color: palette.ink }} />
    </View>
    {error ? <Text style={{ color: palette.red, fontSize: 13 }}>{error}</Text> : null}
  </View>;
}

export default function CadastroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ modo?: string }>();
  const { data, update } = useAppData();
  const [mode, setMode] = useState<"criar" | "entrar">(params.modo === "entrar" ? "entrar" : "criar");
  const [stage, setStage] = useState<"dados" | "codigo" | "pronto">("dados");
  const [name, setName] = useState(data.profile.name);
  const [whatsapp, setWhatsapp] = useState(maskWhatsapp(data.profile.whatsapp));
  const [email, setEmail] = useState(data.profile.email);
  const [city, setCity] = useState(data.idea.municipality || data.profile.homeCity);
  const [cityOpen, setCityOpen] = useState(false);
  const [consent, setConsent] = useState(data.profile.marketingConsent);
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const cityMatch = localities.find((c) => norm(c.name) === norm(city.trim()));
  const errors = {
    name: mode === "criar" ? validateName(name) : null,
    whatsapp: mode === "criar" ? validateWhatsapp(whatsapp) : null,
    email: validateEmail(email),
    city: mode === "criar" && !cityMatch ? "Escolha um município de Alagoas da lista." : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const cities = useMemo(() => (cityOpen && city ? localities.filter((c) => norm(c.name).includes(norm(city))).slice(0, 5) : []), [city, cityOpen]);
  const fix = suggestEmail(email);
  const show = (e: string | null) => (touched ? e : null);

  const requestCode = async () => {
    setTouched(true); setServerError("");
    if (!valid) return;
    setBusy(true);
    const err = await sendCode(normalizeEmail(email), mode === "criar");
    setBusy(false);
    if (err) { setServerError(err); return; }
    setStage("codigo");
  };

  const confirm = async () => {
    setServerError("");
    const e = validateCode(code);
    if (e) { setServerError(e); return; }
    setBusy(true);
    let err = await verifyCode(normalizeEmail(email), onlyDigits(code));
    if (!err && mode === "criar") {
      err = await savePerfil({
        nome: name.trim(), whatsapp: onlyDigits(whatsapp), municipio: cityMatch?.name ?? "", municipio_codigo: cityMatch?.ibgeCode ?? "",
        motivacao: data.profile.motivation, fase: data.profile.stage, experiencia: data.profile.experience, aceita_marketing: consent,
      });
    }
    setBusy(false);
    if (err) { setServerError(err); return; }
    await update({ profile: { ...data.profile, ...(mode === "criar" ? { name: name.trim(), whatsapp: onlyDigits(whatsapp), homeCity: cityMatch?.name ?? "", marketingConsent: consent } : {}), email: normalizeEmail(email), verified: true } });
    setStage("pronto");
  };

  if (!supabaseConfigured()) {
    return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}><Page style={{ paddingTop: 24 }}>
      <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="arrow-back" size={20} color={palette.ink} /><Text style={{ color: palette.ink, fontWeight: "700" }}>Voltar</Text></Pressable>
      <Heading>Contas chegam em breve</Heading>
      <Body>Estamos finalizando o cadastro com confirmação por e-mail. Sua análise continua salva neste aparelho.</Body>
    </Page></ScrollView>;
  }

  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} keyboardShouldPersistTaps="handled"><Page style={{ paddingTop: 18 }}>
    <Pressable onPress={() => (stage === "codigo" ? setStage("dados") : router.back())} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="arrow-back" size={20} color={palette.ink} />
    </Pressable>

    {stage === "dados" ? <>
      <View style={{ flexDirection: "row", backgroundColor: "#E9EBF2", borderRadius: 999, padding: 4 }}>
        {(["criar", "entrar"] as const).map((m) => <Pressable key={m} onPress={() => { setMode(m); setTouched(false); setServerError(""); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center", backgroundColor: mode === m ? palette.white : "transparent" }}>
          <Text style={{ fontWeight: "800", color: mode === m ? palette.ink : palette.muted }}>{m === "criar" ? "Criar conta" : "Já tenho conta"}</Text>
        </Pressable>)}
      </View>
      <Heading>{mode === "criar" ? "Salve sua análise" : "Bem-vindo de volta"}</Heading>
      <Body>{mode === "criar" ? "Com a conta, você acessa sua análise de qualquer aparelho e recebe o plano completo." : "Digite seu e-mail. Vamos mandar um código de 6 números para você entrar."}</Body>

      {mode === "criar" ? <Input label="Nome" icon="person-outline" value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" error={show(errors.name)} /> : null}
      <View style={{ gap: 6 }}>
        <Input label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="voce@gmail.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={show(errors.email)} />
        {fix ? <Pressable onPress={() => setEmail(fix)}><Text style={{ color: palette.brand, fontWeight: "700", fontSize: 13 }}>Usar {fix}</Text></Pressable> : null}
      </View>
      {mode === "criar" ? <>
        <Input label="WhatsApp" icon="logo-whatsapp" value={whatsapp} onChangeText={(v) => setWhatsapp(maskWhatsapp(v))} placeholder="(82) 9 9999-9999" keyboardType="phone-pad" error={show(errors.whatsapp)} />
        <View style={{ gap: 6 }}>
          <Input label="Seu município" icon="location-outline" value={city} onChangeText={(v) => { setCity(v); setCityOpen(true); }} placeholder="Ex.: Arapiraca" error={show(errors.city)} />
          {cities.map((c) => <Pressable key={c.ibgeCode} onPress={() => { setCity(c.name); setCityOpen(false); }} style={{ paddingVertical: 11, paddingHorizontal: 14, backgroundColor: palette.white, borderRadius: 12 }}>
            <Text style={{ color: palette.ink, fontSize: 15 }}>{c.name}</Text>
          </Pressable>)}
        </View>
        <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name={consent ? "checkbox" : "square-outline"} size={22} color={palette.brand} />
          <Text style={{ color: palette.ink, flex: 1, lineHeight: 20 }}>Quero receber dicas e novidades no WhatsApp e no e-mail (opcional)</Text>
        </Pressable>
      </> : null}

      {serverError ? <View style={{ backgroundColor: palette.redSoft, borderRadius: 14, padding: 12 }}><Text style={{ color: palette.red, fontWeight: "600" }}>{serverError}</Text></View> : null}
      <Button title={busy ? "Enviando…" : "Receber código por e-mail"} icon="mail-outline" onPress={() => void requestCode()} disabled={busy} />
      <Text style={{ color: palette.faint, fontSize: 12, textAlign: "center", lineHeight: 18 }}>Sem senha: você entra sempre com um código enviado ao seu e-mail.</Text>
    </> : null}

    {stage === "codigo" ? <>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="mail-open-outline" size={30} color={palette.brand} /></View>
      <Heading>Confira seu e-mail</Heading>
      <Body>Mandamos um código de 6 números para <Text style={{ fontWeight: "800", color: palette.ink }}>{normalizeEmail(email)}</Text>. Pode levar 1 minuto. Olhe também o spam.</Body>
      <TextInput autoFocus value={code} onChangeText={(v) => setCode(onlyDigits(v).slice(0, 6))} placeholder="000000" placeholderTextColor={palette.faint} keyboardType="number-pad" maxLength={6} accessibilityLabel="Código de 6 números"
        style={{ backgroundColor: palette.white, borderRadius: 18, paddingVertical: 18, fontSize: 32, fontWeight: "800", letterSpacing: 12, textAlign: "center", color: palette.ink, borderWidth: 2, borderColor: serverError ? palette.red : palette.line }} />
      {serverError ? <Text style={{ color: palette.red, fontWeight: "600" }}>{serverError}</Text> : null}
      <Button title={busy ? "Confirmando…" : "Confirmar"} onPress={() => void confirm()} disabled={busy || code.length !== 6} />
      <Pressable onPress={() => void requestCode()} disabled={busy}><Text style={{ color: palette.brand, fontWeight: "700", textAlign: "center" }}>Reenviar código</Text></Pressable>
      <Pressable onPress={() => setStage("dados")}><Text style={{ color: palette.muted, textAlign: "center" }}>Corrigir e-mail</Text></Pressable>
    </> : null}

    {stage === "pronto" ? <>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: palette.greenSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark-circle" size={40} color={palette.green} /></View>
      <Heading>{mode === "criar" ? `Conta criada${name ? `, ${name.trim().split(" ")[0]}` : ""}!` : "Você entrou!"}</Heading>
      <Body>Seu e-mail foi confirmado. Sua análise fica salva na sua conta.</Body>
      <Button title={data.idea.activity ? "Ver minha análise" : "Começar minha análise"} icon="arrow-forward" onPress={() => router.replace(data.idea.activity ? "/(tabs)" : "/onboarding")} />
    </> : null}
  </Page></ScrollView>;
}
