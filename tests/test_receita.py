import io
import zipfile
import pandas as pd
from lab import receita
from lab.config import COLS_ESTAB


def linha(**kw):
    base = {c: "" for c in COLS_ESTAB}
    base.update(kw)
    return ";".join(f'"{base[c]}"' for c in COLS_ESTAB)


def test_le_estabelecimentos_da_uf_em_todas_as_situacoes(tmp_path):
    linhas = [
        linha(cnpj_basico="11111111", cnpj_ordem="0001", matriz_filial="1", situacao="02", data_inicio="20200115",
              data_situacao="20200115", cnae_principal="5611203", uf="AL", municipio_receita="2785", email="a@b.com"),
        linha(cnpj_basico="22222222", cnpj_ordem="0001", matriz_filial="1", situacao="08", data_inicio="20190101",
              data_situacao="20220301", cnae_principal="5611203", uf="AL", municipio_receita="2785"),
        linha(cnpj_basico="33333333", cnpj_ordem="0001", matriz_filial="1", situacao="02", data_inicio="0",
              data_situacao="0", cnae_principal="5611203", uf="PE", municipio_receita="2531"),
    ]
    z = tmp_path / "Estabelecimentos0.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("K3241.ESTABELE", ("\n".join(linhas) + "\n").encode("latin-1"))
    df = receita.ler_estabelecimentos([z], "AL")
    assert len(df) == 2
    assert set(df["situacao"]) == {2, 8}
    assert "email" not in df.columns
    assert df.loc[df["situacao"] == 8, "data_situacao"].iloc[0] == pd.Timestamp("2022-03-01")


def test_data_invalida_vira_nat():
    s = receita.data_receita(pd.Series(["0", "", "20201301", "20200101"]))
    assert s.isna().tolist() == [True, True, True, False]


def test_normalizar_nome():
    assert receita.normalizar_nome("São Miguel dos Campos") == receita.normalizar_nome("SAO MIGUEL DOS CAMPOS")
    assert receita.normalizar_nome("Olho d'Água das Flores") == "OLHO D AGUA DAS FLORES"
