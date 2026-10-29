"""coletar_populacao.py — População estimada dos municípios de AL (IBGE/SIDRA, tabela 6579).

Grava data/processed/populacao.parquet com cod_ibge, municipio, ano, populacao.

Uso:
    python jobs/coletar_populacao.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import COD_UF_IBGE, PROC  # noqa: E402

URL = f"https://apisidra.ibge.gov.br/values/t/6579/n6/in%20n3%20{COD_UF_IBGE}/v/9324/p/last"


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
        "ano": pd.to_numeric(df[k_ano], errors="coerce").astype("Int64"),
        "populacao": pd.to_numeric(df[k_val], errors="coerce"),
    })
    return out.dropna(subset=["populacao"])


def main() -> None:
    import requests
    r = requests.get(URL, timeout=60)
    r.raise_for_status()
    df = parse_sidra(r.json())
    PROC.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROC / "populacao.parquet", index=False)
    print(f"{len(df)} municípios, ano {df['ano'].max()}, população total {df['populacao'].sum():,.0f}")


if __name__ == "__main__":
    main()
