import numpy as np
import pandas as pd

from lab import brasil, estatistica


def test_forca_da_priori_sem_diferenca_real_vai_ao_teto():
    # 50 cidades com a mesma taxa verdadeira: a variação é só ruído, a cidade empresta quase tudo da UF
    rng = np.random.default_rng(1)
    n = rng.integers(20, 200, 50)
    k = rng.binomial(n, 0.3)
    assert estatistica.forca_da_priori(k, n) >= 200


def test_forca_da_priori_com_diferenca_real_fica_menor():
    rng = np.random.default_rng(2)
    n = rng.integers(200, 400, 60)
    p = rng.beta(3, 7, 60)               # cidades realmente diferentes
    k = rng.binomial(n, p)
    assert estatistica.forca_da_priori(k, n) < 50


def test_bayes_puxa_cidade_pequena_para_a_uf():
    sob = pd.DataFrame({"cod_ibge": ["2700001", "2700002", "2700003", "2700004"],
                        "uf": "AL", "cnae_principal": 1, "n": [4, 400, 380, 420], "k": [3, 120, 110, 130]})
    mun, uf = estatistica.sobrevivencia_bayes(sob)
    pequena = mun[mun["cod_ibge"] == "2700001"].iloc[0]
    assert pequena["s_bruta"] == 0.25                     # 3 de 4 fecharam
    assert pequena["s"] > 0.6                             # mas a estimativa fica perto da UF (~0,70)
    assert pequena["peso_local"] < 0.5
    assert pequena["ic_inf"] < pequena["s"] < pequena["ic_sup"]
    assert 0.6 < uf.iloc[0]["s"] < 0.75


def test_saturacao_recupera_elasticidade_e_escolhe_o_mais_simples():
    rng = np.random.default_rng(3)
    cods = [f"27{i:05d}" for i in range(300)]
    pop = np.exp(rng.uniform(np.log(5e3), np.log(5e5), 300))
    muni = pd.DataFrame({"cod_ibge": cods, "populacao": pop, "pib_pc": rng.lognormal(10, .3, 300),
                         "regiao": "Nordeste"})
    mu = 0.002 * pop                                    # proporcional à população, renda não importa
    y = rng.negative_binomial(5, 5 / (5 + mu))
    ativos = pd.DataFrame({"cod_ibge": cods, "cnae_principal": 1, "ativos": y})
    ativos = ativos[ativos["ativos"] > 0]
    sat = estatistica.ajustar_saturacao(ativos, muni, min_total=10, min_municipios=10)
    linha = sat.iloc[0]
    assert abs(linha["log_pop"] - 1.0) < 0.1
    assert linha["modelo"] == "tamanho"                 # renda não entra: não paga o próprio custo no AIC
    x = estatistica.matriz(muni).set_index("cod_ibge").iloc[0]
    m = estatistica.esperado(linha, x)
    lo, hi = estatistica.faixa_nb(m, linha["alpha"])
    assert lo <= m <= hi


def test_ligar_municipios_pela_uf_e_pelo_nome():
    ibge = pd.DataFrame({"cod_ibge": ["2700001", "2900001", "2300001"],
                         "municipio": ["Santa Luzia do Norte", "Santa Luzia", "Itapajé"], "uf": ["AL", "BA", "CE"]})
    rec = pd.DataFrame({"codigo": ["1", "2", "3"], "descricao": ["SANTA LUZIA DO NORTE", "SANTA LUZIA", "ITAPAGE"]})
    pares = pd.DataFrame({"uf": ["AL", "BA", "CE"], "municipio_receita": [1, 2, 3]})
    lig, sem = brasil.ligar_municipios(pares, rec, ibge)
    mapa = dict(zip(lig["municipio_receita"], lig["cod_ibge"]))
    assert mapa == {1: "2700001", 2: "2900001", 3: "2300001"}   # mesmo nome em UFs diferentes não se mistura
    assert sem.empty


def test_ultima_coorte_completa():
    assert brasil.ultima_coorte_completa(pd.Timestamp("2026-10-11")) == 2023
    assert brasil.ultima_coorte_completa(pd.Timestamp("2027-01-15")) == 2024
