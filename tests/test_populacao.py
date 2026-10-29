import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "jobs"))
from coletar_populacao import parse_sidra


def test_parse_sidra():
    dados = [{"D1C": "Município (Código)", "D1N": "Município", "D2N": "Variável", "D3N": "Ano", "V": "Valor"},
             {"D1C": "2704302", "D1N": "Maceió - AL", "D2N": "População residente estimada", "D3N": "2025", "V": "1000"}]
    df = parse_sidra(dados)
    assert df.iloc[0]["municipio"] == "Maceió"
    assert df.iloc[0]["cod_ibge"] == "2704302"
    assert df.iloc[0]["populacao"] == 1000
