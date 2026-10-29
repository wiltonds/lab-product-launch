"""Lab_Product_Launch — MVP Alagoas (Streamlit).

Rodar:  streamlit run app.py
Lê data/publicado/ (gerado por jobs/publicar_agregados.py). Sem esses arquivos,
abre em modo demonstração com dados sintéticos, sinalizado na tela.
"""
from __future__ import annotations

import json

import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

from lab.config import N_MIN_COORTE, PUB
from lab.financeiro import Faixa, Premissas, encerramento_mensal_de, ponto_equilibrio, simular
from lab.sobrevivencia import MES, curva_km, sobrevivencia_em

st.set_page_config(page_title="Lab_Product_Launch · Alagoas", page_icon="📊", layout="wide")


# ------------------------------------------------------------------ dados
@st.cache_data(show_spinner="Carregando dados...")
def carregar() -> dict:
    if (PUB / "meta.json").exists():
        d = {k: pd.read_parquet(PUB / f"{k}.parquet") for k in ("ativos", "fluxo", "vida")}
        for k in ("populacao", "cnaes"):
            d[k] = pd.read_parquet(PUB / f"{k}.parquet") if (PUB / f"{k}.parquet").exists() else None
        d["meta"] = json.loads((PUB / "meta.json").read_text(encoding="utf-8"))
        d["demo"] = False
        return d
    from lab.demo import agregados
    d = agregados()
    d["demo"] = True
    return d


D = carregar()
REF = pd.Timestamp(D["meta"]["data_referencia"])
# "R\$": o Streamlit lê "$...$" como fórmula; o escape mantém o cifrão literal
brl = lambda v: ("−" if v < 0 else "") + "R\\$ " + f"{abs(v):,.0f}".replace(",", ".")  # noqa: E731
pct = lambda v, c=1: f"{v * 100:.{c}f}%".replace(".", ",")  # noqa: E731
num = lambda v: f"{v:,.0f}".replace(",", ".")  # noqa: E731

# ------------------------------------------------------------------ cabeçalho
st.title("Vale a pena abrir aqui?")
st.caption("Lab_Product_Launch · MVP Alagoas · o sistema calcula, a explicação vem depois")
if D["demo"]:
    st.warning("**Modo demonstração.** Cidades e números são sintéticos, gerados para mostrar o método. "
               "Rode os jobs de dados para ver Alagoas de verdade.", icon="⚠️")

cnaes = D["cnaes"] if D["cnaes"] is not None else pd.DataFrame({"codigo": D["ativos"]["cnae_principal"].unique(), "descricao": ""})
cnaes = cnaes[cnaes["codigo"].isin(D["ativos"]["cnae_principal"])]
rotulo = dict(zip(cnaes["codigo"], cnaes["codigo"] + " · " + cnaes["descricao"]))

c1, c2 = st.columns([1, 2])
municipios = sorted(D["ativos"]["municipio"].dropna().unique())
mun = c1.selectbox("Município", municipios)
cnae = c2.selectbox("Atividade (CNAE)", sorted(rotulo), format_func=lambda c: rotulo.get(c, c),
                    help="Digite parte do nome para buscar. Confirme se o código descreve o seu negócio.")

aba_m, aba_s, aba_f, aba_x = st.tabs(["Mercado", "Sobrevivência", "Simulação financeira", "Fontes e métodos"])

