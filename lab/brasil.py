"""Base do CNPJ para o Brasil inteiro: leitura em blocos, ligação com o IBGE e agregados por UF.

Por que em blocos: a base tem dezenas de milhões de estabelecimentos. Ela é lida
em pedaços, separada por UF em arquivos Parquet e agregada uma UF por vez, então
cabe na máquina do GitHub Actions (e em qualquer notebook).

O que sai daqui são CONTAGENS por município × CNAE. Nada identifica empresa ou pessoa.
"""
from __future__ import annotations

import difflib
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from lab.config import ATIVA, BAIXADA, COLS_ESTAB, INAPTA
from lab.receita import LEITURA, _csv_do_zip, data_receita, normalizar_nome
from lab.sobrevivencia import MES

# Sigla → código IBGE da UF (os dois primeiros dígitos do código do município).
UFS = {"RO": "11", "AC": "12", "AM": "13", "RR": "14", "PA": "15", "AP": "16", "TO": "17",
       "MA": "21", "PI": "22", "CE": "23", "RN": "24", "PB": "25", "PE": "26", "AL": "27", "SE": "28", "BA": "29",
       "MG": "31", "ES": "32", "RJ": "33", "SP": "35", "PR": "41", "SC": "42", "RS": "43",
       "MS": "50", "MT": "51", "GO": "52", "DF": "53"}
NOME_UF = {"RO": "Rondônia", "AC": "Acre", "AM": "Amazonas", "RR": "Roraima", "PA": "Pará", "AP": "Amapá",
           "TO": "Tocantins", "MA": "Maranhão", "PI": "Piauí", "CE": "Ceará", "RN": "Rio Grande do Norte",
           "PB": "Paraíba", "PE": "Pernambuco", "AL": "Alagoas", "SE": "Sergipe", "BA": "Bahia",
           "MG": "Minas Gerais", "ES": "Espírito Santo", "RJ": "Rio de Janeiro", "SP": "São Paulo",
           "PR": "Paraná", "SC": "Santa Catarina", "RS": "Rio Grande do Sul", "MS": "Mato Grosso do Sul",
           "MT": "Mato Grosso", "GO": "Goiás", "DF": "Distrito Federal"}
REGIAO = {"1": "Norte", "2": "Nordeste", "3": "Sudeste", "4": "Sul", "5": "Centro-Oeste"}

COLS = ["matriz_filial", "situacao", "data_situacao", "data_inicio", "cnae_principal", "uf", "municipio_receita"]
SCHEMA = pa.schema([("matriz_filial", pa.int8()), ("situacao", pa.int8()),
                    ("data_situacao", pa.timestamp("s")), ("data_inicio", pa.timestamp("s")),
                    ("cnae_principal", pa.int32()), ("municipio_receita", pa.int32())])
FECHADA = [BAIXADA, INAPTA]   # definição ampla de fechamento (inapta costuma ser negócio abandonado)
HORIZONTE = 24                # meses
COORTES = 5                   # coortes completas usadas na sobrevivência
JANELA_MOV = 36               # meses do movimento do setor


def _int(s: pd.Series, tipo: str) -> pd.Series:
    return pd.to_numeric(s.str.strip(), errors="coerce").fillna(-1).astype(tipo)


def tipar(ch: pd.DataFrame) -> pd.DataFrame:
    """Do texto da Receita para tipos pequenos (cabe muito mais na memória)."""
    return pd.DataFrame({
        "matriz_filial": _int(ch["matriz_filial"], "int8"),
        "situacao": _int(ch["situacao"], "int8"),
        "data_situacao": data_receita(ch["data_situacao"]).astype("datetime64[s]"),
        "data_inicio": data_receita(ch["data_inicio"]).astype("datetime64[s]"),
        "cnae_principal": _int(ch["cnae_principal"], "int32"),
        "uf": ch["uf"].str.strip(),
        "municipio_receita": _int(ch["municipio_receita"], "int32"),
    })


def particionar(zips: Iterable[Path], destino: Path, bloco: int = 1_000_000) -> dict[str, int]:
    """Lê os zips de Estabelecimentos e grava um Parquet por UF em destino/uf=XX.parquet."""
    destino.mkdir(parents=True, exist_ok=True)
    idx = [COLS_ESTAB.index(c) for c in COLS]
    escritores: dict[str, pq.ParquetWriter] = {}
    contagem: dict[str, int] = {}
    try:
        for z in zips:
            for ch in pd.read_csv(_csv_do_zip(z), names=COLS_ESTAB, usecols=idx, chunksize=bloco, **LEITURA):
                df = tipar(ch)
                for uf, g in df.groupby("uf", sort=False):
                    if uf not in UFS:          # "EX" = exterior, vazio = cadastro com erro
                        continue
                    tab = pa.Table.from_pandas(g.drop(columns="uf"), preserve_index=False).cast(SCHEMA)
                    if uf not in escritores:
                        escritores[uf] = pq.ParquetWriter(destino / f"uf={uf}.parquet", SCHEMA, compression="zstd")
                    escritores[uf].write_table(tab)
                    contagem[uf] = contagem.get(uf, 0) + len(g)
    finally:
        for w in escritores.values():
            w.close()
    return contagem


def ler_uf(origem: Path, uf: str) -> pd.DataFrame:
    return pd.read_parquet(origem / f"uf={uf}.parquet")


# ---------------------------------------------------------------- municípios: Receita → IBGE

