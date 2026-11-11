"""API do Lab do Meu Negócio — dados do município para o web app.

Lê os agregados de data/publicado/ (jobs/publicar_agregados.py) e usa os mesmos
módulos do motor (lab/), então o número da API é o mesmo do painel Streamlit.

Rodar:  uvicorn api.main:app --reload
Rotas:
    GET /health
    GET /v1/atividades
    GET /v1/insights?municipio=<código IBGE>&atividade=<id do app>

Contrato de resposta: shared/insights.ts do app (MunicipalInsights).
Sem data/publicado/, responde 503: a API nunca serve dados de demonstração como reais.
"""
from __future__ import annotations

import json
import os
import sys
from functools import lru_cache
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from lab.config import N_MIN_COORTE  # noqa: E402
from lab.receita import normalizar_nome  # noqa: E402
from lab.sobrevivencia import MES, curva_km, sobrevivencia_em  # noqa: E402

PUB = Path(os.environ.get("LAB_PUBLICADO", RAIZ / "data" / "publicado"))
ATIVIDADES = json.loads((Path(__file__).parent / "atividades.json").read_text(encoding="utf-8"))["atividades"]
EVENTO = "baixada_ou_inapta"   # definição ampla: inapta costuma ser negócio abandonado
HORIZONTE = 24                 # meses
COORTES = 5                    # quantas coortes completas entram no cálculo
VERSAO = "0.2.0"

app = FastAPI(title="Lab do Meu Negócio — API de dados", version=VERSAO)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
                   allow_methods=["GET"], allow_headers=["*"])


@lru_cache(maxsize=1)
def dados() -> dict:
    if not (PUB / "meta.json").exists():
        raise HTTPException(503, "Agregados ainda não publicados. Rode os jobs (README) e faça commit de data/publicado/.")
    d = {k: pd.read_parquet(PUB / f"{k}.parquet") for k in ("ativos", "fluxo", "vida", "populacao")}
    d["cnaes"] = pd.read_parquet(PUB / "cnaes.parquet") if (PUB / "cnaes.parquet").exists() else None
    d["meta"] = json.loads((PUB / "meta.json").read_text(encoding="utf-8"))
    return preparar(d)


def preparar(d: dict) -> dict:
    """Índices que a API usa: código IBGE → nome do município e população."""
    pop = d["populacao"].copy()
    pop["cod_ibge"] = pop["cod_ibge"].astype(str)
    if "ano" in pop:
        pop = pop.sort_values("ano").groupby("cod_ibge", as_index=False).last()
    d["por_codigo"] = {r.cod_ibge: (r.municipio, float(r.populacao)) for r in pop.itertuples()}
    d["pop_uf"] = float(pop["populacao"].sum())
    # nomes do agregado podem vir da Receita (sem acento): liga pelo nome normalizado
    nomes = d["ativos"]["municipio"].dropna().unique()
    d["nome_agregado"] = {normalizar_nome(n): n for n in nomes}
    d["ref"] = pd.Timestamp(d["meta"]["data_referencia"])
    return d


def _num(n: float) -> str:
    return f"{round(n):,}".replace(",", ".")


def _pct(x: float) -> str:
    return f"{x * 100:.0f}%"


def _moradores(n: float) -> str:
    passo = 10 if n < 1000 else 50 if n < 5000 else 100
    return _num(round(n / passo) * passo)


def _fonte(d: dict, *quais: str) -> str:
    f = d["meta"]["fontes"]
    return "; ".join(f[q] for q in quais if q in f) + f" — referência {d['meta']['data_referencia']}"


