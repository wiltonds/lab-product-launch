"""API do Vinga — dados do município para o web app (Brasil inteiro, formato 2).

Lê os agregados de data/publicado/ (jobs/publicar_brasil.py) e usa os modelos de lab/estatistica.py.

Rodar:  uvicorn api.main:app --reload
Rotas:
    GET /health
    GET /v1/atividades
    GET /v1/municipios?busca=<nome>          busca de cidade em todo o Brasil
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
from lab.brasil import NOME_UF  # noqa: E402
from lab.estatistica import esperado, faixa_nb, matriz  # noqa: E402
from lab.receita import normalizar_nome  # noqa: E402

PUB = Path(os.environ.get("LAB_PUBLICADO", RAIZ / "data" / "publicado"))
ATIVIDADES = json.loads((Path(__file__).parent / "atividades.json").read_text(encoding="utf-8"))["atividades"]
VERSAO = "0.3.0"
TABELAS = ("municipios", "ativos", "movimento", "sobrevivencia", "sobrevivencia_uf", "saturacao")

app = FastAPI(title="Vinga — API de dados", version=VERSAO)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
                   allow_methods=["GET"], allow_headers=["*"])


@lru_cache(maxsize=1)
def dados() -> dict:
    meta = PUB / "meta.json"
    if not meta.exists():
        raise HTTPException(503, "Agregados ainda não publicados. Rode os jobs (README) e faça commit de data/publicado/.")
    m = json.loads(meta.read_text(encoding="utf-8"))
    if m.get("formato") != 2:
        raise HTTPException(503, "Agregados no formato antigo (só Alagoas). Rode jobs/publicar_brasil.py.")
    d = {k: pd.read_parquet(PUB / f"{k}.parquet") for k in TABELAS}
    d["cnaes"] = pd.read_parquet(PUB / "cnaes.parquet") if (PUB / "cnaes.parquet").exists() else None
    d["meta"] = m
    return preparar(d)


def preparar(d: dict) -> dict:
    """Índices em memória: por município, por UF e a matriz de covariáveis do modelo."""
    mun = d["municipios"].copy()
    mun["cod_ibge"] = mun["cod_ibge"].astype(str)
    d["municipios"] = mun.set_index("cod_ibge")
    d["busca"] = mun.assign(chave=mun["municipio"].map(normalizar_nome))[["cod_ibge", "municipio", "uf", "chave", "populacao"]]
    d["X"] = matriz(mun).set_index("cod_ibge")
    d["pop_uf"] = mun.groupby("uf")["populacao"].sum()
    for k in ("ativos", "movimento", "sobrevivencia"):
        t = d[k].copy()
        t["cod_ibge"] = t["cod_ibge"].astype(str)
        t["cnae_principal"] = t["cnae_principal"].astype(int)
        t["uf"] = t["cod_ibge"].map(mun.set_index("cod_ibge")["uf"])
        d[k] = t
    d["sobrevivencia_uf"] = d["sobrevivencia_uf"].assign(cnae_principal=lambda x: x["cnae_principal"].astype(int))
    d["saturacao"] = d["saturacao"].assign(cnae_principal=lambda x: x["cnae_principal"].astype(int)).set_index("cnae_principal")
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


def _soma(t: pd.DataFrame, cnaes: list[int], col: str, cod: str | None = None, uf: str | None = None) -> int:
    s = t[t["cnae_principal"].isin(cnaes)]
    if cod is not None:
        s = s[s["cod_ibge"] == cod]
    if uf is not None:
        s = s[s["uf"] == uf]
    return int(s[col].sum())


def concorrencia(d, ativ, mun) -> dict:
    cn, uf = ativ["_cnaes"], mun["uf"]
    loc = _soma(d["ativos"], cn, "ativos", cod=mun["codigo"])
    tot_uf = _soma(d["ativos"], cn, "ativos", uf=uf)
    base = {"id": "concorrencia", "title": "Concorrência", "confidence": "OBSERVADO", "sampleSize": loc,
            "source": _fonte(d, "cnpj", "populacao")}
    if loc == 0:
        return base | {"verdict": "neutro", "headline": f"Nenhum CNPJ ativo de {ativ['plural']} em {mun['nome']}",
                       "detail": "Pode ser espaço livre, pouca procura ou negócios informais. Vale ir a campo antes de concluir."}
    hab = mun["populacao"] / loc
    hab_uf = d["pop_uf"].get(uf, 0) / tot_uf if tot_uf else None
    out = base | {"headline": f"1 para cada {_moradores(hab)} moradores ({_num(loc)} ativos)"}
    if not hab_uf:
        return out | {"verdict": "neutro"}
    razao = hab_uf / hab   # > 1: mais concorrentes por morador que a média da UF
    v = "favoravel" if razao <= 0.8 else "atencao" if razao >= 1.25 else "neutro"
    nome_uf = NOME_UF.get(uf, uf)
    return out | {"verdict": v, "comparison": f"Média de {nome_uf}: 1 para cada {_moradores(hab_uf)} moradores",
                  "detail": {"favoravel": f"Menos concorrentes por morador que a média de {nome_uf}.",
                             "atencao": f"Mais concorrentes por morador que a média de {nome_uf}.",
                             "neutro": f"Parecido com a média de {nome_uf}."}[v]}


def espaco(d, ativ, mun) -> dict:
    """MOD-03: quantos a cidade 'deveria' ter, dado tamanho, renda e região (Binomial Negativa)."""
    cn = [c for c in ativ["_cnaes"] if c in d["saturacao"].index]
    base = {"id": "espaco", "title": "Espaço no mercado", "confidence": "ESTIMADO", "source": _fonte(d, "cnpj", "populacao", "pib")}
    if not cn or mun["codigo"] not in d["X"].index:
        return base | {"verdict": "neutro", "headline": "Ainda sem modelo para esse ramo",
                       "detail": "Poucos negócios desse tipo no Brasil para estimar com segurança."}
    x = d["X"].loc[mun["codigo"]]
    mu = sum(esperado(d["saturacao"].loc[c], x) for c in cn)
    alpha = float(d["saturacao"].loc[cn[0], "alpha"])
    lo, hi = faixa_nb(mu, alpha)
    obs = _soma(d["ativos"], cn, "ativos", cod=mun["codigo"])
    v = "favoravel" if obs < lo else "atencao" if obs > hi else "neutro"
    detalhe = {"favoravel": "Menos do que o esperado para uma cidade desse tamanho e renda: pode haver espaço, ou pouca procura. Vale confirmar na rua.",
               "atencao": "Mais do que o esperado para uma cidade desse tamanho e renda: o mercado tende a ser mais disputado.",
               "neutro": "Dentro do esperado para uma cidade desse tamanho e renda."}[v]
    return base | {"verdict": v, "sampleSize": obs,
                   "headline": f"Tem {_num(obs)}; uma cidade parecida teria cerca de {_num(mu)}",
                   "detail": detalhe + " Comparamos com cidades parecidas do Brasil todo.",
                   "comparison": f"Faixa normal para {mun['nome']}: de {_num(lo)} a {_num(hi)}"}


def sobrevivencia(d, ativ, mun) -> dict:
    """MOD-02: sobrevivência em 24 meses, cidade puxada para a UF na medida da incerteza."""
    cn, uf, nome_uf = ativ["_cnaes"], mun["uf"], NOME_UF.get(mun["uf"], mun["uf"])
    c0, c1 = d["meta"].get("coortes_sobrevivencia", ["?", "?"])
    base = {"id": "sobrevivencia", "title": "Sobrevivência", "confidence": "OBSERVADO", "source": _fonte(d, "cnpj")}
    su = d["sobrevivencia_uf"]
    su = su[(su["uf"] == uf) & su["cnae_principal"].isin(cn)]
    if su.empty or su["n"].sum() == 0:
        return base | {"verdict": "neutro", "headline": "Sem aberturas suficientes para medir", "sampleSize": 0}
    s_uf = float((su["s"] * su["n"]).sum() / su["n"].sum())
    linha = d["sobrevivencia"]
    linha = linha[(linha["cod_ibge"] == mun["codigo"]) & linha["cnae_principal"].isin(cn)]
    if linha.empty:
        return base | {"verdict": "neutro", "sampleSize": int(su["n"].sum()),
                       "headline": f"Em {nome_uf}, {_pct(s_uf)} seguem abertos após 2 anos",
                       "detail": f"{mun['nome']} não teve aberturas de {ativ['plural']} de {c0} a {c1}; usamos {nome_uf}."}
    r = linha.iloc[0] if len(linha) == 1 else linha.assign(w=linha["n"]).pipe(
        lambda t: pd.Series({c: (t[c] * t["w"]).sum() / t["w"].sum() for c in ("s", "ic_inf", "ic_sup", "peso_local")} | {"n": t["n"].sum()}))
    s, n = float(r["s"]), int(r["n"])
    dentro = r["ic_inf"] <= s_uf <= r["ic_sup"]
    verd = "neutro" if dentro or abs(s - s_uf) < 0.05 else "favoravel" if s > s_uf else "risco" if s - s_uf <= -0.15 else "atencao"
    detalhe = f"Faixa provável entre {_pct(r['ic_inf'])} e {_pct(r['ic_sup'])}. Base: {_num(n)} negócios abertos de {c0} a {c1}."
    if r["peso_local"] < 0.5:
        detalhe += f" Como a cidade tem poucos casos, o número também usa a média de {nome_uf}."
    return base | {"verdict": verd, "sampleSize": n, "headline": f"{_pct(s)} seguem abertos após 2 anos",
                   "detail": detalhe, "comparison": f"Média de {nome_uf}: {_pct(s_uf)}"}


def movimento(d, ativ, mun) -> dict:
    cn, uf, nome_uf = ativ["_cnaes"], mun["uf"], NOME_UF.get(mun["uf"], mun["uf"])
    ab = _soma(d["movimento"], cn, "aberturas", cod=mun["codigo"])
    fe = _soma(d["movimento"], cn, "fechamentos", cod=mun["codigo"])
    base = {"id": "demanda", "title": "Movimento do setor", "confidence": "OBSERVADO", "sampleSize": ab + fe,
            "source": _fonte(d, "cnpj")}
    if ab + fe == 0:
        return base | {"verdict": "neutro", "headline": f"Nenhuma abertura ou fechamento de {ativ['plural']} nos últimos 3 anos"}
    ab_uf, fe_uf = _soma(d["movimento"], cn, "aberturas", uf=uf), _soma(d["movimento"], cn, "fechamentos", uf=uf)
    taxa, taxa_uf = ab / max(fe, 1), ab_uf / max(fe_uf, 1)
    v = "favoravel" if taxa >= taxa_uf * 1.2 and ab > fe else "atencao" if fe >= ab or taxa <= taxa_uf * 0.8 else "neutro"
    return base | {"verdict": v, "headline": f"{_num(ab)} abriram e {_num(fe)} fecharam nos últimos 3 anos",
                   "detail": "Fechadas = baixadas ou inaptas. Mais aberturas que fechamentos indica setor em expansão, não garantia de procura.",
                   "comparison": f"{nome_uf}: {_num(ab_uf)} abriram e {_num(fe_uf)} fecharam"}


def _escala(x: float) -> int:
    return int(round(min(100.0, max(0.0, x))))


def notas_de_mercado(d, ativ, mun) -> dict:
    """Partes do Índice Vinga que vêm dos dados públicos (0 a 100; maior = mais a favor).

    mercado:       espaço no mercado (observado ÷ esperado pelo modelo; sem modelo, concorrência
                   por morador ÷ média da UF) e movimento do setor (aberturas ÷ fechamentos).
    sobrevivencia: sobrevivência em 24 meses (Bayes empírico); 40% vira 0 e 90% vira 100.
    As fórmulas são simples de propósito e estão em docs/metodologia.md.
    """
    import math
    cn, uf = ativ["_cnaes"], mun["uf"]
    obs = _soma(d["ativos"], cn, "ativos", cod=mun["codigo"])
    com_modelo = [c for c in cn if c in d["saturacao"].index]
    esp = None
    if com_modelo and mun["codigo"] in d["X"].index:
        mu = sum(esperado(d["saturacao"].loc[c], d["X"].loc[mun["codigo"]]) for c in com_modelo)
        esp = 60 - 40 * math.log2((obs + 1) / (mu + 1))
    else:
        tot_uf, pop_uf = _soma(d["ativos"], cn, "ativos", uf=uf), d["pop_uf"].get(uf, 0)
        if tot_uf and pop_uf and mun["populacao"]:
            razao = (obs / mun["populacao"]) / (tot_uf / pop_uf)
            esp = 60 - 40 * math.log2(max(razao, 0.01))
    ab = _soma(d["movimento"], cn, "aberturas", cod=mun["codigo"])
    fe = _soma(d["movimento"], cn, "fechamentos", cod=mun["codigo"])
    mov = 50 + 25 * math.log2((ab + 1) / (fe + 1)) if ab + fe > 0 else None
    mercado = None if esp is None else (esp if mov is None else 0.65 * esp + 0.35 * mov)
    linha = d["sobrevivencia"]
    linha = linha[(linha["cod_ibge"] == mun["codigo"]) & linha["cnae_principal"].isin(cn)]
    if len(linha):
        s = float((linha["s"] * linha["n"]).sum() / linha["n"].sum())
    else:
        su = d["sobrevivencia_uf"]
        su = su[(su["uf"] == uf) & su["cnae_principal"].isin(cn)]
        s = float((su["s"] * su["n"]).sum() / su["n"].sum()) if su["n"].sum() else None
    return {"market": None if mercado is None else _escala(mercado),
            "survival": None if s is None else _escala((s - 0.4) / 0.5 * 100)}


def _municipio(d: dict, codigo: str) -> dict:
    if codigo not in d["municipios"].index:
        raise HTTPException(404, "Município não encontrado.")
    r = d["municipios"].loc[codigo]
    return {"codigo": codigo, "nome": r["municipio"], "uf": r["uf"], "populacao": float(r["populacao"])}


@app.get("/health")
def health():
    try:
        d = dados()
        m = d["meta"]
        return {"status": "ok", "versao": VERSAO, "cobertura": m.get("cobertura"), "edicao": m["edicao"],
                "data_referencia": m["data_referencia"], "municipios": m.get("municipios_com_cnpj")}
    except HTTPException as e:
        return {"status": "sem_dados", "detalhe": e.detail}


@app.get("/v1/atividades")
def atividades():
    d = dados()
    desc = dict(zip(d["cnaes"]["codigo"], d["cnaes"]["descricao"])) if d["cnaes"] is not None else {}
    return [{**a, "cnaes_oficiais": {c: desc.get(c) for c in a["cnaes"]}} for a in ATIVIDADES]


@app.get("/v1/municipios")
def municipios(busca: str = Query(..., min_length=2, max_length=60), limite: int = Query(10, ge=1, le=30)):
    """Busca por nome em todo o Brasil; começa-com primeiro, depois contém; maiores cidades primeiro."""
    d = dados()
    q = normalizar_nome(busca)
    b = d["busca"]
    comeca = b[b["chave"].str.startswith(q)]
    contem = b[~b.index.isin(comeca.index) & b["chave"].str.contains(q, regex=False)]
    res = pd.concat([comeca.sort_values("populacao", ascending=False), contem.sort_values("populacao", ascending=False)])
    return [{"codigo": r.cod_ibge, "nome": r.municipio, "uf": r.uf} for r in res.head(limite).itertuples()]


LIMITACOES = [
    "Conta só empresas com CNPJ e com essa atividade como principal; negócios informais não aparecem, então a concorrência real costuma ser maior.",
    "CNPJ baixado ou inapto nem sempre é falência: pode ser mudança de ramo, de cidade ou de tipo de empresa.",
    "Algumas empresas se registram com a atividade errada; os números podem incluir ou deixar de fora negócios parecidos.",
    "Os números descrevem o passado do setor. Não são causa nem previsão do seu resultado.",
]


@app.get("/v1/insights")
def insights(municipio: str = Query(..., min_length=7, max_length=7), atividade: str = Query(..., max_length=40)):
    d = dados()
    ativ = next((a for a in ATIVIDADES if a["id"] == atividade), None)
    if ativ is None:
        raise HTTPException(404, "Atividade ainda não coberta.")
    ativ = ativ | {"_cnaes": [int(c) for c in ativ["cnaes"]]}
    mun = _municipio(d, municipio)
    limitacoes = list(LIMITACOES)
    if ativ.get("aviso"):
        limitacoes.append(ativ["aviso"])
    if not ativ.get("validado"):
        limitacoes.append("Classificação de atividade (CNAE) em validação.")
    return {"municipalityCode": municipio, "activityId": atividade,
            "modelVersion": f"{VERSAO} · edição {d['meta']['edicao']}", "generatedAt": d["meta"].get("gerado_em", ""),
            "signals": [concorrencia(d, ativ, mun), espaco(d, ativ, mun), sobrevivencia(d, ativ, mun), movimento(d, ativ, mun)],
            "marketScore": notas_de_mercado(d, ativ, mun),
            "limitations": limitacoes}
