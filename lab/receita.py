"""Leitura dos arquivos do CNPJ da Receita Federal (zips com CSV sem cabeçalho)."""
from __future__ import annotations

import io
import unicodedata
import zipfile
from pathlib import Path
from typing import Iterable

import pandas as pd

from lab.config import COLS_EMPRESAS, COLS_ESTAB, COLS_SIMPLES, USAR_EMPRESAS, USAR_ESTAB

LEITURA = dict(sep=";", header=None, dtype=str, encoding="latin-1", keep_default_na=False)


def _csv_do_zip(caminho: Path) -> io.TextIOBase:
    z = zipfile.ZipFile(caminho)
    nome = z.namelist()[0]
    return io.TextIOWrapper(z.open(nome), encoding="latin-1")


def data_receita(s: pd.Series) -> pd.Series:
    """Converte AAAAMMDD; '0', '00000000' e vazio viram NaT."""
    s = s.str.strip().where(lambda x: x.str.len() == 8)
    return pd.to_datetime(s, format="%Y%m%d", errors="coerce")


def ler_estabelecimentos(zips: Iterable[Path], uf: str, bloco: int = 500_000) -> pd.DataFrame:
    """Estabelecimentos de uma UF em TODAS as situações cadastrais."""
    idx = [COLS_ESTAB.index(c) for c in USAR_ESTAB]
    partes = []
    for z in zips:
        for ch in pd.read_csv(_csv_do_zip(z), names=COLS_ESTAB, usecols=idx, chunksize=bloco, **LEITURA):
            partes.append(ch[ch["uf"] == uf])
    if not partes:
        return pd.DataFrame(columns=USAR_ESTAB)
    df = pd.concat(partes, ignore_index=True)
    df["situacao"] = pd.to_numeric(df["situacao"], errors="coerce").astype("Int64")
    df["matriz_filial"] = pd.to_numeric(df["matriz_filial"], errors="coerce").astype("Int64")
    df["data_inicio"] = data_receita(df["data_inicio"])
    df["data_situacao"] = data_receita(df["data_situacao"])
    df["cnae_principal"] = df["cnae_principal"].str.zfill(7)
    return df


def ler_empresas(zips: Iterable[Path], cnpjs: set[str], bloco: int = 500_000) -> pd.DataFrame:
    idx = [COLS_EMPRESAS.index(c) for c in USAR_EMPRESAS]
    partes = []
    for z in zips:
        for ch in pd.read_csv(_csv_do_zip(z), names=COLS_EMPRESAS, usecols=idx, chunksize=bloco, **LEITURA):
            partes.append(ch[ch["cnpj_basico"].isin(cnpjs)])
    df = pd.concat(partes, ignore_index=True) if partes else pd.DataFrame(columns=USAR_EMPRESAS)
    df["capital_social"] = pd.to_numeric(df["capital_social"].str.replace(",", ".", regex=False), errors="coerce")
    return df


def ler_simples(zip_: Path, cnpjs: set[str], bloco: int = 1_000_000) -> pd.DataFrame:
    partes = [ch[ch["cnpj_basico"].isin(cnpjs)]
              for ch in pd.read_csv(_csv_do_zip(zip_), names=COLS_SIMPLES, chunksize=bloco, **LEITURA)]
    df = pd.concat(partes, ignore_index=True) if partes else pd.DataFrame(columns=COLS_SIMPLES)
    for c in [c for c in COLS_SIMPLES if c.startswith("data_")]:
        df[c] = data_receita(df[c])
    return df


def ler_tabela_codigos(zip_: Path, nomes=("codigo", "descricao")) -> pd.DataFrame:
    return pd.read_csv(_csv_do_zip(zip_), names=list(nomes), **LEITURA)


def normalizar_nome(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return " ".join(s.upper().replace("-", " ").replace("'", " ").split())
