"""MOD-01 — Sobrevivência por coorte de abertura (Kaplan-Meier com intervalo de Greenwood).

Princípio XI da constituição: sobrevivência só sai de coorte de entrada com
horizonte definido. A tabela de vida é agregada (sem identificar empresas),
então pode ser publicada e usada pelo app.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from lab.config import BAIXADA, INAPTA, N_MIN_COORTE

MES = 30.4375
EVENTOS = {"baixada": {BAIXADA}, "baixada_ou_inapta": {BAIXADA, INAPTA}}
DEFINICAO = {
    "unidade": "estabelecimento (CNPJ completo)",
    "empresa_nova": "data de início de atividade dentro do ano da coorte",
    "evento": "situação cadastral baixada (ou inapta, na definição ampla) com data da situação",
    "censura": "ainda não teve o evento na data de referência; suspensas são censuradas",
}


def tabela_vida(est: pd.DataFrame, data_ref: str | pd.Timestamp, evento: str = "baixada",
                por=("municipio", "cnae_principal")) -> pd.DataFrame:
    """Uma linha por (grupo, coorte, mês): eventos d e censuras c."""
    ref = pd.Timestamp(data_ref)
    df = est.dropna(subset=["data_inicio"]).copy()
    df = df[df["data_inicio"] <= ref]
    teve = df["situacao"].isin(EVENTOS[evento]) & df["data_situacao"].notna() & (df["data_situacao"] <= ref)
    fim = df["data_situacao"].where(teve, ref)
    df["t"] = np.floor(((fim - df["data_inicio"]).dt.days / MES).clip(lower=0)).astype(int)
    df["d"] = teve.astype(int)
    df["c"] = 1 - df["d"]
    df["coorte"] = df["data_inicio"].dt.year
    return df.groupby(list(por) + ["coorte", "t"])[["d", "c"]].sum().reset_index()


def curva_km(tv: pd.DataFrame) -> pd.DataFrame:
    """Kaplan-Meier a partir de uma tabela de vida com colunas t, d, c (já filtrada)."""
    t = tv.groupby("t")[["d", "c"]].sum().sort_index()
    n0 = int(t[["d", "c"]].to_numpy().sum())
    saidas = (t["d"] + t["c"]).cumsum().shift(fill_value=0)
    t["n"] = n0 - saidas
    t = t[t["n"] > 0]
    fator = 1 - t["d"] / t["n"]
    t["S"] = fator.cumprod()
    with np.errstate(divide="ignore", invalid="ignore"):
        gw = (t["d"] / (t["n"] * (t["n"] - t["d"]))).replace([np.inf], np.nan).cumsum()
        # intervalo log-log (fica dentro de [0, 1])
        logS = np.log(t["S"])
        se = np.sqrt(gw) / np.abs(logS)
        t["ic_inf"] = t["S"] ** np.exp(1.96 * se)
        t["ic_sup"] = t["S"] ** np.exp(-1.96 * se)
    t.loc[t["S"] >= 1, ["ic_inf", "ic_sup"]] = 1.0
    t.loc[t["S"] <= 0, ["ic_inf", "ic_sup"]] = 0.0
    out = t.reset_index()[["t", "n", "d", "c", "S", "ic_inf", "ic_sup"]]
    out.attrs["n_inicial"] = n0
    return out


def sobrevivencia_em(curva: pd.DataFrame, mes: int) -> dict:
    sub = curva[curva["t"] < mes]
    if sub.empty:
        return {"S": 1.0, "ic_inf": 1.0, "ic_sup": 1.0}
    r = sub.iloc[-1]
    return {"S": float(r["S"]), "ic_inf": float(r["ic_inf"]), "ic_sup": float(r["ic_sup"])}


def avaliar_coorte(tv: pd.DataFrame, coorte: int, data_ref: str | pd.Timestamp,
                   horizontes=(12, 24, 60)) -> dict:
    """Resultado de uma coorte com validade explícita (RF-04)."""
    ref = pd.Timestamp(data_ref)
    sel = tv[tv["coorte"] == coorte]
    n = int(sel[["d", "c"]].to_numpy().sum())
    meses_obs = (ref - pd.Timestamp(f"{coorte}-12-31")).days / MES
    res = {"coorte": coorte, "n_inicial": n, "meses_observados_min": round(meses_obs, 1),
           "definicao": DEFINICAO, "resultados": {}}
    if n == 0:
        res["situacao"] = "sem dados"
        return res
    curva = curva_km(sel)
    for h in horizontes:
        valido = meses_obs >= h and n >= N_MIN_COORTE
        r = sobrevivencia_em(curva, h)
        motivo = None
        if meses_obs < h:
            motivo = "horizonte incompleto"
        elif n < N_MIN_COORTE:
            motivo = f"coorte com menos de {N_MIN_COORTE} estabelecimentos"
        res["resultados"][h] = {**r, "valido": valido, "motivo": motivo}
    res["situacao"] = "ok" if n >= N_MIN_COORTE else "insuficiente"
    res["curva"] = curva
    return res
