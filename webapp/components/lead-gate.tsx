import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Eyebrow, Field, Heading, Page, palette } from "@/components/lab-ui";
import { TopBar } from "@/components/top-bar";
import { useAppData } from "@/hooks/use-app-data";
import { salvarLead } from "@/shared/leads";
import { maskWhatsapp, validateName, validateWhatsapp } from "@/shared/validation";

function Caixa({ marcada, onPress, children }: { marcada: boolean; onPress: () => void; children: ReactNode }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: marcada }} onPress={onPress} hitSlop={6} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
    <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: marcada ? palette.brand : palette.line, backgroundColor: marcada ? palette.brand : palette.white, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
      {marcada ? <Ionicons name="checkmark" size={16} color={palette.white} /> : null}
    </View>
    <View style={{ flex: 1 }}>{children}</View>
  </Pressable>;
}

/**
 * A troca do MVP: o plano de negócio em PDF em troca de nome + WhatsApp.
 * Sem código por e-mail (era onde mais gente desistia). Quem já tem conta confirmada passa direto.
 */
export function LeadGate({ indice, children }: { indice: number | null; children: ReactNode }) {
  const router = useRouter();
  const { data, update, ready } = useAppData();
  const [nome, setNome] = useState(data.profile.name);
  const [whatsapp, setWhatsapp] = useState(maskWhatsapp(data.profile.whatsapp));
  const [contato, setContato] = useState(false);
  const [marketing, setMarketing] = useState(data.profile.marketingConsent);
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroServidor, setErroServidor] = useState("");
  // Os dados salvos no aparelho chegam depois do primeiro desenho: preenche uma vez quando ficam prontos,
  // sem apagar o que a pessoa já começou a digitar.
  const preenchido = useRef(false);
  useEffect(() => {
    if (!ready || preenchido.current) return;
    preenchido.current = true;
    setNome((v) => v || data.profile.name);
    setWhatsapp((v) => v || maskWhatsapp(data.profile.whatsapp));
    setMarketing((v) => v || data.profile.marketingConsent);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data.lead || data.profile.verified) return <>{children}</>;

  const erros = { nome: validateName(nome), whatsapp: validateWhatsapp(whatsapp), contato: contato ? null : "Marque para receber o plano." };
  const ok = !erros.nome && !erros.whatsapp && !erros.contato;
  const negocio = data.idea.activity ? data.idea.activity.toLowerCase() : "seu negócio";
  const cidade = data.idea.municipality;

  const enviar = async () => {
    setTentou(true); setErroServidor("");
    if (!ok || enviando) return;
    setEnviando(true);
    const p = data.profile;
    const erro = await salvarLead({
      nome, whatsapp, municipio: cidade, municipioCodigo: data.idea.municipalityCode, uf: data.idea.municipalityUf ?? "",
      bairro: data.idea.neighborhood ?? "", atividade: data.idea.activity, motivacao: p.motivation, fase: p.stage,
      capital: p.investable, indice, aceitaContato: contato, aceitaMarketing: marketing,
    });
    setEnviando(false);
    if (erro) { setErroServidor(erro); return; }
    await update({ lead: { enviadoEm: new Date().toISOString() }, profile: { ...p, name: nome.trim(), whatsapp, marketingConsent: marketing } });
  };

  return <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} keyboardShouldPersistTaps="handled"><Page>
    <TopBar />
    <Eyebrow>SEU PLANO DE NEGÓCIO</Eyebrow>
    <Heading>Receba o plano completo da sua {negocio}{cidade ? ` em ${cidade}` : ""}.</Heading>
    <Body>Sumário, mercado da sua cidade, modelo de negócio, operação, financeiro de 12 meses, cenários, riscos e os primeiros 90 dias. Em PDF, para imprimir ou mostrar a quem vai te ajudar.</Body>
    <Card>
      <Field label="Seu nome" value={nome} onChangeText={setNome} placeholder="Como podemos te chamar" error={tentou ? erros.nome ?? undefined : undefined} />
      <Field label="Seu WhatsApp" value={whatsapp} onChangeText={(v) => setWhatsapp(maskWhatsapp(v))} placeholder="(82) 9 9999-9999" keyboardType="phone-pad" error={tentou ? erros.whatsapp ?? undefined : undefined} />
      <Caixa marcada={contato} onPress={() => setContato((v) => !v)}>
        <Text style={{ color: palette.ink, fontSize: 14, lineHeight: 20 }}>Aceito receber meu plano e falar com o Vinga pelo WhatsApp sobre o meu negócio.</Text>
        {tentou && erros.contato ? <Text style={{ color: palette.red, fontSize: 13, marginTop: 2 }}>{erros.contato}</Text> : null}
      </Caixa>
      <Caixa marcada={marketing} onPress={() => setMarketing((v) => !v)}>
        <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>Quero receber dicas e novidades (opcional).</Text>
      </Caixa>
    </Card>
    {erroServidor ? <Text accessibilityRole="alert" style={{ color: palette.red, fontWeight: "700" }}>{erroServidor}</Text> : null}
    <Button title={enviando ? "Enviando…" : "Ver meu plano completo"} icon="document-text" onPress={() => void enviar()} disabled={enviando} />
    <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
      Seus dados ficam só com o Vinga e você pode pedir para apagar quando quiser.{" "}
      <Text accessibilityRole="link" onPress={() => router.push("/privacy")} style={{ color: palette.brandText, fontWeight: "700" }}>Ver privacidade</Text>
    </Text>
  </Page></ScrollView>;
}
