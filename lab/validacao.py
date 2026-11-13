"""Validação fora da amostra dos modelos (o teste que um investidor ou jornalista pode refazer).

Sobrevivência: treina com 5 coortes e prevê a coorte seguinte, que o modelo nunca viu.
  Compara três jeitos de prever a taxa de fechamento de cada cidade × atividade:
    cidade sozinha (só os casos da cidade), UF (média do estado) e Bayes empírico (os dois, na medida certa).
  Métricas: log-loss por negócio (menor = melhor) e erro médio em pontos percentuais
  nas células com pelo menos 10 aberturas no teste.

Espaço no mercado: validação cruzada em 5 partes por município. Para cada parte, o modelo é
  ajustado sem ela e prevê quantos estabelecimentos ela tem. Compara com a regra simples
  "proporcional à população". Métrica: erro médio de |log((obs+1)/(previsto+1))|.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from lab import estatistica

EPS = 1e-3


def _logloss(q: np.ndarray, k: np.ndarray, n: np.ndarray) -> float:
    q = np.clip(q, EPS, 1 - EPS)
    return float(-(k * np.log(q) + (n - k) * np.log(1 - q)).sum() / n.sum())


def validar_sobrevivencia(treino: pd.DataFrame, teste: pd.DataFrame) -> dict:
    """treino e teste: cod_ibge, uf, cnae_principal, n, k."""
    mun, por_uf = estatistica.sobrevivencia_bayes(treino)
    t = teste.merge(mun[["cod_ibge", "cnae_principal", "s", "s_bruta"]], on=["cod_ibge", "cnae_principal"], how="left")
    t = t.merge(por_uf[["uf", "cnae_principal", "s"]].rename(columns={"s": "s_uf"}), on=["uf", "cnae_principal"], how="left")
    t = t.dropna(subset=["s_uf"])
    if t.empty:
        return {}
    q_uf = 1 - t["s_uf"].to_numpy()
    q_eb = 1 - t["s"].fillna(t["s_uf"]).to_numpy()
    q_cid = 1 - t["s_bruta"].fillna(t["s_uf"]).to_numpy()
    k, n = t["k"].to_numpy(float), t["n"].to_numpy(float)
    grande = n >= 10
    obs = k / n

    def mae(q):
        return float(np.average(np.abs(q[grande] - obs[grande]), weights=n[grande]) * 100) if grande.any() else None

    return {"negocios_no_teste": int(n.sum()), "celulas": int(len(t)),
            "logloss": {"cidade_sozinha": _logloss(q_cid, k, n), "uf": _logloss(q_uf, k, n), "bayes_empirico": _logloss(q_eb, k, n)},
            "erro_pp": {"cidade_sozinha": mae(q_cid), "uf": mae(q_uf), "bayes_empirico": mae(q_eb)}}


def validar_saturacao(ativos: pd.DataFrame, muni: pd.DataFrame, sat: pd.DataFrame, max_cnaes: int = 40,
                      partes: int = 5, seed: int = 0) -> dict:
    if sat.empty:
        return {}
    X = estatistica.matriz(muni).set_index("cod_ibge")
    pop = muni.set_index(muni["cod_ibge"].astype(str))["populacao"].reindex(X.index).to_numpy(float)
    rng = np.random.default_rng(seed)
    dobra = rng.integers(0, partes, len(X))
    alvo = sat.sort_values("total", ascending=False).head(max_cnaes)
    erros_mod, erros_base = [], []
    for linha in alvo.itertuples():
        cols = ["const"] + estatistica.TERMOS[linha.modelo]
        y = (ativos[ativos["cnae_principal"] == linha.cnae_principal].set_index("cod_ibge")["ativos"]
             .reindex(X.index, fill_value=0).to_numpy(float))
        prev_mod, prev_base = np.full(len(y), np.nan), np.full(len(y), np.nan)
        for f in range(partes):
            tr, te = dobra != f, dobra == f
            try:
                r = estatistica._ajustar_nb(y[tr], X[cols].to_numpy()[tr])
            except Exception:  # noqa: BLE001
                continue
            beta = np.asarray(r.params)[: len(cols)]
            prev_mod[te] = np.exp(X[cols].to_numpy()[te] @ beta)
            prev_base[te] = y[tr].sum() / pop[tr].sum() * pop[te]
        ok = ~np.isnan(prev_mod)
        erros_mod.append(np.mean(np.abs(np.log((y[ok] + 1) / (prev_mod[ok] + 1)))))
        erros_base.append(np.mean(np.abs(np.log((y[ok] + 1) / (prev_base[ok] + 1)))))
    if not erros_mod:
        return {}
    em, eb = float(np.median(erros_mod)), float(np.median(erros_base))
    return {"cnaes_testados": len(erros_mod), "erro_log_modelo": em, "erro_log_proporcional": eb,
            "cnaes_em_que_o_modelo_ganha": int(sum(m < b for m, b in zip(erros_mod, erros_base)))}
