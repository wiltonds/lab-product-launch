import { useEffect, useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { palette } from "@/components/lab-ui";
import { useAppData } from "@/hooks/use-app-data";
import { useMunicipalInsights } from "@/hooks/use-municipal-insights";
import { activityIdOf, alavancasIniciais, brl, gerarPlano, num1, type Item } from "@/shared/plano";
import { planoSessao } from "@/shared/plano-sessao";

/**
 * Plano completo para imprimir ou salvar em PDF, no padrão do Sebrae:
 * 1 sumário · 2 mercado · 3 marketing (canvas) · 4 operacional · 5 financeiro · 6 cenários · 7 avaliação estratégica.
 * No navegador, "Salvar PDF" abre a impressão; os botões somem no papel.
 */
export default function PlanoPdfScreen() {
  const router = useRouter();
  const { data, ready } = useAppData();
  const insights = useMunicipalInsights(data.idea.outsideState ? "" : data.idea.municipalityCode, activityIdOf(data) ?? "", data.idea.neighborhood ?? "");
  const ins = insights.status === "ready" ? insights.data : null;
  const plano = useMemo(() => ready ? gerarPlano(data, ins, planoSessao.get() ?? alavancasIniciais(data)) : null, [ready, data, ins]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = "@media print { [data-semimpressao] { display: none !important; } @page { size: A4; margin: 14mm; } body { background: #fff !important; } }";
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  if (!plano) return <View style={{ flex: 1, backgroundColor: palette.white }} />;
  const r = plano.resumo, a = plano.alavancas, un = plano.molde?.unidadePlural ?? "vendas";
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const semImp = { dataSet: { semimpressao: "1" } } as any;

  return <ScrollView style={{ backgroundColor: palette.white }} contentContainerStyle={{ alignItems: "center", paddingVertical: 24 }}>
    <View style={{ width: "100%", maxWidth: 760, paddingHorizontal: 24, gap: 18 }}>
      <View {...semImp} style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={btn(false)}><Text style={{ color: palette.navy, fontWeight: "700" }}>← Voltar ao painel</Text></Pressable>
        {Platform.OS === "web" ? <Pressable accessibilityRole="button" onPress={() => window.print()} style={btn(true)}><Text style={{ color: palette.navy, fontWeight: "800" }}>Salvar PDF</Text></Pressable> : null}
      </View>

      <View style={{ backgroundColor: palette.navy, borderRadius: 12, padding: 20, gap: 4 }}>
        <Text style={{ color: palette.lime, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>PLANO DE NEGÓCIO · {hoje.toUpperCase()}</Text>
        <Text style={{ color: palette.white, fontSize: 26, fontWeight: "800" }}>{plano.negocio}{plano.emCasa ? " em casa" : ""}</Text>
        <Text style={{ color: "#cfd9ea", fontSize: 13 }}>{[data.profile.name, plano.bairro, `${plano.cidade}${plano.uf ? ` (${plano.uf})` : ""}`].filter(Boolean).join(" · ")}</Text>
      </View>

      <Secao n={1} titulo="Sumário executivo">
        <P>{`${plano.negocio}${plano.emCasa ? ", começando em casa ou a domicílio," : ""} em ${plano.cidade}. Para abrir e aguentar os 3 primeiros meses: ${brl(r.paraComecar)} (${brl(a.investimento)} de investimento e ${brl(r.capitalGiro)} de capital de giro). Dinheiro disponível: ${brl(data.profile.investable)}.`}</P>
        <P>{r.fecha
          ? `A conta fecha: com ${num1(a.vendasDia)} ${un} por dia a ${brl(a.preco)}, o negócio paga os custos e uma retirada de ${brl(a.retirada)}. O mínimo para isso é ${num1(r.vendasDiaParaRetirada)} ${un} por dia.`
          : `A conta ainda não fecha: são necessárias ${num1(r.vendasDiaParaRetirada)} ${un} por dia para pagar os custos e uma retirada de ${brl(a.retirada)}; a expectativa é ${num1(a.vendasDia)}.`}</P>
      </Secao>

      <Secao n={2} titulo="Análise de mercado">
        {plano.mercado ? plano.mercado.sinais.map((s, i) => <Tab key={i} a={`${s.titulo}: ${s.manchete}`} b={s.comparacao ?? ""} />) : <P>Dados da cidade indisponíveis no momento da geração.</P>}
        {plano.mercado?.menosDisputadas.length ? <P>{`Cidades próximas menos disputadas: ${plano.mercado.menosDisputadas.join(", ")}.`}</P> : null}
      </Secao>

      <Secao n={3} titulo="Plano de marketing e modelo de negócio">
        {plano.canvas.map((c) => <Tab key={c.bloco} a={c.bloco} b={c.texto} />)}
      </Secao>

      <Secao n={4} titulo="Plano operacional">
        <P>{`${plano.emCasa ? "Atendimento em casa ou a domicílio" : "Atendimento em ponto comercial"}, ${a.diasMes} dias por mês, capacidade estimada de ${num1(a.vendasDia)} ${un} por dia com uma pessoa.`}</P>
        {plano.passos.map((p, i) => <P key={i}>{`${i + 1}. ${p}`}</P>)}
      </Secao>

      <Secao n={5} titulo="Plano financeiro (12 meses)">
        <View style={{ borderWidth: 1, borderColor: palette.line, borderRadius: 8 }}>
          <LinhaTab cab cols={["Mês", "Vendas", "Custos", "Sobra", "Retirada", "Caixa"]} />
          {plano.meses.map((m) => <LinhaTab key={m.mes} cols={[String(m.mes), brl(m.vendas), brl(m.custoVariavel + m.fixos), brl(m.sobra), brl(m.retirada), brl(m.caixa)]} />)}
        </View>
        <P>{`Ponto de equilíbrio: ${num1(r.vendasDiaSemRetirada)} ${un} por dia pagam o negócio; ${num1(r.vendasDiaParaRetirada)} pagam também a retirada.${r.retornoEmMeses ? ` Retorno do investimento em cerca de ${r.retornoEmMeses} meses.` : " Com esses números o investimento não volta em 3 anos."}`}</P>
      </Secao>

      <Secao n={6} titulo="Cenários">
        {plano.cenarios.map((c) => <Tab key={c.id} a={c.nome} b={`vendas ${brl(c.vendasMes)}/mês · resultado ${brl(c.resultadoMes)}/mês`} />)}
      </Secao>

      <Secao n={7} titulo="Avaliação estratégica">
        <Lista titulo="Forças" itens={plano.swot.forcas} />
        <Lista titulo="Fraquezas" itens={plano.swot.fraquezas} />
        <Lista titulo="Oportunidades" itens={plano.swot.oportunidades} />
        <Lista titulo="Ameaças" itens={plano.swot.ameacas} />
        <Lista titulo="Riscos" itens={plano.riscos} />
        <Lista titulo="Plano B" itens={plano.planoB} />
      </Secao>

      <Text style={{ fontSize: 10, color: palette.muted }}>Dados de mercado: Receita Federal (CNPJ) e IBGE. Números financeiros: simulação com valores de partida do ramo, ajustados pela pessoa. Documento informativo, não garante resultado.</Text>
    </View>
  </ScrollView>;
}

const btn = (primario: boolean) => ({ backgroundColor: primario ? palette.brand : palette.navySoft, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: "center" as const });

function Secao({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}>
    <Text style={{ fontSize: 16, fontWeight: "800", color: palette.navy }}>{n}. {titulo}</Text>
    {children}
  </View>;
}
function P({ children }: { children: React.ReactNode }) { return <Text style={{ fontSize: 12.5, lineHeight: 19, color: palette.ink }}>{children}</Text>; }
function Tab({ a, b }: { a: string; b: string }) {
  return <View style={{ flexDirection: "row", gap: 12, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: palette.line }}>
    <Text style={{ flex: 1, fontSize: 12.5, color: palette.ink, fontWeight: "600" }}>{a}</Text>
    <Text style={{ flex: 1, fontSize: 12.5, color: palette.muted }}>{b}</Text>
  </View>;
}
function LinhaTab({ cols, cab = false }: { cols: string[]; cab?: boolean }) {
  return <View style={{ flexDirection: "row", backgroundColor: cab ? palette.paper : palette.white, borderBottomWidth: 1, borderBottomColor: palette.line }}>
    {cols.map((c, i) => <Text key={i} style={{ flex: i === 0 ? 0.5 : 1, textAlign: i === 0 ? "left" : "right", fontSize: 11.5, paddingVertical: 4, paddingHorizontal: 6, fontWeight: cab ? "800" : "400", color: palette.ink }}>{c}</Text>)}
  </View>;
}
function Lista({ titulo, itens }: { titulo: string; itens: Item[] }) {
  return <View style={{ gap: 2 }}>
    <Text style={{ fontSize: 12.5, fontWeight: "800", color: palette.navy }}>{titulo}</Text>
    {itens.length ? itens.map((x, i) => <P key={i}>• {x.texto}</P>) : <P>• Nada marcante pelos dados.</P>}
  </View>;
}
