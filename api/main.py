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

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from lab.brasil import NOME_UF  # noqa: E402
from lab.estatistica import esperado, faixa_nb, matriz  # noqa: E402
from lab.receita import normalizar_nome  # noqa: E402

try:   # Arrow devolve a memória ao sistema logo após ler (o plano gratuito do Render tem 512 MB)
    import pyarrow as _pa
    _pa.jemalloc_set_decay_ms(0)
except Exception:  # noqa: BLE001
    pass

PUB = Path(os.environ.get("LAB_PUBLICADO", RAIZ / "data" / "publicado"))
ATIVIDADES = json.loads((Path(__file__).parent / "atividades.json").read_text(encoding="utf-8"))["atividades"]
VERSAO = "0.5.0"
TABELAS = ("municipios", "ativos", "movimento", "sobrevivencia", "sobrevivencia_uf", "saturacao")
# Só as colunas usadas: o plano gratuito do Render tem 512 MB de memória.
from lab.compacto import COLUNAS, GRANDES  # noqa: E402

app = FastAPI(title="Vinga — API de dados", version=VERSAO)


@app.on_event("startup")
def _aquecer() -> None:
    """Carrega os agregados ao subir, numa thread só: a primeira pessoa não espera a leitura."""
    try:
        dados()
    except HTTPException:
        pass
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
    import gc
    d = {}
    for k in TABELAS:   # uma tabela por vez, já compactada, para o pico de memória ficar baixo
        t = _ler(PUB / f"{k}.parquet", COLUNAS.get(k), grande=k in GRANDES)
        d[k] = _compactar(t) if k in GRANDES else t
        del t
        gc.collect()
    for k in ("bairros", "bairros_total"):   # opcionais: edições antigas não têm
        d[k] = pd.read_parquet(PUB / f"{k}.parquet") if (PUB / f"{k}.parquet").exists() else None
    d["cnaes"] = pd.read_parquet(PUB / "cnaes.parquet") if (PUB / "cnaes.parquet").exists() else None
    d["meta"] = m
    d = preparar(d)
    gc.collect()
    try:   # o Arrow também guarda memória própria da leitura: devolve
        import pyarrow as pa
        pa.default_memory_pool().release_unused()
    except Exception:  # noqa: BLE001
        pass
    try:   # devolve ao sistema a memória que sobrou da leitura
        import ctypes
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:  # noqa: BLE001
        pass
    return d


def _ler(caminho: Path, colunas: list[str] | None, grande: bool) -> pd.DataFrame:
    if not grande:
        return pd.read_parquet(caminho, columns=colunas)
    t = pd.read_parquet(caminho, columns=colunas)
    if t["cod_ibge"].dtype.kind in "OSU" or str(t["cod_ibge"].dtype).startswith("string"):   # edição antiga, não compacta
        from lab.compacto import compactar
        t = compactar(t, caminho.stem)
    return t


def _compactar(t: pd.DataFrame) -> pd.DataFrame:
    """Código IBGE e CNAE como inteiros, números em 32 bits, índice pelo município (busca rápida e pouca memória)."""
    if t.index.name == "cod_ibge":
        return t
    if t["cod_ibge"].dtype == "int32" and t["cnae_principal"].dtype == "int32":
        return t.set_index("cod_ibge")
    t["cod_ibge"] = pd.to_numeric(t["cod_ibge"]).astype("int32")
    t["cnae_principal"] = t["cnae_principal"].astype("int32")
    for c in t.columns.drop(["cod_ibge", "cnae_principal"]):
        t[c] = t[c].astype("float32") if t[c].dtype.kind == "f" else t[c].astype("int32")
    return t.set_index("cod_ibge").sort_index(kind="stable")


