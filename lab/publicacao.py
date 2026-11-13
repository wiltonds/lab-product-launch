"""Monta os agregados do Brasil inteiro que a API lê (formato 2).

Entrada: Parquet por UF (lab.brasil.particionar), tabela de municípios da Receita,
população e PIB do IBGE. Saída: dicionário de tabelas pequenas, sem identificação.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

from lab import brasil, estatistica

FORMATO = 2


def tabela_municipios(pop: pd.DataFrame, pib: pd.DataFrame | None) -> pd.DataFrame:
    p = pop.copy()
    p["cod_ibge"] = p["cod_ibge"].astype(str)
    if "ano" in p:
        p = p.sort_values("ano").groupby("cod_ibge", as_index=False).last()
    if "uf" not in p or p["uf"].isna().any():
        p["uf"] = brasil.uf_do_codigo(p["cod_ibge"])
    p["regiao"] = brasil.regiao(p["cod_ibge"])
    if pib is not None and len(pib):
        q = pib.assign(cod_ibge=pib["cod_ibge"].astype(str)).sort_values("ano").groupby("cod_ibge", as_index=False).last()
        p = p.merge(q[["cod_ibge", "pib_mil_reais"]], on="cod_ibge", how="left")
        p["pib_pc"] = p["pib_mil_reais"] * 1000 / p["populacao"]
        p = p.drop(columns="pib_mil_reais")
    else:
        p["pib_pc"] = float("nan")
    return p[["cod_ibge", "municipio", "uf", "regiao", "populacao", "pib_pc"]]


def data_referencia(pasta_estab: Path) -> pd.Timestamp:
    """Última movimentação registrada na edição (lê só uma coluna de cada UF)."""
    maior = None
    for arq in sorted(pasta_estab.glob("uf=*.parquet")):
        m = pq.read_table(arq, columns=["data_situacao"]).column(0).to_pandas().max()
        if pd.notna(m) and (maior is None or m > maior):
            maior = m
    return pd.Timestamp(maior)


def montar(pasta_estab: Path, muni_receita: pd.DataFrame, pop: pd.DataFrame, pib: pd.DataFrame | None = None,
           ref: pd.Timestamp | None = None, log=print) -> dict[str, pd.DataFrame]:
    muni = tabela_municipios(pop, pib)
    ref = ref or data_referencia(pasta_estab)
    partes = {"ativos": [], "movimento": [], "sobrevivencia": []}
    ligacoes, sem_par, coortes = [], [], None
    for arq in sorted(pasta_estab.glob("uf=*.parquet")):
        uf = arq.stem.split("=")[1]
        est = pd.read_parquet(arq)
        pares = pd.DataFrame({"uf": uf, "municipio_receita": est["municipio_receita"].unique()})
        lig, sem = brasil.ligar_municipios(pares, muni_receita, muni[muni["uf"] == uf])
        ligacoes.append(lig.assign(uf=uf))
        sem_par.append(sem)
        ag = brasil.agregar_uf(est, lig, ref)
        for k in partes:
            partes[k].append(ag[k])
        coortes = ag["coortes"]
        log(f"  {uf}: {len(est):,} estabelecimentos, {lig['cod_ibge'].nunique()} municípios ligados, {len(sem)} sem par")
        del est
    out = {k: pd.concat(v, ignore_index=True) for k, v in partes.items()}
    sob = out.pop("sobrevivencia")
    sob["uf"] = brasil.uf_do_codigo(sob["cod_ibge"])
    log("Sobrevivência com Bayes empírico...")
    out["sobrevivencia"], out["sobrevivencia_uf"] = estatistica.sobrevivencia_bayes(sob)
    log("Espaço no mercado (Binomial Negativa por CNAE)...")
    muni_mod = muni[muni["populacao"] > 0]
    out["saturacao"] = estatistica.ajustar_saturacao(out["ativos"], muni_mod)
    out["municipios"] = muni
    out["ligacao"] = pd.concat(ligacoes, ignore_index=True)
    out["sem_par"] = pd.concat(sem_par, ignore_index=True)
    out["_ref"] = ref
    out["_coortes"] = coortes
    return out
