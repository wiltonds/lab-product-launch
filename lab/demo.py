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


# ---------------------------------------------------------------- Brasil (formato 2), também sintético

UFS_DEMO = {"AL": "27", "SP": "35", "PR": "41"}


def brasil_sintetico(pasta, por_uf: int = 20, seed: int = 11):
    """Cria data/processed/<mes>/estab/uf=XX.parquet SINTÉTICOS em `pasta` e devolve
    (municipios_receita, populacao, pib). Cidades inventadas, só para testar o pipeline."""
    from pathlib import Path

    rng = np.random.default_rng(seed)
    pasta = Path(pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    rec, pop, pib = [], [], []
    cod_rec = 1000
    for uf, cu in UFS_DEMO.items():
        linhas = []
        for i in range(por_uf):
            cod = f"{cu}{i:05d}"
            nome = f"Cidade {uf} {i:02d}"
            habitantes = int(np.exp(rng.uniform(np.log(4_000), np.log(400_000))))
            renda = rng.lognormal(10, 0.3) * (1.4 if uf != "AL" else 1.0)
            cod_rec += 1
            rec.append({"codigo": str(cod_rec), "descricao": nome.upper()})
            pop.append({"cod_ibge": cod, "municipio": nome, "uf": uf, "ano": 2025, "populacao": habitantes})
            pib.append({"cod_ibge": cod, "ano": 2023, "pib_mil_reais": habitantes * renda / 1000})
            for cnae, (taxa, escala, forma) in PARAM.items():
                for ano in range(2012, 2027):
                    n = rng.poisson(taxa * habitantes / 1e4 * (0.7 if ano == 2026 else 1) * (renda / 25_000) ** 0.5)
                    if n == 0:
                        continue
                    dia = rng.integers(0, 270 if ano == 2026 else 365, n)
                    inicio = pd.Timestamp(f"{ano}-01-01") + pd.to_timedelta(dia, unit="D")
                    fim = inicio + pd.to_timedelta(escala * rng.weibull(forma, n) * 30.44, unit="D")
                    fechou = fim <= REF
                    sit = np.where(fechou & (rng.random(n) < .25), 4, np.where(fechou, 8, 2))
                    linhas.append(pd.DataFrame({
                        "matriz_filial": np.where(rng.random(n) < .06, 2, 1).astype("int8"),
                        "situacao": sit.astype("int8"),
                        "data_situacao": pd.Series(fim).where(fechou, pd.NaT).values.astype("datetime64[s]"),
                        "data_inicio": inicio.values.astype("datetime64[s]"),
                        "cnae_principal": np.int32(int(cnae)), "municipio_receita": np.int32(cod_rec)}))
        pd.concat(linhas, ignore_index=True).to_parquet(pasta / f"uf={uf}.parquet", index=False)
    return pd.DataFrame(rec), pd.DataFrame(pop), pd.DataFrame(pib)
