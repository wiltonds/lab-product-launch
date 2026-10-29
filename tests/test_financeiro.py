import numpy as np
import pytest
from lab.financeiro import Faixa, Premissas, encerramento_mensal_de, ponto_equilibrio, simular


def test_ponto_de_equilibrio_conferivel():
    r = ponto_equilibrio(9000, 16, 6, dias=26)
    assert r["unidades_mes"] == pytest.approx(900)
    assert r["unidades_dia"] == pytest.approx(900 / 26)
    assert r["faturamento_mes"] == pytest.approx(14400)


def test_preco_menor_que_custo_variavel_e_recusado():
    with pytest.raises(ValueError):
        ponto_equilibrio(9000, 6, 6)


def test_faixa_invalida_e_recusada():
    with pytest.raises(ValueError):
        Faixa(10, 5, 20)


def premissas(vol=(600, 1000, 1500)):
    return Premissas(Faixa(13, 16, 20), Faixa(5, 6, 7.5), Faixa(*vol), Faixa(7000, 9000, 12000), Faixa(60e3, 75e3, 95e3))


def test_mesma_semente_mesmo_resultado():
    a = simular(premissas(), 90000, seed=1)["resultados"]
    b = simular(premissas(), 90000, seed=1)["resultados"]
    assert [x["valor"] for x in a] == [x["valor"] for x in b]


def test_mais_vendas_melhora_resultado():
    r1 = {r["id"]: r["valor"] for r in simular(premissas((400, 600, 800)), 90000)["resultados"]}
    r2 = {r["id"]: r["valor"] for r in simular(premissas((1200, 1500, 1800)), 90000)["resultados"]}
    assert r2["MOD-04.lucro_p50"] > r1["MOD-04.lucro_p50"]
    assert r2["MOD-04.p_perda_capital"] <= r1["MOD-04.p_perda_capital"]


def test_probabilidades_validas_e_contrato():
    R = simular(premissas(), 90000)
    for r in R["resultados"]:
        assert {"id", "valor", "unidade", "tipo", "metodo", "n_base", "limitacoes"} <= set(r)
        if r["unidade"] == "probabilidade":
            assert 0 <= r["valor"] <= 1


def test_capital_obrigatorio():
    with pytest.raises(ValueError):
        simular(premissas(), 0)


def test_risco_do_setor_piora_resultado():
    base = {r["id"]: r["valor"] for r in simular(premissas(), 90000)["resultados"]}
    com = {r["id"]: r["valor"] for r in simular(premissas(), 90000, encerramento_mensal=encerramento_mensal_de(0.5, 24))["resultados"]}
    assert com["MOD-04.p_payback_24"] <= base["MOD-04.p_payback_24"]
    assert encerramento_mensal_de(0.5, 24) == pytest.approx(1 - 0.5 ** (1 / 24))