def concorrencia(d, ativ, mun) -> dict:
    at = d["ativos"][d["ativos"]["cnae_principal"].isin(ativ["cnaes"])]
    loc = int(at.loc[at["municipio"] == mun["agregado"], "estabelecimentos_ativos"].sum())
    uf = int(at["estabelecimentos_ativos"].sum())
    base = {"id": "concorrencia", "title": "Concorrência", "confidence": "OBSERVADO", "sampleSize": loc,
            "source": _fonte(d, "cnpj", "populacao")}
    if loc == 0:
        return base | {"verdict": "neutro", "headline": f"Nenhum CNPJ ativo de {ativ['plural']} em {mun['nome']}",
                       "detail": "Pode ser espaço livre, pouca procura ou negócios informais. Vale ir a campo antes de concluir."}
    hab, hab_uf = mun["populacao"] / loc, (d["pop_uf"] / uf if uf else None)
    out = base | {"headline": f"1 para cada {_moradores(hab)} moradores ({_num(loc)} ativos)"}
    if not hab_uf:
        return out | {"verdict": "neutro"}
    razao = hab_uf / hab   # > 1: mais concorrentes por morador que a média do estado
    v = "favoravel" if razao <= 0.8 else "atencao" if razao >= 1.25 else "neutro"
    return out | {"verdict": v, "comparison": f"Média de Alagoas: 1 para cada {_moradores(hab_uf)} moradores",
                  "detail": {"favoravel": "Menos concorrentes por morador que a média de Alagoas.",
                             "atencao": "Mais concorrentes por morador que a média de Alagoas.",
                             "neutro": "Parecido com a média de Alagoas."}[v]}


def _km(tv: pd.DataFrame) -> tuple[dict, int]:
    n = int(tv[["d", "c"]].to_numpy().sum())
    if n == 0:
        return {}, 0
    return sobrevivencia_em(curva_km(tv), HORIZONTE), n   # S após os meses 0..23 completos


def sobrevivencia(d, ativ, mun) -> dict:
    v = d["vida"]
    ult = d["ref"].year - 1 - int(HORIZONTE / 12)          # coorte mais recente com 24 meses completos
    while (d["ref"] - pd.Timestamp(f"{ult}-12-31")).days / MES < HORIZONTE:
        ult -= 1
    coortes = range(ult - COORTES + 1, ult + 1)
    sel = v[(v["evento"] == EVENTO) & v["cnae_principal"].isin(ativ["cnaes"]) & v["coorte"].isin(coortes)]
    r_loc, n_loc = _km(sel[sel["municipio"] == mun["agregado"]])
    r_uf, n_uf = _km(sel)
    base = {"id": "sobrevivencia", "title": "Sobrevivência", "confidence": "OBSERVADO", "source": _fonte(d, "cnpj")}
    periodo = f"abertos de {coortes[0]} a {coortes[-1]}"
    if not r_uf:
        return base | {"verdict": "neutro", "headline": "Sem aberturas suficientes para medir", "sampleSize": 0}
    faixa = lambda r: f"entre {_pct(r['ic_inf'])} e {_pct(r['ic_sup'])}"  # noqa: E731
    if n_loc < N_MIN_COORTE:
        return base | {"verdict": "neutro", "sampleSize": n_uf,
                       "headline": f"Em Alagoas, {_pct(r_uf['S'])} seguem abertos após 2 anos",
                       "detail": f"{mun['nome']} teve só {n_loc} aberturas no período ({periodo}), menos que o mínimo de {N_MIN_COORTE}; usamos o estado. Faixa provável {faixa(r_uf)}."}
    dif = r_loc["S"] - r_uf["S"]
    sobrepoe = r_loc["ic_inf"] <= r_uf["ic_sup"] and r_uf["ic_inf"] <= r_loc["ic_sup"]
    verd = "neutro" if sobrepoe or abs(dif) < 0.05 else "favoravel" if dif > 0 else "risco" if dif <= -0.15 else "atencao"
    return base | {"verdict": verd, "sampleSize": n_loc,
                   "headline": f"{_pct(r_loc['S'])} seguem abertos após 2 anos",
                   "detail": f"Faixa provável {faixa(r_loc)}. Base: {_num(n_loc)} negócios {periodo} (Kaplan-Meier).",
                   "comparison": f"Média de Alagoas: {_pct(r_uf['S'])}"}