# ------------------------------------------------------------------ mercado
with aba_m:
    at = D["ativos"]
    linha = at[(at["municipio"] == mun) & (at["cnae_principal"] == cnae)]
    est_at = int(linha["estabelecimentos_ativos"].sum())
    emp_at = int(linha["empresas_ativas"].sum())
    pop = D["populacao"]
    pop_mun = float(pop.loc[pop["municipio"] == mun, "populacao"].sum()) if pop is not None else np.nan
    dens = est_at / pop_mun * 1e4 if pop_mun else np.nan
    tot_uf = at.loc[at["cnae_principal"] == cnae, "estabelecimentos_ativos"].sum()
    dens_uf = tot_uf / pop["populacao"].sum() * 1e4 if pop is not None else np.nan

    fl = D["fluxo"]
    f = fl[(fl["municipio"] == mun) & (fl["cnae_principal"] == cnae)].sort_values("ano")
    ultimo = REF.year - 1 if REF.month < 12 else REF.year
    fu = f[f["ano"] == ultimo]
    ab_u = int(fu["aberturas"].sum()); en_u = int(fu["encerramentos"].sum())

    m = st.columns(4)
    m[0].metric("Estabelecimentos ativos", num(est_at), help=f"{num(emp_at)} empresas distintas; filiais contadas à parte. Tipo: observado.")
    m[1].metric("Por 10 mil habitantes", f"{dens:.1f}".replace(".", ",") if np.isfinite(dens) else "—",
                delta=(f"média do estado: {dens_uf:.1f}".replace(".", ",") if np.isfinite(dens_uf) else None), delta_color="off")
    m[2].metric(f"Aberturas em {ultimo}", num(ab_u))
    m[3].metric(f"Encerramentos em {ultimo}", num(en_u), delta=f"saldo {ab_u - en_u:+d}", delta_color="normal" if ab_u >= en_u else "inverse")

    if len(f):
        g = f[f["ano"] >= REF.year - 10].melt(id_vars="ano", value_vars=["aberturas", "encerramentos"], var_name="tipo", value_name="estabelecimentos")
        ch = alt.Chart(g).mark_bar().encode(
            x=alt.X("ano:O", title=None), xOffset="tipo:N",
            y=alt.Y("estabelecimentos:Q", title="estabelecimentos"),
            color=alt.Color("tipo:N", scale=alt.Scale(domain=["aberturas", "encerramentos"], range=["#1d6b52", "#b4521b"]), title=None),
            tooltip=["ano", "tipo", "estabelecimentos"]).properties(height=260, title="Aberturas e encerramentos por ano")
        st.altair_chart(ch, width="stretch")
        st.caption(f"Ano {REF.year} parcial, até {REF.strftime('%d/%m/%Y')}. Encerramento = baixa formal na Receita; inaptas ficam de fora.")
    else:
        st.info("Nenhum estabelecimento com essa atividade neste município.")

    # posição da cidade entre os municípios
    if pop is not None:
        r = at[at["cnae_principal"] == cnae].merge(pop[["municipio", "populacao"]], on="municipio")
        r = r[r["populacao"] >= 10_000].assign(dens=lambda x: x["estabelecimentos_ativos"] / x["populacao"] * 1e4).sort_values("dens")
        if len(r) > 1 and mun in set(r["municipio"]):
            pos = int((r["municipio"] == mun).to_numpy().nonzero()[0][0]) + 1
            st.write(f"Entre {len(r)} municípios com 10 mil habitantes ou mais, **{mun}** é o {pos}º com **menos** "
                     f"estabelecimentos dessa atividade por habitante (1º = menos concorrência relativa).")
    st.caption("Mais concorrentes por habitante não quer dizer, sozinho, que o mercado está saturado: pode indicar demanda alta. Correlação não é causa.")

# ------------------------------------------------------------------ sobrevivência
with aba_s:
    st.subheader("Quantos negócios como esse continuam abertos?")
    v = D["vida"]
    c = st.columns(3)
    evento = c[0].radio("O que conta como fechar", ["baixada", "baixada_ou_inapta"],
                        format_func={"baixada": "Só baixa formal", "baixada_ou_inapta": "Baixa ou inaptidão"}.get)
    nivel = c[1].radio("Recorte", ["municipio", "estado"], format_func={"municipio": mun, "estado": "Todo o estado"}.get)
    anos = sorted(v["coorte"].unique())
    anos_validos = [a for a in anos if a <= REF.year - 1]
    faixa = c[2].select_slider("Empresas abertas entre", options=anos_validos,
                               value=(max(anos_validos[0], REF.year - 8), REF.year - 3))
    sel = v[(v["evento"] == evento) & (v["cnae_principal"] == cnae) & v["coorte"].between(*faixa)]
    if nivel == "municipio":
        sel = sel[sel["municipio"] == mun]
    n0 = int(sel[["d", "c"]].to_numpy().sum())
    meses_obs = (REF - pd.Timestamp(f"{faixa[1]}-12-31")).days / MES
    st.session_state["S24"] = None
    if n0 < N_MIN_COORTE:
        st.error(f"**Dados insuficientes:** {n0} estabelecimentos abertos no período, abaixo do mínimo de {N_MIN_COORTE}. "
                 "Amplie o período ou use o recorte do estado.")
    else:
        curva = curva_km(sel)
        cols = st.columns(3)
        for col, h in zip(cols, (12, 24, 60)):
            # para cada horizonte, só entram as coortes do período acompanhadas por h meses inteiros
            ok = [a for a in range(faixa[0], faixa[1] + 1) if (REF - pd.Timestamp(f"{a}-12-31")).days / MES >= h]
            sub = sel[sel["coorte"].isin(ok)]
            nh = int(sub[["d", "c"]].to_numpy().sum())
            if ok and nh >= N_MIN_COORTE:
                r = sobrevivencia_em(curva_km(sub), h)
                col.metric(f"Abertos após {h} meses", pct(r["S"], 0))
                anos_txt = f"{ok[0]}–{ok[-1]}" if len(ok) > 1 else str(ok[0])
                col.caption(f"95%: {pct(r['ic_inf'], 0)} a {pct(r['ic_sup'], 0)} · abertos em {anos_txt} · {num(nh)} estab.")
                if h == 24:
                    st.session_state["S24"] = r["S"]
            else:
                col.metric(f"Abertos após {h} meses", "—")
                col.caption("nenhuma coorte do período tem esse tempo de acompanhamento" if not ok else "dados insuficientes")
        cv = curva[curva["t"] <= 72]
        base = alt.Chart(cv).encode(x=alt.X("t:Q", title="meses desde a abertura"))
        banda = base.mark_area(opacity=.18, color="#1d6b52").encode(y=alt.Y("ic_inf:Q", title="ainda abertos", axis=alt.Axis(format="%"), scale=alt.Scale(domain=[0, 1])), y2="ic_sup:Q")
        linha_s = base.mark_line(interpolate="step-after", color="#1d6b52", strokeWidth=2.5).encode(y="S:Q", tooltip=[alt.Tooltip("t:Q", title="mês"), alt.Tooltip("S:Q", format=".1%", title="abertos"), alt.Tooltip("n:Q", title="em risco")])
        st.altair_chart((banda + linha_s).properties(height=300), width="stretch")
        st.caption(f"Kaplan-Meier por coorte de abertura ({faixa[0]}–{faixa[1]}), {num(n0)} estabelecimentos, intervalo log-log de Greenwood. "
                   f"Quem ainda está aberto em {REF.strftime('%d/%m/%Y')} entra como censurado. Empresas fechadas de fato sem baixa formal aparecem como abertas.")

