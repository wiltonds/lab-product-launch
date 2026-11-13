"""Formato compacto das tabelas grandes publicadas (o que a API carrega na memória).

Código IBGE e CNAE como int32, números em float32/int32, ordenado por município.
Corta mais da metade da memória da API (o plano gratuito do Render tem 512 MB).
"""
from __future__ import annotations

import pandas as pd

GRANDES = ("ativos", "movimento", "sobrevivencia")
COLUNAS = {"sobrevivencia": ["cod_ibge", "cnae_principal", "n", "s", "ic_inf", "ic_sup", "peso_local"]}


def compactar(t: pd.DataFrame, nome: str) -> pd.DataFrame:
    cols = COLUNAS.get(nome)
    t = t[cols].copy() if cols else t.copy()
    t["cod_ibge"] = pd.to_numeric(t["cod_ibge"]).astype("int32")
    t["cnae_principal"] = t["cnae_principal"].astype("int32")
    for c in t.columns.drop(["cod_ibge", "cnae_principal"]):
        t[c] = t[c].astype("float32") if t[c].dtype.kind == "f" else t[c].astype("int32")
    return t.sort_values(["cod_ibge", "cnae_principal"], kind="stable").reset_index(drop=True)
