"""coletar_pib.py — PIB dos municípios (IBGE/SIDRA, tabela 5938), último ano disponível.

Grava data/processed/pib.parquet com cod_ibge, ano, pib_mil_reais.
A variável é escolhida pelo rótulo ("Produto Interno Bruto a preços correntes"), não por número,
para não quebrar se o IBGE renumerar. Se falhar, o motor segue sem renda (só tamanho e região).

Uso:
    python jobs/coletar_pib.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import PROC  # noqa: E402

# v/37 = PIB a preços correntes. Pedir v/all para todos os municípios passa do limite de
# valores por consulta do SIDRA (erro 400), então pedimos só a variável que usamos.
URL = "https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37/p/last"
ROTULO = "Produto Interno Bruto a preços correntes"


def parse_pib(dados: list[dict]) -> pd.DataFrame:
    rotulos, linhas = dados[0], dados[1:]
    chave = lambda texto: next(k for k, v in rotulos.items() if v == texto)  # noqa: E731
    k_cod, k_var, k_ano = chave("Município (Código)"), chave("Variável"), chave("Ano")
    df = pd.DataFrame(linhas)
    certo = df[df[k_var].str.startswith(ROTULO)]
    df = certo if len(certo) else df   # se o IBGE mudar o rótulo, fica a única variável pedida
    out = pd.DataFrame({"cod_ibge": df[k_cod].astype(str),
                        "ano": pd.to_numeric(df[k_ano], errors="coerce").astype("Int64"),
                        "pib_mil_reais": pd.to_numeric(df["V"], errors="coerce")})
    return out.dropna(subset=["pib_mil_reais"])


def main() -> None:
    import requests
    r = requests.get(URL, timeout=300)
    r.raise_for_status()
    df = parse_pib(r.json())
    PROC.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROC / "pib.parquet", index=False)
    print(f"PIB de {len(df)} municípios, ano {df['ano'].max()}")


if __name__ == "__main__":
    main()