# ------------------------------------------------------------------ simulação
with aba_f:
    st.subheader("A conta do seu negócio")
    st.write("Informe cada número como uma faixa: o pior caso, o mais provável e o melhor caso. Tudo aqui é **hipótese sua**; o sistema só faz a conta.")

    def faixa(rotulo_, chave, a, b, c_, passo=1.0, ajuda=None):
        st.markdown(f"**{rotulo_}**", help=ajuda)
        x = st.columns(3)
        lo = x[0].number_input("mínimo", value=float(a), step=passo, key=chave + "1")
        mi = x[1].number_input("provável", value=float(b), step=passo, key=chave + "2")
        hi = x[2].number_input("máximo", value=float(c_), step=passo, key=chave + "3")
        return lo, mi, hi

    e, d_ = st.columns(2)
    with e:
        preco = faixa("Preço médio por venda (R$)", "pr", 13, 16, 20, .5)
        cvar = faixa("Custo variável por venda (R$)", "cv", 5, 6, 7.5, .5, "insumos, embalagem, taxa da maquininha")
        vol = faixa("Vendas por mês depois de maturar", "vo", 600, 1000, 1500, 50.0)
    with d_:
        cfix = faixa("Custo fixo mensal (R$)", "cf", 7000, 9000, 12000, 100.0, "aluguel, salários com encargos, contas, contador")
        inv = faixa("Investimento inicial (R$)", "in", 60000, 75000, 95000, 1000.0)
        cap = st.number_input("Capital que você tem disponível (R$)", value=90000.0, step=1000.0,
                              help="Define a perda de capital: o caixa acumulado ficar abaixo de menos esse valor.")
        usar_setor = st.checkbox("Incluir o risco de fechamento do setor (aba Sobrevivência)", value=False,
                                 disabled=st.session_state.get("S24") is None,
                                 help="Usa a sobrevivência em 24 meses calculada na aba ao lado.")
    erros = []
    try:
        P = Premissas(Faixa(*preco), Faixa(*cvar), Faixa(*vol), Faixa(*cfix), Faixa(*inv))
    except ValueError as ex:
        erros.append(str(ex))
    if erros:
        st.error(erros[0])
    else:
        try:
            pe = ponto_equilibrio(cfix[1], preco[1], cvar[1])
            st.info(f"**Ponto de equilíbrio (valores prováveis):** {num(pe['unidades_mes'])} vendas por mês, "
                    f"{pe['unidades_dia']:.0f} por dia em 26 dias, ou {brl(pe['faturamento_mes'])} de faturamento. "
                    f"Conta: {brl(cfix[1])} ÷ ({brl(preco[1])} − {brl(cvar[1])}).")
        except ValueError as ex:
            st.error(str(ex))
        enc = encerramento_mensal_de(st.session_state["S24"], 24) if usar_setor and st.session_state.get("S24") else None
        R = simular(P, cap, encerramento_mensal=enc)
        res = {r["id"]: r["valor"] for r in R["resultados"]}
        k = st.columns(3)
        k[0].metric("Lucro mensal provável", brl(res["MOD-04.lucro_p50"]), help="Mediana dos cenários depois de maturar")
        k[0].caption(f"80% dos cenários entre {brl(res['MOD-04.lucro_p10'])} e {brl(res['MOD-04.lucro_p90'])}")
        k[1].metric("Recupera o investimento em 24 meses", pct(res["MOD-04.p_payback_24"], 0))
        k[1].caption(f"em 12 meses: {pct(res['MOD-04.p_payback_12'], 0)}")
        k[2].metric("Perde todo o capital disponível", pct(res["MOD-04.p_perda_capital"], 0))
        k[2].caption(f"caixa acumulado abaixo de −{brl(cap)} em algum mês")

        cx = R["caixa"]
        q = np.percentile(cx, [10, 50, 90], axis=0) / 1e3
        fan = pd.DataFrame({"mês": np.arange(1, cx.shape[1] + 1), "p10": q[0], "p50": q[1], "p90": q[2]})
        b = alt.Chart(fan).encode(x=alt.X("mês:Q"))
        g1 = (b.mark_area(opacity=.2, color="#1d6b52").encode(y=alt.Y("p10:Q", title="caixa acumulado (R$ mil)"), y2="p90:Q")
              + b.mark_line(color="#1d6b52", strokeWidth=2.5).encode(y="p50:Q")
              + alt.Chart(pd.DataFrame({"y": [0]})).mark_rule(color="#888").encode(y="y:Q")
              + alt.Chart(pd.DataFrame({"y": [-cap / 1e3]})).mark_rule(color="#b4521b", strokeDash=[5, 4]).encode(y="y:Q"))
        sens = pd.DataFrame({"premissa": list(R["sensibilidade"]), "peso": list(R["sensibilidade"].values())})
        nomes = {"volume_mes": "vendas por mês", "preco": "preço", "custo_variavel": "custo variável", "custo_fixo": "custo fixo",
                 "investimento": "investimento", "meses_maturacao": "tempo para maturar"}
        sens["premissa"] = sens["premissa"].map(nomes)
        g2 = alt.Chart(sens).mark_bar().encode(
            y=alt.Y("premissa:N", sort="-x", title=None), x=alt.X("peso:Q", title="influência no caixa do mês 24"),
            color=alt.condition("datum.peso > 0", alt.value("#1d6b52"), alt.value("#b4521b")))
        a1, a2 = st.columns([3, 2])
        a1.altair_chart(g1.properties(height=280, title="Caixa acumulado: faixa de 80% dos cenários"), width="stretch")
        a1.caption("Linha tracejada laranja: menos o capital disponível. Abaixo dela, o capital acabou.")
        a2.altair_chart(g2.properties(height=280, title="O que mais pesa"), width="stretch")
        top = sens.iloc[0]["premissa"]
        st.write(f"A premissa que mais decide o resultado é **{top}**. É nela que vale gastar tempo pesquisando antes de investir.")
        st.caption(f"{R['resultados'][0]['metodo']}. Resultados são estimativas sobre hipóteses do usuário, não garantia de retorno. "
                   "A classificação em evidência favorável, desfavorável ou insuficiente será definida depois da validação com casos reais.")

