"""Modelos do motor de dados (MOD-02 e MOD-03).

MOD-02  Sobrevivência com Bayes empírico (beta-binomial).
        Em cidade pequena, "3 de 4 fecharam" é ruído. A taxa da cidade é puxada para a
        taxa da UF na medida da incerteza: peso_local = n / (n + m). O m sai dos próprios
        dados (quanto as cidades realmente diferem entre si), não de opinião.

MOD-03  Espaço no mercado com regressão Binomial Negativa.
        Quantos estabelecimentos de um CNAE uma cidade "deveria" ter, dado o tamanho, a
        renda (PIB per capita) e a região. Binomial Negativa porque o dado é contagem e
        varia mais que uma Poisson. Navalha de Occam: ajustamos 3 modelos encaixados e
        fica o de menor AIC; um termo só entra se melhorar o ajuste mais do que custa.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from scipy import stats

M_MIN, M_MAX = 5.0, 2000.0


# ---------------------------------------------------------------- MOD-02

def forca_da_priori(k: np.ndarray, n: np.ndarray) -> float:
    """m do beta-binomial pelo método dos momentos (quanto as cidades diferem de verdade).

    τ² = variância entre cidades descontado o ruído binomial; m = p(1−p)/τ² − 1.
    Se as cidades não diferem além do ruído, m vai ao teto (quase tudo vem da UF).
    """
    k, n = np.asarray(k, float), np.asarray(n, float)
    ok = n > 0
    k, n = k[ok], n[ok]
    if len(n) < 3 or n.sum() == 0:
        return M_MAX
    p = k.sum() / n.sum()
    if p <= 0 or p >= 1:
        return M_MAX
    r = k / n
    num = (n * (r - p) ** 2).sum() - (len(n) - 1) * p * (1 - p)
    den = n.sum() - (n ** 2).sum() / n.sum()
    tau2 = num / den if den > 0 else 0.0
    if tau2 <= 0:
        return M_MAX
    return float(np.clip(p * (1 - p) / tau2 - 1, M_MIN, M_MAX))


def sobrevivencia_bayes(sob: pd.DataFrame, nivel: float = 0.90) -> tuple[pd.DataFrame, pd.DataFrame]:
    """sob: cod_ibge, uf, cnae_principal, n, k (k = fecharam antes de 24 meses).

    Retorna (por município, por UF). Em cada linha:
      s_bruta  = 1 − k/n              (só a cidade)
      s        = 1 − (k + m·q)/(n + m) (cidade + UF, Bayes empírico)
      ic_inf/ic_sup do posterior Beta, peso_local = n/(n+m)
    A UF também é puxada para o Brasil do mesmo jeito (UF pequena, CNAE raro).
    """
    linhas_mun, linhas_uf = [], []
    for cnae, g in sob.groupby("cnae_principal"):
        K, N = g["k"].sum(), g["n"].sum()
        q_br = K / N if N else np.nan
        uf = g.groupby("uf")[["k", "n"]].sum().reset_index()
        m_uf = forca_da_priori(uf["k"], uf["n"])
        uf["q"] = (uf["k"] + m_uf * q_br) / (uf["n"] + m_uf)
        m = forca_da_priori(g["k"], g["n"])
        uf["m"] = m
        uf["cnae_principal"] = cnae
        uf["q_br"] = q_br
        linhas_uf.append(uf)
        x = g.merge(uf[["uf", "q"]], on="uf", how="left")
        a = x["k"] + m * x["q"]
        b = (x["n"] - x["k"]) + m * (1 - x["q"])
        cauda = (1 - nivel) / 2
        linhas_mun.append(pd.DataFrame({
            "cod_ibge": x["cod_ibge"], "cnae_principal": cnae, "n": x["n"], "k": x["k"],
            "s_bruta": 1 - x["k"] / x["n"],
            "s": 1 - a / (a + b),
            "ic_inf": 1 - stats.beta.ppf(1 - cauda, a, b),
            "ic_sup": 1 - stats.beta.ppf(cauda, a, b),
            "peso_local": x["n"] / (x["n"] + m),
        }))
    mun = pd.concat(linhas_mun, ignore_index=True) if linhas_mun else pd.DataFrame()
    por_uf = pd.concat(linhas_uf, ignore_index=True) if linhas_uf else pd.DataFrame()
    if not por_uf.empty:
        por_uf["s"] = 1 - por_uf["q"]
        por_uf = por_uf[["uf", "cnae_principal", "n", "k", "s", "m", "q_br"]]
    return mun, por_uf


# ---------------------------------------------------------------- MOD-03

TERMOS = {  # modelos encaixados, do mais simples ao mais completo (navalha de Occam)
    "tamanho": ["log_pop"],
    "tamanho+regiao": ["log_pop", "reg_Norte", "reg_Nordeste", "reg_Sul", "reg_Centro-Oeste"],
    "tamanho+renda": ["log_pop", "log_pib_pc"],
    "tamanho+renda+regiao": ["log_pop", "log_pib_pc", "reg_Norte", "reg_Nordeste", "reg_Sul", "reg_Centro-Oeste"],
}
REGIOES_DUMMY = ["Norte", "Nordeste", "Sul", "Centro-Oeste"]   # Sudeste é a base


def matriz(muni: pd.DataFrame) -> pd.DataFrame:
    """Covariáveis por município: log da população, log do PIB per capita, região."""
    X = pd.DataFrame({"cod_ibge": muni["cod_ibge"].astype(str), "const": 1.0,
                      "log_pop": np.log(muni["populacao"].astype(float))})
    pib = muni["pib_pc"].astype(float) if "pib_pc" in muni else pd.Series(np.nan, index=muni.index)
    X["log_pib_pc"] = np.log(pib.fillna(pib.median()) if pib.notna().any() else pd.Series(1.0, index=muni.index))
    reg = muni["regiao"] if "regiao" in muni else pd.Series(index=muni.index, dtype=object)
    for r in REGIOES_DUMMY:
        X[f"reg_{r}"] = (reg == r).astype(float)
    return X


def _ajustar_nb(y: np.ndarray, X: np.ndarray):
    import statsmodels.api as sm
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return sm.NegativeBinomial(y, X).fit(disp=0, maxiter=300, method="bfgs")


def ajustar_saturacao(ativos: pd.DataFrame, muni: pd.DataFrame, min_total: int = 300,
                      min_municipios: int = 30, cnaes: list[int] | None = None) -> pd.DataFrame:
    """Um modelo por CNAE. Cada linha: coeficientes, alpha, AIC, pseudo-R² e qual modelo venceu.

    ativos: cod_ibge, cnae_principal, ativos (municípios sem estabelecimento contam como zero)
    muni:   cod_ibge, populacao, pib_pc, regiao
    """
    X = matriz(muni).set_index("cod_ibge")
    pib_ok = "pib_pc" in muni and muni["pib_pc"].notna().mean() > 0.9
    tem_regiao = X[[f"reg_{r}" for r in REGIOES_DUMMY]].to_numpy().sum(axis=0)
    tot = ativos.groupby("cnae_principal")["ativos"].agg(["sum", "size"])
    alvo = tot[(tot["sum"] >= min_total) & (tot["size"] >= min_municipios)].index
    if cnaes is not None:
        alvo = [c for c in alvo if c in set(cnaes)]
    saida = []
    for cnae in alvo:
        y = (ativos[ativos["cnae_principal"] == cnae].set_index("cod_ibge")["ativos"]
             .reindex(X.index, fill_value=0).to_numpy(float))
        melhor = None
        for nome, termos in TERMOS.items():
            if "log_pib_pc" in termos and not pib_ok:
                continue
            if "regiao" in nome and (tem_regiao == 0).any():
                continue
            cols = ["const"] + termos
            try:
                r = _ajustar_nb(y, X[cols].to_numpy())
            except Exception:  # noqa: BLE001 — um CNAE que não converge não derruba os outros
                continue
            if not np.isfinite(r.aic) or not r.mle_retvals.get("converged", True):
                continue
            if melhor is None or r.aic < melhor[1].aic - 2:   # só fica mais complexo se o AIC cair de verdade
                melhor = (nome, r, cols)
        if melhor is None:
            continue
        nome, r, cols = melhor
        params = dict(zip(cols + ["alpha"], r.params))
        saida.append({"cnae_principal": int(cnae), "modelo": nome, "n_municipios": len(y), "total": int(y.sum()),
                      "aic": float(r.aic), "pseudo_r2": float(r.prsquared),
                      **{c: float(params.get(c, 0.0)) for c in ["const", *TERMOS["tamanho+renda+regiao"]]},
                      "alpha": float(params["alpha"])})
    return pd.DataFrame(saida)


def esperado(coef: pd.Series, x: pd.Series) -> float:
    """Média prevista μ para um município (x = linha de matriz())."""
    termos = ["const", *TERMOS["tamanho+renda+regiao"]]
    return float(np.exp(sum(coef[t] * x[t] for t in termos)))


def faixa_nb(mu: float, alpha: float, baixo: float = 0.10, alto: float = 0.90) -> tuple[int, int]:
    """Faixa de 80% de uma Binomial Negativa com média μ e dispersão α."""
    if alpha <= 0:
        return int(stats.poisson.ppf(baixo, mu)), int(stats.poisson.ppf(alto, mu))
    r = 1 / alpha
    p = r / (r + mu)
    return int(stats.nbinom.ppf(baixo, r, p)), int(stats.nbinom.ppf(alto, r, p))
