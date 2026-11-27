import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Card, Eyebrow, Heading, LinkButton, Page, Stepper, palette, numStyle } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useMunicipalInsights } from "@/hooks/use-municipal-insights";
import { TopBar } from "@/components/top-bar";
import { LeadGate } from "@/components/lead-gate";
import { WhatsAppVinga } from "@/components/whatsapp-vinga";
import { computeIndice } from "@/shared/indice";
import { registrarEvento } from "@/shared/leads";
import { activityIdOf, alavancasIniciais, brl, gerarPlano, num1, type Alavancas, type Item } from "@/shared/plano";

/** Plano de negócio vivo: a pessoa mexe nos números e vê o plano mudar. */
export default function PlanoScreen() {
  const router = useRouter();
  const { data, ready, update } = useAppData();
  useEffect(() => { void registrarEvento("abriu_plano", { atividade: data.idea.activity, municipioCodigo: data.idea.municipalityCode }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const insights = useMunicipalInsights(data.idea.outsideState ? "" : data.idea.municipalityCode, activityIdOf(data) ?? "", data.idea.neighborhood ?? "");
  // Os ajustes ficam guardados (data.plano): o início, o PDF e a próxima visita usam os mesmos números.
  const alav = ready ? alavancasIniciais(data) : null;
  const setAlav = (a: Alavancas | null) => void update({ plano: a ?? undefined });

  const ins = insights.status === "ready" ? insights.data : null;
  const plano = useMemo(() => alav ? gerarPlano(data, ins, alav) : null, [data, ins, alav]);
  if (!plano || !alav) return <View style={{ flex: 1, backgroundColor: palette.paper }} />;

  const r = plano.resumo;
  const un = plano.molde?.unidadePlural ?? "vendas";
  const set = (k: keyof Alavancas) => (v: number) => setAlav({ ...alav, [k]: v });
  const maxAbs = Math.max(1, ...plano.meses.map((m) => Math.abs(m.sobra)));
  const indice = computeIndice(data, ins?.marketScore ?? null, plano).score;

  // A troca do MVP: o plano completo (na tela e em PDF) em troca de nome + WhatsApp. A análise no início continua livre.
  return <LeadGate indice={indice}><ScrollView style={{ backgroundColor: palette.paper }} contentContainerStyle={{ paddingBottom: 48 }}>
    <View style={{ backgroundColor: palette.navy, paddingTop: 24, paddingBottom: 20 }}>
      <Page style={{ gap: 8, backgroundColor: "transparent" }}>
        <TopBar dark right={<Button title="PDF" icon="download-outline" onPress={() => router.push("/plano-pdf")} />} />
        <Eyebrow color={palette.lime}>SEU PLANO DE NEGÓCIO</Eyebrow>
        <Heading color={palette.white}>{plano.negocio}{plano.emCasa ? " em casa" : ""}</Heading>
        <Body color="#cfd9ea">{[data.profile.name, plano.bairro, `${plano.cidade}${plano.uf ? ` (${plano.uf})` : ""}`].filter(Boolean).join(" · ")}</Body>
      </Page>
    </View>

    <Page style={{ gap: 14, paddingTop: 16 }}>
      <WhatsAppVinga />
      <Card style={{ gap: 12 }}>
        <Eyebrow color={palette.amber}>RESUMO</Eyebrow>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Num valor={brl(r.paraComecar)} legenda="para abrir e aguentar 3 meses" />
          <Num valor={`${num1(r.vendasDiaParaRetirada)}/dia`} legenda={`${un} para pagar tudo e a sua retirada`} />
          <Num valor={brl(r.sobraMes3)} legenda="sobra no mês 3, antes da retirada" cor={r.sobraMes3 >= 0 ? palette.green : palette.red} />
        </View>
        <View style={{ backgroundColor: r.fecha ? palette.greenSoft : palette.redSoft, borderRadius: 12, padding: 12 }}>
          <Body color={palette.ink} size={14}>{r.fecha
            ? `Fecha a conta: você espera ${num1(alav.vendasDia)} ${un} por dia e precisa de ${num1(r.vendasDiaParaRetirada)}.`
            : `Ainda não fecha: precisa de ${num1(r.vendasDiaParaRetirada)} ${un} por dia e você espera ${num1(alav.vendasDia)}. Mexa no preço, nos dias ou comece com uma retirada menor.`}</Body>
        </View>
        <Body size={13}>{r.sobraDoDinheiro >= 0
          ? `Depois de abrir sobram ${brl(r.sobraDoDinheiro)} do seu dinheiro${r.mesesDeCasa !== null ? `; com a reserva, a casa aguenta ${r.mesesDeCasa < 1 ? "menos de 1 mês" : `${Math.floor(r.mesesDeCasa)} ${Math.floor(r.mesesDeCasa) === 1 ? "mês" : "meses"}`}` : ""}.`
          : `Faltam ${brl(-r.sobraDoDinheiro)} para abrir e aguentar 3 meses.`}
          {r.retornoEmMeses ? ` O investimento volta em cerca de ${r.retornoEmMeses} meses.` : ""}</Body>
      </Card>

      <Card style={{ gap: 4 }}>
        <Eyebrow color={palette.sky}>SIMULE: MEXA NOS NÚMEROS</Eyebrow>
        <Stepper label="Preço" hint={`por ${plano.molde?.unidade ?? "venda"}`} value={alav.preco} step={5} min={1} format={brl} onChange={set("preco")} />
        <Stepper label={`${cap(un)} por dia`} hint="quando o movimento firmar" value={alav.vendasDia} step={1} min={1} format={(v) => String(v)} onChange={set("vendasDia")} />
        <Stepper label="Dias de trabalho no mês" value={alav.diasMes} step={1} min={1} max={31} format={(v) => String(v)} onChange={set("diasMes")} />
        <Stepper label="Custo em cada venda" hint="material, insumo, peça" value={alav.custoVariavel} step={5} max={95} format={(v) => `${v}%`} onChange={set("custoVariavel")} />
        <Stepper label="Contas fixas do mês" hint="MEI, luz, água, internet" value={alav.fixos} step={50} format={brl} onChange={set("fixos")} />
        <Stepper label="Aluguel" hint="0 = em casa" value={alav.aluguel} step={100} format={brl} onChange={set("aluguel")} />
        <Stepper label="Sua retirada" hint="quanto você quer tirar por mês" value={alav.retirada} step={100} format={brl} onChange={set("retirada")} />
        <Stepper label="Para abrir" hint="equipamento, curso, reforma" value={alav.investimento} step={500} format={brl} onChange={set("investimento")} />
        <LinkButton title="Voltar aos números de partida" onPress={() => setAlav(null)} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Eyebrow color={palette.sky}>DINHEIRO, MÊS A MÊS</Eyebrow>
        <Body size={13}>Começo devagar: mês 1 com 40% do movimento, mês 2 com 70%. Sobra antes da sua retirada.</Body>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 120 }}>
          {plano.meses.map((m) => <View key={m.mes} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ width: "100%", height: Math.max(3, Math.abs(m.sobra) / maxAbs * 96), backgroundColor: m.sobra >= 0 ? palette.green : palette.red, borderRadius: 3 }} />
            <Text style={{ fontSize: 10, color: palette.muted }}>{m.mes}</Text>
          </View>)}
        </View>
        {plano.cenarios.map((c) => <Linha key={c.id} rotulo={c.nome} valor={`${brl(c.resultadoMes)}/mês`} cor={c.resultadoMes >= 0 ? palette.green : palette.red} />)}
        <Body size={12}>Resultado depois da retirada, com o movimento firme. "Se vender menos": 30% menos clientes e 10% menos preço.</Body>
      </Card>

      <Card style={{ gap: 8 }}>
        <Eyebrow color={palette.sky}>MERCADO NA SUA REGIÃO</Eyebrow>
        {insights.status === "loading" ? <Body>Buscando os dados da sua cidade…</Body> : null}
        {insights.status === "unavailable" ? <Body>Sem dados da cidade agora. O plano usa só os seus números.</Body> : null}
        {plano.mercado?.sinais.map((s, i) => <View key={i} style={{ gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: palette.line }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: palette.muted, textTransform: "uppercase" }}>{s.titulo}</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: palette.ink }}>{s.manchete}</Text>
          {s.comparacao ? <Body size={13}>{s.comparacao}</Body> : null}
        </View>)}
      </Card>

      <Card style={{ gap: 10 }}>
        <Eyebrow color={palette.sky}>FORÇAS, FRAQUEZAS, OPORTUNIDADES E AMEAÇAS</Eyebrow>
        <Quadro titulo="Forças" itens={plano.swot.forcas} cor={palette.green} />
        <Quadro titulo="Fraquezas" itens={plano.swot.fraquezas} cor={palette.amber} />
        <Quadro titulo="Oportunidades" itens={plano.swot.oportunidades} cor={palette.sky} />
        <Quadro titulo="Ameaças" itens={plano.swot.ameacas} cor={palette.red} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Eyebrow color={palette.red}>RISCOS E PLANO B</Eyebrow>
        {[...plano.riscos, ...plano.planoB].map((x, i) => <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <Ionicons name={i < plano.riscos.length ? "alert-circle" : "git-branch-outline"} size={18} color={i < plano.riscos.length ? palette.red : palette.sky} />
          <View style={{ flex: 1 }}><Body color={palette.ink} size={14}>{x.texto}</Body></View>
        </View>)}
      </Card>

      {plano.passos.length ? <Card style={{ gap: 8 }}>
        <Eyebrow color={palette.sky}>PRIMEIROS 90 DIAS</Eyebrow>
        {plano.passos.map((p, i) => <Linha key={i} rotulo={`${i + 1}. ${p}`} valor="" />)}
      </Card> : null}

      <Body size={12}>Simulação com números de partida do ramo (a calibrar) e dados públicos da Receita Federal e do IBGE. Não é promessa de resultado.</Body>
    </Page>
  </ScrollView></LeadGate>;
}

function Num({ valor, legenda, cor = palette.navy }: { valor: string; legenda: string; cor?: string }) {
  return <View style={{ flex: 1, gap: 2 }}>
    <Text style={{ fontSize: 18, fontWeight: "800", color: cor, ...numStyle }}>{valor}</Text>
    <Text style={{ fontSize: 11, color: palette.muted }}>{legenda}</Text>
  </View>;
}

function Linha({ rotulo, valor, cor = palette.ink }: { rotulo: string; valor: string; cor?: string }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 4 }}>
    <View style={{ flex: 1 }}><Body color={palette.ink} size={14}>{rotulo}</Body></View>
    {valor ? <Text style={{ fontSize: 14, fontWeight: "800", color: cor, ...numStyle }}>{valor}</Text> : null}
  </View>;
}

function Quadro({ titulo, itens, cor }: { titulo: string; itens: Item[]; cor: string }) {
  return <View style={{ gap: 4 }}>
    <Text style={{ fontSize: 13, fontWeight: "800", color: cor }}>{titulo}</Text>
    {itens.length ? itens.map((x, i) => <Body key={i} color={palette.ink} size={14}>• {x.texto}</Body>) : <Body size={13}>Nada marcante pelos dados.</Body>}
  </View>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