# Palavras com acento que aparecem em nomes de bairro e quase nunca em nome de cidade.
ACENTOS_EXTRA = {
    "BRASILIA": "Brasília", "CANAFISTULA": "Canafístula", "CANAA": "Canaã", "JATIUCA": "Jatiúca", "PAJUCARA": "Pajuçara",
    "PONTAL": "Pontal", "JARDIM": "Jardim", "VERGEL": "Vergel", "FAROL": "Farol", "PITANGUINHA": "Pitanguinha",
    "JACINTINHO": "Jacintinho", "CIDADE": "Cidade", "UNIVERSITARIA": "Universitária", "INDUSTRIAL": "Industrial",
    "CONJUNTO": "Conjunto", "RESIDENCIAL": "Residencial", "VILA": "Vila", "PRACA": "Praça", "ESTACAO": "Estação",
    "SITIO": "Sítio", "GUARANI": "Guarani", "ZELIA": "Zélia", "JOSE": "José", "JOAO": "João", "ANTONIO": "Antônio",
    "SEBASTIAO": "Sebastião", "CONCEICAO": "Conceição", "VITORIA": "Vitória", "UNIAO": "União", "SAO": "São",
    "PRIMAVERA": "Primavera", "PLANALTO": "Planalto", "BAIXAO": "Baixão", "CACIMBAS": "Cacimbas", "ITAPOA": "Itapoã",
    "AEROPORTO": "Aeroporto", "AGUA": "Água", "AGUAS": "Águas", "ALIANCA": "Aliança", "ESPERANCA": "Esperança",
    "PEDRAO": "Pedrão", "BOM": "Bom", "VISTA": "Vista", "SAUDE": "Saúde", "ITABORAI": "Itaboraí", "ITAJUBA": "Itajubá",
}


def mapa_de_acentos(nomes) -> dict[str, str]:
    """Palavra sem acento → com acento, aprendida dos nomes oficiais de cidade do IBGE (que vêm acentuados).
    Só entra quando a forma com acento é a mais comum, para não acentuar palavra que existe dos dois jeitos."""
    from collections import Counter
    formas: dict[str, Counter] = {}
    for nome in nomes:
        for w in str(nome).split():
            if len(w) < 3:
                continue
            formas.setdefault(normalizar_nome(w), Counter())[w] += 1
    mapa = {}
    for chave, c in formas.items():
        forma, n = c.most_common(1)[0]
        if normalizar_nome(forma) != forma.upper() or forma != forma.title():
            mapa[chave] = forma
    return {**mapa, **ACENTOS_EXTRA}


def acentuar(d: dict, nome: str) -> str:
    """Devolve o nome do bairro com acentos, palavra a palavra (a Receita grava sem acento)."""
    mapa = d.get("acentos") or {}
    out = []
    for w in str(nome).split():
        a = mapa.get(normalizar_nome(w))
        out.append(a if a and len(w) >= 3 else w)
    return " ".join(out)