def movimento(d, ativ, mun) -> dict:
    fl = d["fluxo"][d["fluxo"]["cnae_principal"].isin(ativ["cnaes"])]
    anos = list(range(d["ref"].year - 3, d["ref"].year))       # 3 anos completos
    fl = fl[fl["ano"].isin(anos)]
    loc = fl[fl["municipio"] == mun["agregado"]]
    ab, enc, ina = (int(loc[c].sum()) for c in ("aberturas", "encerramentos", "inaptas"))
    saidas = enc + ina
    base = {"id": "demanda", "title": "Movimento do setor", "confidence": "OBSERVADO", "sampleSize": ab + saidas,
            "source": _fonte(d, "cnpj")}
    if ab + saidas == 0:
        return base | {"verdict": "neutro", "headline": f"Nenhuma abertura ou fechamento de {ativ['plural']} em {anos[0]}–{anos[-1]}"}
    taxa = ab / max(saidas, 1)
    ab_uf, sai_uf = int(fl["aberturas"].sum()), int(fl["encerramentos"].sum() + fl["inaptas"].sum())
    taxa_uf = ab_uf / max(sai_uf, 1)
    v = "favoravel" if taxa >= taxa_uf * 1.2 and ab > saidas else "atencao" if saidas >= ab or taxa <= taxa_uf * 0.8 else "neutro"
    return base | {"verdict": v,
                   "headline": f"{_num(ab)} abriram e {_num(saidas)} fecharam de {anos[0]} a {anos[-1]}",
                   "detail": "Fechadas = baixadas ou inaptas. Mais aberturas que fechamentos indica setor em expansão, não garantia de procura.",
                   "comparison": f"Alagoas: {_num(ab_uf)} abriram e {_num(sai_uf)} fecharam"}


def _municipio(d: dict, codigo: str) -> dict:
    if codigo not in d["por_codigo"]:
        raise HTTPException(404, "Município fora da cobertura.")
    nome, pop = d["por_codigo"][codigo]
    return {"codigo": codigo, "nome": nome, "populacao": pop,
            "agregado": d["nome_agregado"].get(normalizar_nome(nome), nome)}


@app.get("/health")
def health():
    try:
        d = dados()
        return {"status": "ok", "versao": VERSAO, "edicao": d["meta"]["edicao"], "data_referencia": d["meta"]["data_referencia"]}
    except HTTPException as e:
        return {"status": "sem_dados", "detalhe": e.detail}


@app.get("/v1/atividades")
def atividades():
    d = dados()
    desc = dict(zip(d["cnaes"]["codigo"], d["cnaes"]["descricao"])) if d["cnaes"] is not None else {}
    return [{**a, "cnaes_oficiais": {c: desc.get(c) for c in a["cnaes"]}} for a in ATIVIDADES]


@app.get("/v1/insights")
def insights(municipio: str = Query(..., min_length=7, max_length=7), atividade: str = Query(..., max_length=40)):
    d = dados()
    ativ = next((a for a in ATIVIDADES if a["id"] == atividade), None)
    if ativ is None:
        raise HTTPException(404, "Atividade ainda não coberta.")
    mun = _municipio(d, municipio)
    limitacoes = ["Conta só empresas com CNPJ e com essa atividade como principal; negócios informais não aparecem.",
                  "CNPJ ativo não prova que o negócio está funcionando de fato.",
                  "Os números descrevem o passado do setor. Não são causa nem previsão do seu resultado."]
    if ativ.get("aviso"):
        limitacoes.append(ativ["aviso"])
    if not ativ.get("validado"):
        limitacoes.append("Classificação de atividade (CNAE) em validação.")
    return {"municipalityCode": municipio, "activityId": atividade,
            "modelVersion": f"{VERSAO} · edição {d['meta']['edicao']}", "generatedAt": d["meta"].get("gerado_em", ""),
            "signals": [concorrencia(d, ativ, mun), sobrevivencia(d, ativ, mun), movimento(d, ativ, mun)],
            "limitations": limitacoes}