# ------------------------------------------------------------------ fontes
with aba_x:
    meta = D["meta"]
    st.subheader("De onde vêm os números")
    st.write(f"Edição da base: **{meta['edicao']}** · data de referência: **{REF.strftime('%d/%m/%Y')}** · versão: {meta['versao']}")
    st.table(pd.DataFrame([
        {"Indicador": "Estabelecimentos ativos", "Tipo": "observado", "Fonte": "CNPJ/Receita Federal", "Método": "contagem com situação ativa e CNAE principal"},
        {"Indicador": "Por 10 mil habitantes", "Tipo": "observado", "Fonte": "CNPJ + IBGE (tabela 6579)", "Método": "ativos ÷ população × 10.000"},
        {"Indicador": "Aberturas e encerramentos", "Tipo": "observado", "Fonte": "CNPJ/Receita Federal", "Método": "data de início; data da situação baixada"},
        {"Indicador": "Abertos após N meses", "Tipo": "estimado", "Fonte": "CNPJ/Receita Federal", "Método": "Kaplan-Meier por coorte de abertura, IC log-log de Greenwood"},
        {"Indicador": "Simulação financeira", "Tipo": "estimado sobre hipóteses", "Fonte": "premissas do usuário", "Método": "Monte Carlo, distribuição triangular por premissa"},
    ]))
    st.markdown("**Limitações:** o CNAE declarado pode não ser a atividade real; empresas fechadas de fato podem seguir ativas sem baixa; "
                "inapta não é fechamento; negócios informais não aparecem; código de município da Receita é ligado ao IBGE pelo nome.")
    st.json(meta["fontes"])
