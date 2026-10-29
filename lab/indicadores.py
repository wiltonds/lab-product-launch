"""Indicadores IND-01 a IND-07 (spec 000 / arquitetura de dados).

Todos trabalham sobre o DataFrame de estabelecimentos de uma edição da base,
com as colunas de lab.receita.ler_estabelecimentos + `municipio` (nome).
"""
from __future__ import annotations

import pandas as pd

from lab.config import ATIVA, BAIXADA, INAPTA
from lab.receita import normalizar_nome

CHAVE = ["municipio", "cnae_principal"]


def anexar_municipio(est: pd.DataFrame, muni_receita: pd.DataFrame,
                     populacao: pd.DataFrame | None = None) -> pd.DataFrame:
    """O código de município da Receita NÃO é o do IBGE: liga pelo nome normalizado."""
    m = muni_receita.rename(columns={"codigo": "municipio_receita", "descricao": "nome_receita"})
    out = est.merge(m, on="municipio_receita", how="left")
    out["chave_nome"] = out["nome_receita"].map(normalizar_nome)
    if populacao is not None:
        p = populacao.assign(chave_nome=populacao["municipio"].map(normalizar_nome))[["chave_nome", "cod_ibge", "municipio"]]
        out = out.merge(p, on="chave_nome", how="left")
        out["municipio"] = out["municipio"].fillna(out["nome_receita"].str.title())
    else:
        out["municipio"] = out["nome_receita"].str.title()
    return out.drop(columns=["chave_nome"])


def ativos(est: pd.DataFrame, por=CHAVE) -> pd.DataFrame:
    """IND-01: estabelecimentos e empresas ativas, matrizes e filiais separadas."""
    a = est[est["situacao"] == ATIVA]
    g = a.groupby(list(por))
    return pd.DataFrame({
        "estabelecimentos_ativos": g.size(),
        "empresas_ativas": g["cnpj_basico"].nunique(),
        "filiais_ativas": g["matriz_filial"].apply(lambda s: int((s == 2).sum())),
    }).reset_index()


def fluxo_anual(est: pd.DataFrame, por=CHAVE) -> pd.DataFrame:
    """IND-02 aberturas, IND-03 encerramentos (baixadas) e inaptas por ano; IND-05 saldo."""
    ab = (est.dropna(subset=["data_inicio"])
          .assign(ano=lambda d: d["data_inicio"].dt.year)
          .groupby(list(por) + ["ano"]).size().rename("aberturas"))
    enc = (est[est["situacao"] == BAIXADA].dropna(subset=["data_situacao"])
           .assign(ano=lambda d: d["data_situacao"].dt.year)
           .groupby(list(por) + ["ano"]).size().rename("encerramentos"))
    ina = (est[est["situacao"] == INAPTA].dropna(subset=["data_situacao"])
           .assign(ano=lambda d: d["data_situacao"].dt.year)
           .groupby(list(por) + ["ano"]).size().rename("inaptas"))
    out = pd.concat([ab, enc, ina], axis=1).fillna(0).astype(int).reset_index()
    out["saldo"] = out["aberturas"] - out["encerramentos"]
    return out


def densidade(ativos_df: pd.DataFrame, populacao: pd.DataFrame) -> pd.DataFrame:
    """IND-04: estabelecimentos ativos por 10 mil habitantes."""
    p = populacao[["municipio", "populacao"]]
    out = ativos_df.merge(p, on="municipio", how="left")
    out["por_10mil_hab"] = out["estabelecimentos_ativos"] / out["populacao"] * 1e4
    return out


def taxa_encerramento(fluxo: pd.DataFrame, ativos_inicio: pd.Series | None = None) -> pd.DataFrame:
    """IND-07 aproximado: encerramentos do ano ÷ estoque no início do ano.

    O estoque no início do ano é reconstruído como aberturas acumuladas até o
    ano anterior menos encerramentos acumulados até o ano anterior. Com várias
    edições mensais, trocar pela contagem observada na edição de janeiro.
    """
    f = fluxo.sort_values(CHAVE + ["ano"]).copy()
    g = f.groupby(CHAVE)
    f["estoque_inicio"] = (g["aberturas"].cumsum() - f["aberturas"]) - (g["encerramentos"].cumsum() - f["encerramentos"])
    f["taxa_encerramento"] = f["encerramentos"] / f["estoque_inicio"].where(f["estoque_inicio"] > 0)
    return f


def participacao_mei(est: pd.DataFrame, simples: pd.DataFrame, por=CHAVE) -> pd.DataFrame:
    """IND-06: fração dos ativos cuja empresa é optante do MEI."""
    mei = set(simples.loc[simples["opcao_mei"] == "S", "cnpj_basico"])
    a = est[est["situacao"] == ATIVA].assign(mei=lambda d: d["cnpj_basico"].isin(mei))
    return a.groupby(list(por))["mei"].mean().rename("participacao_mei").reset_index()
