"""Dados SINTÉTICOS para demonstração do app quando data/publicado/ não existe.

Cidades e contagens são inventadas. Nada aqui descreve um município real.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from lab import indicadores as ind
from lab.sobrevivencia import tabela_vida

REF = pd.Timestamp("2026-09-30")
CIDADES = {"Cidade Demo A": 950_000, "Cidade Demo B": 230_000, "Cidade Demo C": 75_000,
           "Cidade Demo D": 60_000, "Cidade Demo E": 45_000, "Cidade Demo F": 28_000}
CNAES = pd.DataFrame({
    "codigo": ["5611203", "9602501", "7311400", "4763602", "4712100"],
    "descricao": ["Lanchonetes, casas de chá, de sucos e similares (demo)",
                  "Cabeleireiros, manicure e pedicure (demo)",
                  "Agências de publicidade (demo)",
                  "Comércio varejista de artigos esportivos (demo)",
                  "Minimercados, mercearias e armazéns (demo)"],
})
# aberturas por 10 mil hab/ano, escala de Weibull (meses) e forma (<1 = risco cai com a idade)
PARAM = {"5611203": (9, 70, .8), "9602501": (14, 60, .75), "7311400": (3, 90, .85),
         "4763602": (1.5, 80, .8), "4712100": (6, 85, .8)}


def estabelecimentos(seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    linhas = []
    for cidade, pop in CIDADES.items():
        for cnae, (taxa, escala, forma) in PARAM.items():
            for ano in range(2012, 2027):
                n = rng.poisson(taxa * pop / 1e4 * (0.7 if ano == 2026 else 1))
                if n == 0:
                    continue
                dia = rng.integers(0, 270 if ano == 2026 else 365, n)
                inicio = pd.Timestamp(f"{ano}-01-01") + pd.to_timedelta(dia, unit="D")
                vida = escala * rng.weibull(forma, n)
                fim = inicio + pd.to_timedelta(vida * 30.44, unit="D")
                fechou = fim <= REF
                inapta = fechou & (rng.random(n) < 0.25)
                sit = np.where(inapta, 4, np.where(fechou, 8, 2))
                linhas.append(pd.DataFrame({
                    "cnpj_basico": [f"D{cidade[-1]}{cnae}{ano}{i:05d}" for i in range(n)],
                    "matriz_filial": np.where(rng.random(n) < .06, 2, 1),
                    "situacao": sit, "data_inicio": inicio,
                    "data_situacao": pd.Series(fim).where(fechou, pd.NaT).values,
                    "cnae_principal": cnae, "municipio": cidade}))
    return pd.concat(linhas, ignore_index=True)


def agregados() -> dict:
    est = estabelecimentos()
    pop = pd.DataFrame({"municipio": list(CIDADES), "populacao": list(CIDADES.values()), "ano": 2025})
    vida = pd.concat([tabela_vida(est, REF, "baixada").assign(evento="baixada"),
                      tabela_vida(est, REF, "baixada_ou_inapta").assign(evento="baixada_ou_inapta")])
    return {"ativos": ind.ativos(est), "fluxo": ind.fluxo_anual(est), "vida": vida,
            "populacao": pop, "cnaes": CNAES,
            "meta": {"uf": "demo", "edicao": "demonstração", "data_referencia": str(REF.date()),
                     "versao": "demo", "fontes": {"todos": "dados sintéticos gerados por lab/demo.py"}}}
