import pandas as pd
from lab import indicadores as ind


def est():
    return pd.DataFrame({
        "cnpj_basico": ["1", "1", "2", "3", "4"], "matriz_filial": [1, 2, 1, 1, 1],
        "situacao": [2, 2, 2, 8, 4], "cnae_principal": "5611203", "municipio": "X",
        "data_inicio": pd.to_datetime(["2020-01-01", "2021-01-01", "2022-05-01", "2020-03-01", "2021-02-01"]),
        "data_situacao": pd.to_datetime([None, None, None, "2023-06-01", "2024-01-10"]),
    })


def test_ativos_separa_empresa_e_filial():
    a = ind.ativos(est()).iloc[0]
    assert a["estabelecimentos_ativos"] == 3
    assert a["empresas_ativas"] == 2
    assert a["filiais_ativas"] == 1


def test_fluxo_anual():
    f = ind.fluxo_anual(est()).set_index("ano")
    assert f.loc[2020, "aberturas"] == 2
    assert f.loc[2023, "encerramentos"] == 1
    assert f.loc[2024, "inaptas"] == 1
    assert f.loc[2023, "saldo"] == -1


def test_densidade():
    d = ind.densidade(ind.ativos(est()), pd.DataFrame({"municipio": ["X"], "populacao": [30000]}))
    assert d["por_10mil_hab"].iloc[0] == 1.0


def test_municipio_ligado_pelo_nome_normalizado():
    e = pd.DataFrame({"municipio_receita": ["2785"], "cnpj_basico": ["1"]})
    m = pd.DataFrame({"codigo": ["2785"], "descricao": ["MACEIO"]})
    p = pd.DataFrame({"cod_ibge": ["2704302"], "municipio": ["Maceió"], "populacao": [1]})
    out = ind.anexar_municipio(e, m, p)
    assert out["cod_ibge"].iloc[0] == "2704302"
    assert out["municipio"].iloc[0] == "Maceió"
