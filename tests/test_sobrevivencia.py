import pandas as pd
import pytest
from lab.sobrevivencia import curva_km, sobrevivencia_em, tabela_vida, avaliar_coorte


def exemplo_guia():
    # as 10 sorveterias do guia: (meses, fechou?)
    casos = [(3, 1), (6, 1), (6, 1), (10, 0), (14, 1), (18, 0), (22, 1), (30, 0), (36, 0), (36, 0)]
    return pd.DataFrame({"t": [c[0] for c in casos], "d": [c[1] for c in casos], "c": [1 - c[1] for c in casos]})


def test_km_bate_com_o_calculo_a_mao():
    c = curva_km(exemplo_guia())
    assert sobrevivencia_em(c, 4)["S"] == pytest.approx(0.9)
    assert sobrevivencia_em(c, 7)["S"] == pytest.approx(0.7)
    assert sobrevivencia_em(c, 24)["S"] == pytest.approx(0.4375)


def test_intervalo_contem_estimativa():
    c = curva_km(exemplo_guia())
    assert ((c["ic_inf"] <= c["S"] + 1e-12) & (c["S"] <= c["ic_sup"] + 1e-12)).all()
    assert c["ic_inf"].between(0, 1).all() and c["ic_sup"].between(0, 1).all()


def test_tabela_vida_censura_e_eventos():
    est = pd.DataFrame({
        "municipio": "X", "cnae_principal": "1", "situacao": [2, 8, 4, 8],
        "data_inicio": pd.to_datetime(["2020-01-01"] * 4),
        "data_situacao": pd.to_datetime([None, "2021-01-01", "2020-07-01", "2027-01-01"]),
    })
    tv = tabela_vida(est, "2024-01-01", "baixada")
    assert tv["d"].sum() == 1          # só a baixada antes da referência
    assert tv["c"].sum() == 3          # ativa, inapta (definição estrita) e baixa futura
    tv2 = tabela_vida(est, "2024-01-01", "baixada_ou_inapta")
    assert tv2["d"].sum() == 2


def test_coorte_pequena_e_horizonte_incompleto_sao_sinalizados():
    est = pd.DataFrame({"municipio": "X", "cnae_principal": "1", "situacao": [2] * 5,
                        "data_inicio": pd.to_datetime(["2025-03-01"] * 5), "data_situacao": pd.NaT})
    tv = tabela_vida(est, "2026-01-01")
    r = avaliar_coorte(tv, 2025, "2026-01-01")
    assert r["situacao"] == "insuficiente"
    assert r["resultados"][24]["valido"] is False
    assert r["resultados"][24]["motivo"] == "horizonte incompleto"
