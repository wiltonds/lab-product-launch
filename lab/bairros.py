"""Bairros: contagem de negócios ativos por cidade × bairro × atividade.

O nome do bairro na Receita é digitado à mão ("JD AMERICA", "JARDIM AMÉRICA", "Jd. America").
Arrumamos em dois passos:
  1. Normalização do texto (sem acento, abreviações comuns por extenso).
  2. Voto pelo CEP: cada CEP (em cidade grande, uma rua) fica com o nome de bairro mais usado
     nele, se esse nome tiver pelo menos 60% dos registros do CEP. Em cidade com CEP único,
     nenhum nome domina e cada registro mantém o seu.
Não há população por bairro. O denominador é o total de empresas ativas do bairro, que
serve de retrato do movimento comercial: "negócios do ramo a cada 100 empresas do bairro".
"""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

from lab.config import ATIVA

ABREV = {"JD": "JARDIM", "JDM": "JARDIM", "JARD": "JARDIM", "VL": "VILA", "VLA": "VILA", "PQ": "PARQUE", "PRQ": "PARQUE",
         "CJ": "CONJUNTO", "CONJ": "CONJUNTO", "RES": "RESIDENCIAL", "RESID": "RESIDENCIAL", "STA": "SANTA", "STO": "SANTO",
         "N": "NOVA", "NS": "NOSSA SENHORA", "SRA": "SENHORA", "DR": "DOUTOR", "PROF": "PROFESSOR", "CEL": "CORONEL",
         "GAL": "GENERAL", "PRES": "PRESIDENTE", "GOV": "GOVERNADOR", "DIST": "DISTRITO", "LOT": "LOTEAMENTO",
         "NUC": "NUCLEO", "HAB": "HABITACIONAL", "IND": "INDUSTRIAL", "CID": "CIDADE", "BRO": "BAIRRO", "B": "BAIRRO"}
LIXO = {"", "CENTRO.", "ZONA RURAL", "RURAL", "AREA RURAL", "ZONA URBANA", "NAO INFORMADO", "NAO CONSTA", "SEM BAIRRO",
        "S N", "SN", "XX", "XXX", "0", "00", "000"}
MIN_EMPRESAS = 5      # bairro com menos empresas ativas que isso fica de fora (ruído de digitação)
DOMINIO_CEP = 0.6


def normalizar_bairro(nome: str) -> str:
    s = unicodedata.normalize("NFKD", str(nome)).encode("ascii", "ignore").decode().upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    partes = [ABREV.get(p, p) for p in s.split()]
    if partes[:1] == ["BAIRRO"] and len(partes) > 1:
        partes = partes[1:]
    return " ".join(partes)


def bonito(nome: str) -> str:
    """BENEDITO BENTES → Benedito Bentes (preposições em minúscula, algarismos romanos em maiúscula)."""
    baixo = {"DE", "DA", "DO", "DAS", "DOS", "E"}
    romano = re.compile(r"^(I{1,3}|IV|V|VI{0,3}|IX|X)$")
    out = []
    for i, p in enumerate(nome.split()):
        out.append(p.lower() if p in baixo and i else p if romano.match(p) else p.capitalize())
    return " ".join(out)


def ler_ativos(arq: Path) -> pd.DataFrame:
    """Só ativos e só as colunas necessárias; o bairro vem como dicionário (pouca memória)."""
    t = pq.read_table(arq, columns=["cnae_principal", "municipio_receita", "cep", "bairro"],
                      filters=[("situacao", "=", ATIVA)], read_dictionary=["bairro"])
    return t.to_pandas()


def harmonizar(df: pd.DataFrame) -> pd.Series:
    """Nome de bairro arrumado para cada linha de df (municipio_receita, cep, bairro)."""
    cat = df["bairro"].astype("category")
    mapa = {c: normalizar_bairro(c) for c in cat.cat.categories}
    b = cat.map(mapa).astype("category")
    base = pd.DataFrame({"m": df["municipio_receita"].values, "cep": df["cep"].values, "b": b.values})
    base = base[~base["b"].isin(LIXO) & (base["cep"] > 0)]
    votos = base.groupby(["m", "cep", "b"], observed=True).size().rename("n").reset_index()
    tot = votos.groupby(["m", "cep"])["n"].transform("sum")
    venc = votos.sort_values("n", ascending=False).drop_duplicates(["m", "cep"])
    venc = venc[venc["n"] / tot.loc[venc.index] >= DOMINIO_CEP][["m", "cep", "b"]].rename(columns={"b": "b_cep"})
    x = pd.DataFrame({"m": df["municipio_receita"].values, "cep": df["cep"].values, "b": b.astype(object).values}, index=df.index)
    x = x.merge(venc.astype({"b_cep": object}), on=["m", "cep"], how="left").set_axis(df.index)
    final = x["b_cep"].where(x["b_cep"].notna(), x["b"])
    return final.where(~final.isin(LIXO), "")


def agregar_bairros(df: pd.DataFrame, ligacao: pd.DataFrame, cnaes: list[int]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """(por atividade, total). por atividade: cod_ibge, bairro, cnae_principal, ativos (só CNAEs do app).
    total: cod_ibge, bairro, empresas (todas as atividades)."""
    lig = ligacao[["municipio_receita", "cod_ibge"]].drop_duplicates("municipio_receita")
    d = pd.DataFrame({"municipio_receita": df["municipio_receita"].values, "cnae_principal": df["cnae_principal"].values,
                      "bairro": harmonizar(df).values})
    d = d[d["bairro"] != ""].merge(lig, on="municipio_receita", how="inner")
    total = d.groupby(["cod_ibge", "bairro"]).size().rename("empresas").reset_index()
    total = total[total["empresas"] >= MIN_EMPRESAS]
    ramo = (d[d["cnae_principal"].isin(cnaes)].groupby(["cod_ibge", "bairro", "cnae_principal"]).size()
            .rename("ativos").reset_index().merge(total[["cod_ibge", "bairro"]], on=["cod_ibge", "bairro"]))
    for t in (total, ramo):
        t["cod_ibge"] = pd.to_numeric(t["cod_ibge"]).astype("int32")
        t["bairro"] = t["bairro"].map(bonito)
    ramo["cnae_principal"] = ramo["cnae_principal"].astype("int32")
    ramo["ativos"] = ramo["ativos"].astype("int32")
    total["empresas"] = total["empresas"].astype("int32")
    return ramo, total
