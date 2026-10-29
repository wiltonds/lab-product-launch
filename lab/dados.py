"""Camada de dados: Base dos Dados (BigQuery) ou modo demonstração.

Modo real exige: `pip install basedosdados` e um projeto do Google Cloud com
faturamento (as consultas pequenas cabem na cota gratuita do BigQuery).
Confira os nomes de tabelas/colunas no catálogo da Base dos Dados antes de rodar.
"""
from __future__ import annotations
import numpy as np
import pandas as pd

# situação cadastral na Receita: 2 = ativa; 3 suspensa, 4 inapta, 8 baixada
SITUACOES_FIM = {"3", "4", "8", 3, 4, 8}

# moradores por domicílio (média Censo 2022, aproximada)
MORADORES_POR_DOMICILIO = 2.79

SQL_ESTABELECIMENTOS = """
SELECT data_inicio_atividade, situacao_cadastral, data_situacao_cadastral,
       id_municipio, cep
FROM `basedosdados.br_me_cnpj.estabelecimentos`
WHERE data = (SELECT MAX(data) FROM `basedosdados.br_me_cnpj.estabelecimentos`)
  AND sigla_uf = '{uf}'
  AND cnae_fiscal_principal = '{cnae}'
"""

SQL_SALARIO_RAIS = """
SELECT AVG(valor_remuneracao_media) AS salario_medio, COUNT(*) AS vinculos
FROM `basedosdados.br_me_rais.microdados_vinculos`
WHERE ano = (SELECT MAX(ano) FROM `basedosdados.br_me_rais.microdados_vinculos`)
  AND sigla_uf = '{uf}' AND id_municipio = '{id_municipio}'
  AND cnae_2_subclasse = '{cnae}' AND vinculo_ativo_3112 = '1'
"""

SQL_POPULACAO = """
SELECT ano, populacao
FROM `basedosdados.br_ibge_populacao.municipio`
WHERE id_municipio = '{id_municipio}'
ORDER BY ano DESC LIMIT 1
"""


def consultar(sql: str, billing_project: str) -> pd.DataFrame:
    import basedosdados as bd  # só no modo real
    return bd.read_sql(sql, billing_project_id=billing_project)


def preparar_cnpj(df: pd.DataFrame) -> pd.DataFrame:
    """Gera `data_fim` (fechamento) a partir da situação cadastral."""
    out = df.copy()
    fechou = out["situacao_cadastral"].isin(SITUACOES_FIM)
    out["data_fim"] = pd.to_datetime(
        out["data_situacao_cadastral"].where(fechou), errors="coerce")
    out["ativa"] = ~fechou
    return out


def cnpj_sintetico(n: int, sobrev_2a: float, seed: int = 0,
                   ref: str = "2026-10-01") -> pd.DataFrame:
    """DADOS SINTÉTICOS para demonstração: estabelecimentos com risco
    constante de fechar calibrado para a sobrevivência de 2 anos indicada."""
    rng = np.random.default_rng(seed)
    ref = pd.Timestamp(ref)
    idade_dias = rng.uniform(30, 365 * 12, n)  # abertos nos últimos 12 anos
    inicio = ref - pd.to_timedelta(idade_dias, unit="D")
    taxa = -np.log(sobrev_2a) / 24  # por mês
    vida_meses = rng.exponential(1 / taxa, n)
    fim = inicio + pd.to_timedelta(vida_meses * 30.44, unit="D")
    fim = pd.Series(fim).where(fim < ref)
    return pd.DataFrame({
        "data_inicio_atividade": inicio,
        "situacao_cadastral": np.where(fim.notna(), "8", "2"),
        "data_situacao_cadastral": fim,
    }).pipe(preparar_cnpj)