def preparar(d: dict) -> dict:
    """Índices em memória: por município, por UF e a matriz de covariáveis do modelo."""
    mun = d["municipios"].copy()
    mun["cod_ibge"] = mun["cod_ibge"].astype(str)
    d["municipios"] = mun.set_index("cod_ibge")
    d["busca"] = mun.assign(chave=mun["municipio"].map(normalizar_nome))[["cod_ibge", "municipio", "uf", "chave", "populacao"]]
    d["X"] = matriz(mun).set_index("cod_ibge")
    d["acentos"] = mapa_de_acentos(mun["municipio"])
    d["pop_uf"] = mun.groupby("uf")["populacao"].sum()
    for k in ("ativos", "movimento", "sobrevivencia"):
        d[k] = _compactar(d[k])
    sigla = {int(c[:2]): u for c, u in zip(mun["cod_ibge"], mun["uf"])}
    for k in ("ativos", "movimento"):   # totais por UF × CNAE, calculados uma vez (sem copiar a tabela)
        t = d[k]
        uf_num = pd.Series(t.index.values // 100000, index=t.index).map(sigla).values
        d[k + "_uf"] = t.groupby([uf_num, t["cnae_principal"].values]).sum(numeric_only=True).drop(columns="cnae_principal", errors="ignore")
        d[k + "_uf"].index.names = ["uf", "cnae_principal"]
    for k in ("bairros", "bairros_total"):
        t = d.get(k)
        if t is not None and len(t):
            t = t.assign(bairro=t["bairro"].astype("category")).set_index("cod_ibge").sort_index(kind="stable")
        d[k] = t if t is not None and len(t) else None
    d["sobrevivencia_uf"] = d["sobrevivencia_uf"].assign(cnae_principal=lambda x: x["cnae_principal"].astype(int))
    d["saturacao"] = d["saturacao"].assign(cnae_principal=lambda x: x["cnae_principal"].astype(int)).set_index("cnae_principal")
    d["ref"] = pd.Timestamp(d["meta"]["data_referencia"])
    return d


def _linhas(t: pd.DataFrame, cod: str, cnaes: list[int]) -> pd.DataFrame:
    c = int(cod)
    if c not in t.index:
        return t.iloc[0:0]
    s = t.loc[[c]]
    return s[s["cnae_principal"].isin(cnaes)]


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


def _soma(d: dict, tabela: str, cnaes: list[int], col: str, cod: str | None = None, uf: str | None = None) -> int:
    if cod is not None:
        return int(_linhas(d[tabela], cod, cnaes)[col].sum())
    t = d[tabela + "_uf"]
    if uf not in t.index.get_level_values(0):
        return 0
    s = t.loc[uf]
    return int(s[s.index.isin(cnaes)][col].sum())


def concorrencia(d, ativ, mun) -> dict:
    cn, uf = ativ["_cnaes"], mun["uf"]
    loc = _soma(d, "ativos", cn, "ativos", cod=mun["codigo"])
    tot_uf = _soma(d, "ativos", cn, "ativos", uf=uf)
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
    obs = _soma(d, "ativos", cn, "ativos", cod=mun["codigo"])
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
    linha = _linhas(d["sobrevivencia"], mun["codigo"], cn)
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
    ab = _soma(d, "movimento", cn, "aberturas", cod=mun["codigo"])
    fe = _soma(d, "movimento", cn, "fechamentos", cod=mun["codigo"])
    base = {"id": "demanda", "title": "Movimento do setor", "confidence": "OBSERVADO", "sampleSize": ab + fe,
            "source": _fonte(d, "cnpj")}
    if ab + fe == 0:
        return base | {"verdict": "neutro", "headline": f"Nenhuma abertura ou fechamento de {ativ['plural']} nos últimos 3 anos"}
    ab_uf, fe_uf = _soma(d, "movimento", cn, "aberturas", uf=uf), _soma(d, "movimento", cn, "fechamentos", uf=uf)
    taxa, taxa_uf = ab / max(fe, 1), ab_uf / max(fe_uf, 1)
    v = "favoravel" if taxa >= taxa_uf * 1.2 and ab > fe else "atencao" if fe >= ab or taxa <= taxa_uf * 0.8 else "neutro"
    return base | {"verdict": v, "headline": f"{_num(ab)} abriram e {_num(fe)} fecharam nos últimos 3 anos",
                   "detail": {"favoravel": "Mais gente abrindo do que fechando: o setor está crescendo na cidade.",
                              "atencao": "Tem fechado tanto ou mais do que abre: o setor está apertado na cidade.",
                              "neutro": "Abre e fecha no mesmo ritmo do estado."}[v],
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
    obs = _soma(d, "ativos", cn, "ativos", cod=mun["codigo"])
    com_modelo = [c for c in cn if c in d["saturacao"].index]
    esp = None
    if com_modelo and mun["codigo"] in d["X"].index:
        mu = sum(esperado(d["saturacao"].loc[c], d["X"].loc[mun["codigo"]]) for c in com_modelo)
        esp = 60 - 40 * math.log2((obs + 1) / (mu + 1))
    else:
        tot_uf, pop_uf = _soma(d, "ativos", cn, "ativos", uf=uf), d["pop_uf"].get(uf, 0)
        if tot_uf and pop_uf and mun["populacao"]:
            razao = (obs / mun["populacao"]) / (tot_uf / pop_uf)
            esp = 60 - 40 * math.log2(max(razao, 0.01))
    ab = _soma(d, "movimento", cn, "aberturas", cod=mun["codigo"])
    fe = _soma(d, "movimento", cn, "fechamentos", cod=mun["codigo"])
    mov = 50 + 25 * math.log2((ab + 1) / (fe + 1)) if ab + fe > 0 else None
    mercado = None if esp is None else (esp if mov is None else 0.65 * esp + 0.35 * mov)
    linha = _linhas(d["sobrevivencia"], mun["codigo"], cn)
    if len(linha):
        s = float((linha["s"] * linha["n"]).sum() / linha["n"].sum())
    else:
        su = d["sobrevivencia_uf"]
        su = su[(su["uf"] == uf) & su["cnae_principal"].isin(cn)]
        s = float((su["s"] * su["n"]).sum() / su["n"].sum()) if su["n"].sum() else None
    return {"market": None if mercado is None else _escala(mercado),
            "survival": None if s is None else _escala((s - 0.4) / 0.5 * 100)}


def _esperado_por_cidade(d: dict, cnaes: list[int], cods: pd.Index) -> pd.Series:
    """Esperado pelo modelo de espaço no mercado para várias cidades de uma vez."""
    termos = ["const", "log_pop", "log_pib_pc", "reg_Norte", "reg_Nordeste", "reg_Sul", "reg_Centro-Oeste"]
    X = d["X"].loc[cods, termos].to_numpy(float)
    mu = np.zeros(len(cods))
    for c in cnaes:
        mu += np.exp(X @ d["saturacao"].loc[c, termos].to_numpy(float))
    return pd.Series(mu, index=cods)


def oportunidades(d, ativ, mun) -> dict:
    """Onde tem espaço: cidades do mesmo estado e outros ramos na mesma cidade com menos negócios
    do que o esperado e menos disputadas que a cidade escolhida. Só cidades com 50 mil habitantes
    ou mais (ou 10% do porte da cidade escolhida), para não sugerir lugar pequeno demais. Menos que o esperado pode ser espaço ou
    pouca procura: o app diz isso."""
    cn = [c for c in ativ["_cnaes"] if c in d["saturacao"].index]
    out = {"cities": [], "activities": []}
    if mun["codigo"] not in d["X"].index:
        return out
    if cn:
        m = d["municipios"]
        cand = m[(m["uf"] == mun["uf"]) & (m["populacao"] >= min(300000, max(50000, 0.1 * mun["populacao"])))].index
        cand = cand.intersection(d["X"].index)
        mu = _esperado_por_cidade(d, cn, cand)
        t = d["ativos"]
        obs = t[t["cnae_principal"].isin(cn)]["ativos"].groupby(level=0).sum()
        obs.index = obs.index.astype(str)
        obs = obs.reindex(cand, fill_value=0)
        razao = (obs + 1) / (mu + 1)
        aqui = float(razao.get(mun["codigo"], 1.0))
        ok = razao[(razao < min(1.1, aqui)) & (mu >= 5) & (razao.index != mun["codigo"])].sort_values().head(3)
        out["cities"] = [{"code": c, "name": m.loc[c, "municipio"], "uf": mun["uf"], "active": int(obs[c]),
                          "expected": int(round(mu[c]))} for c in ok.index]
    x = pd.Index([mun["codigo"]])
    ramos = []
    for a in ATIVIDADES:
        if a["id"] == ativ["id"]:
            continue
        c2 = [int(c) for c in a["cnaes"] if int(c) in d["saturacao"].index]
        if not c2 or [int(c) for c in a["cnaes"]] == ativ["_cnaes"]:
            continue
        mu2 = float(_esperado_por_cidade(d, c2, x).iloc[0])
        o2 = _soma(d, "ativos", c2, "ativos", cod=mun["codigo"])
        if mu2 >= 3 and (o2 + 1) / (mu2 + 1) < 1:
            ramos.append({"id": a["id"], "name": a["nome"], "active": o2, "expected": int(round(mu2)), "_r": (o2 + 1) / (mu2 + 1)})
    out["activities"] = [{k: v for k, v in r.items() if k != "_r"} for r in sorted(ramos, key=lambda r: r["_r"])[:3]]
    return out


def _bairros_da_cidade(d: dict, cod: str) -> pd.DataFrame | None:
    t = d.get("bairros_total")
    if t is None or int(cod) not in t.index:
        return None
    return t.loc[[int(cod)]].astype({"bairro": str})


def bairro_sinal(d, ativ, mun, bairro: str) -> dict | None:
    """Negócios do ramo no bairro, a cada 100 empresas, comparado com a cidade.
    Sem população por bairro, o total de empresas do bairro faz o papel de movimento comercial."""
    tot = _bairros_da_cidade(d, mun["codigo"])
    if tot is None:
        return None
    chave = normalizar_nome(bairro)
    linha = tot[tot["bairro"].map(normalizar_nome) == chave]
    if linha.empty:
        return None
    nome, empresas = linha.iloc[0]["bairro"], int(linha.iloc[0]["empresas"])
    exibe = acentuar(d, nome)
    r = d["bairros"]
    r = r.loc[[int(mun["codigo"])]] if r is not None and int(mun["codigo"]) in r.index else None
    ramo = r[r["cnae_principal"].isin(ativ["_cnaes"])].astype({"bairro": str}) if r is not None else None
    por_bairro = ramo.groupby("bairro")["ativos"].sum() if ramo is not None else pd.Series(dtype=int)
    aqui = int(por_bairro.get(nome, 0))
    base = {"id": "bairro", "title": f"No bairro {exibe}", "confidence": "OBSERVADO", "sampleSize": empresas, "source": _fonte(d, "cnpj")}
    if empresas < 30:
        return base | {"verdict": "neutro", "headline": f"{_num(aqui)} {ativ['plural']} no bairro",
                       "detail": "O bairro tem poucas empresas registradas para comparar com o resto da cidade."}
    taxa = aqui / empresas * 100
    taxa_cid = float(por_bairro.sum()) / float(tot["empresas"].sum()) * 100 if len(tot) else 0
    v = "neutro" if taxa_cid == 0 else "favoravel" if taxa <= taxa_cid * 0.7 else "atencao" if taxa >= taxa_cid * 1.4 else "neutro"
    grandes = tot[tot["empresas"] >= 50].set_index("bairro")["empresas"]
    dens = (por_bairro.reindex(grandes.index, fill_value=0) / grandes * 100).sort_values()
    menos = [acentuar(d, b) for b in dens.index if b != nome][:3]
    detalhe = {"favoravel": "Menos concorrência no bairro do que no resto da cidade, para o tanto de comércio que ele tem.",
               "atencao": "Mais concorrência no bairro do que no resto da cidade, para o tanto de comércio que ele tem.",
               "neutro": "Concorrência no bairro parecida com a do resto da cidade."}[v]
    return base | {"verdict": v, "headline": f"{_num(aqui)} {ativ['plural']} entre {_num(empresas)} empresas do bairro",
                   "detail": detalhe + (f" Bairros com menos concorrência: {', '.join(menos)}." if menos else ""),
                   "comparison": f"No bairro: {taxa:.1f} a cada 100 empresas. Na cidade: {taxa_cid:.1f}".replace(".", ","),
                   "nearby": menos}


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


@app.get("/v1/bairros")
def bairros(municipio: str = Query(..., min_length=7, max_length=7), busca: str = Query("", max_length=60), limite: int = Query(40, ge=1, le=200)):
    """Bairros da cidade, dos que têm mais empresas para os que têm menos. Lista vazia = cidade sem bairros nos dados."""
    d = dados()
    _municipio(d, municipio)
    t = _bairros_da_cidade(d, municipio)
    if t is None:
        return []
    t = t.sort_values("empresas", ascending=False)
    if busca.strip():
        q = normalizar_nome(busca)
        t = t[t["bairro"].map(normalizar_nome).str.contains(q, regex=False)]
    return [{"nome": acentuar(d, r.bairro), "empresas": int(r.empresas)} for r in t.head(limite).itertuples()]


LIMITACOES = [
    "Conta só empresas com CNPJ e com essa atividade como principal; negócios informais não aparecem, então a concorrência real costuma ser maior.",
    "CNPJ baixado ou inapto nem sempre é falência: pode ser mudança de ramo, de cidade ou de tipo de empresa.",
    "Algumas empresas se registram com a atividade errada; os números podem incluir ou deixar de fora negócios parecidos.",
    "Os números descrevem o passado do setor. Não são causa nem previsão do seu resultado.",
]


@app.get("/v1/insights")
def insights(municipio: str = Query(..., min_length=7, max_length=7), atividade: str = Query(..., max_length=40),
             bairro: str = Query("", max_length=80)):
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
            "signals": [s for s in [bairro_sinal(d, ativ, mun, bairro) if bairro.strip() else None, concorrencia(d, ativ, mun),
                                    espaco(d, ativ, mun), sobrevivencia(d, ativ, mun), movimento(d, ativ, mun)] if s],
            "marketScore": notas_de_mercado(d, ativ, mun),
            "opportunities": oportunidades(d, ativ, mun),
            "limitations": limitacoes}
