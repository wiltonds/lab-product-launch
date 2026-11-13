"""coletar_populacao.py — População estimada dos municípios (IBGE/SIDRA, tabela 6579).

Grava data/processed/populacao.parquet com cod_ibge, municipio, uf, ano, populacao.

Uso:
    python jobs/coletar_populacao.py            # Brasil inteiro (5.570 municípios)
    python jobs/coletar_populacao.py --uf AL    # só uma UF
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import PROC  # noqa: E402

BASE = "https://apisidra.ibge.gov.br/values/t/6579/{nivel}/v/9324/p/last"


def url(cod_uf: str | None = None) -> str:
    return BASE.format(nivel=f"n6/in%20n3%20{cod_uf}" if cod_uf else "n6/all")


def parse_sidra(dados: list[dict]) -> pd.DataFrame:
    """A primeira linha da resposta do SIDRA traz os rótulos das colunas."""
    rotulos, linhas = dados[0], dados[1:]
    chave = lambda texto: next(k for k, v in rotulos.items() if v == texto)  # noqa: E731
    k_cod, k_nome = chave("Município (Código)"), chave("Município")
    k_ano, k_val = chave("Ano"), "V"
    df = pd.DataFrame(linhas)
    out = pd.DataFrame({
        "cod_ibge": df[k_cod].astype(str),
        "municipio": df[k_nome].str.replace(r" - [A-Z]{2}$", "", regex=True),
        "uf": df[k_nome].str.extract(r" - ([A-Z]{2})$", expand=False),
        "ano": pd.to_numeric(df[k_ano], errors="coerce").astype("Int64"),
        "populacao": pd.to_numeric(df[k_val], errors="coerce"),
    })
    return out.dropna(subset=["populacao"])


def main() -> None:
    import argparse

    import requests
    ap = argparse.ArgumentParser()
    ap.add_argument("--uf", help="sigla da UF; vazio = Brasil inteiro")
    a = ap.parse_args()
    from lab.brasil import UFS
    r = requests.get(url(UFS[a.uf] if a.uf else None), timeout=180)
    r.raise_for_status()
    df = parse_sidra(r.json())
    PROC.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROC / "populacao.parquet", index=False)
    print(f"{len(df)} municípios, ano {df['ano'].max()}, população total {df['populacao'].sum():,.0f}")


if __name__ == "__main__":
    main()