APELIDOS = {  # grafias da Receita que não batem com o IBGE (uf, nome Receita normalizado) → nome IBGE normalizado
    ("PB", "SAO DOMINGOS DE POMBAL"): "SAO DOMINGOS",
    ("TO", "SAO VALERIO DA NATIVIDADE"): "SAO VALERIO",
    ("RN", "AUGUSTO SEVERO"): "CAMPO GRANDE",
    ("RN", "PRESIDENTE JUSCELINO"): "SERRA CAIADA",
    ("PE", "IGUARACI"): "IGUARACY",
    ("CE", "ITAPAGE"): "ITAPAJE",
    ("BA", "SANTA TERESINHA"): "SANTA TEREZINHA",
}


def ligar_municipios(pares: pd.DataFrame, muni_receita: pd.DataFrame, ibge: pd.DataFrame,
                     corte: float = 0.88) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Liga o código de município da Receita ao código IBGE pelo nome, dentro da mesma UF.

    pares:        uf, municipio_receita (os que aparecem na base)
    muni_receita: codigo, descricao (tabela Municipios.zip)
    ibge:         cod_ibge, municipio, uf
    Retorna (ligação, sem_par). Primeiro nome exato normalizado, depois apelidos conhecidos,
    por último o nome mais parecido na mesma UF (difflib, corte alto para não ligar errado).
    """
    m = muni_receita.rename(columns={"codigo": "municipio_receita", "descricao": "nome_receita"}).copy()
    m["municipio_receita"] = pd.to_numeric(m["municipio_receita"], errors="coerce").astype("Int64")
    p = pares.drop_duplicates().merge(m, on="municipio_receita", how="left")
    p["chave"] = p["nome_receita"].fillna("").map(normalizar_nome)
    ib = ibge.assign(chave=ibge["municipio"].map(normalizar_nome))
    por_uf = {uf: dict(zip(g["chave"], g["cod_ibge"])) for uf, g in ib.groupby("uf")}

    def achar(uf: str, chave: str):
        tab = por_uf.get(uf, {})
        if chave in tab:
            return tab[chave], "exato"
        alvo = APELIDOS.get((uf, chave))
        if alvo and alvo in tab:
            return tab[alvo], "apelido"
        perto = difflib.get_close_matches(chave, list(tab), n=1, cutoff=corte)
        return (tab[perto[0]], "parecido") if perto else (None, None)

    res = [achar(u, c) for u, c in zip(p["uf"], p["chave"])]
    p["cod_ibge"] = [r[0] for r in res]
    p["ligacao"] = [r[1] for r in res]
    sem = p[p["cod_ibge"].isna()][["uf", "municipio_receita", "nome_receita"]]
    lig = p.dropna(subset=["cod_ibge"])[["municipio_receita", "cod_ibge", "ligacao"]]
    return lig, sem


# ---------------------------------------------------------------- agregados de uma UF

def ultima_coorte_completa(ref: pd.Timestamp, horizonte: int = HORIZONTE) -> int:
    ult = ref.year - 1 - horizonte // 12
    while (ref - pd.Timestamp(f"{ult}-12-31")).days / MES < horizonte:
        ult -= 1
    return ult


def agregar_uf(est: pd.DataFrame, ligacao: pd.DataFrame, ref: pd.Timestamp) -> dict[str, pd.DataFrame]:
    """Contagens por município (código IBGE) × CNAE de uma UF.

    ativos:        estabelecimentos ativos
    movimento:     aberturas e fechamentos (baixada ou inapta) nos últimos 36 meses
    sobrevivencia: n = abertos nas 5 coortes completas mais recentes; k = fecharam antes de 24 meses
    Sem censura antes de 24 meses: só entram coortes já observadas por 24 meses inteiros,
    então a sobrevivência é a proporção 1 − k/n (igual ao Kaplan-Meier nesse caso).
    """
    lig = ligacao[["municipio_receita", "cod_ibge"]].drop_duplicates("municipio_receita")
    df = est.merge(lig, on="municipio_receita", how="inner")
    chave = ["cod_ibge", "cnae_principal"]

    ativos = df[df["situacao"] == ATIVA].groupby(chave).size().rename("ativos").reset_index()

    inicio_janela = ref - pd.DateOffset(months=JANELA_MOV)
    abriu = df["data_inicio"].between(inicio_janela, ref, inclusive="right")
    fechou = df["situacao"].isin(FECHADA) & df["data_situacao"].between(inicio_janela, ref, inclusive="right")
    mov = pd.concat([df[abriu].groupby(chave).size().rename("aberturas"),
                     df[fechou].groupby(chave).size().rename("fechamentos")], axis=1).fillna(0).astype("int32").reset_index()

    ult = ultima_coorte_completa(ref)
    coortes = range(ult - COORTES + 1, ult + 1)
    c = df[df["data_inicio"].dt.year.isin(coortes)]
    meses = (c["data_situacao"] - c["data_inicio"]).dt.days / MES
    k = c["situacao"].isin(FECHADA) & c["data_situacao"].notna() & (c["data_situacao"] <= ref) & (np.floor(meses) < HORIZONTE)
    sob = (c.assign(k=k.astype("int32")).groupby(chave)
           .agg(n=("k", "size"), k=("k", "sum")).reset_index())

    for t in (ativos, mov, sob):
        t["cod_ibge"] = t["cod_ibge"].astype(str)
        t["cnae_principal"] = t["cnae_principal"].astype("int32")
    return {"ativos": ativos, "movimento": mov, "sobrevivencia": sob,
            "coortes": pd.DataFrame({"primeira": [coortes[0]], "ultima": [coortes[-1]]})}


def regiao(cod_ibge: pd.Series) -> pd.Series:
    return cod_ibge.astype(str).str[0].map(REGIAO)


def uf_do_codigo(cod_ibge: pd.Series) -> pd.Series:
    inv = {v: k for k, v in UFS.items()}
    return cod_ibge.astype(str).str[:2].map(inv)
