"""API sobre agregados SINTÉTICOS do Brasil (lab/demo.py: cidades inventadas, só para validar o contrato)."""
import json

import pytest
from fastapi.testclient import TestClient

import api.main as m
from lab.demo import REF, brasil_sintetico
from lab.publicacao import montar

REAL_DADOS = m.dados  # versão com cache, antes do fixture trocar


@pytest.fixture(scope="module")
def cliente(tmp_path_factory):
    pasta = tmp_path_factory.mktemp("estab")
    rec, pop, pib = brasil_sintetico(pasta)
    r = montar(pasta, rec, pop, pib, ref=REF, log=lambda *_: None)
    d = {k: r[k] for k in m.TABELAS}
    d["cnaes"] = None
    co = r["_coortes"].iloc[0]
    d["meta"] = {"formato": 2, "edicao": "demo", "data_referencia": str(REF.date()), "gerado_em": "hoje",
                 "coortes_sobrevivencia": [int(co["primeira"]), int(co["ultima"])],
                 "fontes": {"cnpj": "CNPJ demo", "populacao": "IBGE demo", "pib": "PIB demo"}}
    pronto = m.preparar(d)
    original = m.dados
    m.dados = lambda: pronto  # noqa: E731
    yield TestClient(m.app)
    m.dados = original


def _sinais(cliente, cod, ativ="lanchonete"):
    r = cliente.get("/v1/insights", params={"municipio": cod, "atividade": ativ})
    assert r.status_code == 200, r.text
    return {x["id"]: x for x in r.json()["signals"]}, r.json()


def test_contrato(cliente):
    s, j = _sinais(cliente, "2700000")
    assert set(j) == {"municipalityCode", "activityId", "modelVersion", "generatedAt", "signals", "marketScore", "opportunities", "limitations"}
    assert set(s) == {"concorrencia", "espaco", "sobrevivencia", "demanda"}
    for x in s.values():
        assert x["verdict"] in {"favoravel", "atencao", "risco", "neutro"}
        assert x["confidence"] in {"OBSERVADO", "ESTIMADO"} and x["source"] and x["headline"]
    assert any("informais" in t for t in j["limitations"])
    assert any("falência" in t for t in j["limitations"])


def test_compara_com_a_uf_certa(cliente):
    s, _ = _sinais(cliente, "3500003")
    assert "São Paulo" in s["concorrencia"]["comparison"]
    s, _ = _sinais(cliente, "4100003")
    assert "Paraná" in s["sobrevivencia"]["comparison"]


def test_espaco_no_mercado(cliente):
    s, _ = _sinais(cliente, "2700005")
    e = s["espaco"]
    assert e["confidence"] == "ESTIMADO"
    assert "uma cidade parecida teria cerca de" in e["headline"]
    assert e["comparison"].startswith("Faixa normal para")


def test_sobrevivencia_com_faixa(cliente):
    s, _ = _sinais(cliente, "2700000")
    x = s["sobrevivencia"]
    assert "seguem abertos após 2 anos" in x["headline"]
    assert "Faixa provável entre" in x["detail"]


def test_atividade_sem_dados(cliente):
    # oficina (4520001) não existe nos dados demo: responde sem inventar número
    s, _ = _sinais(cliente, "2700000", "oficina")
    assert s["concorrencia"]["headline"].startswith("Nenhum CNPJ ativo") and s["concorrencia"]["verdict"] == "neutro"
    assert s["espaco"]["headline"] == "Ainda sem modelo para esse ramo"


def test_busca_de_cidade(cliente):
    r = cliente.get("/v1/municipios", params={"busca": "cidade sp"})
    assert r.status_code == 200
    assert r.json() and all(x["uf"] == "SP" for x in r.json())


def test_erros(cliente):
    assert cliente.get("/v1/insights", params={"municipio": "2700000", "atividade": "foguete"}).status_code == 404
    assert cliente.get("/v1/insights", params={"municipio": "9999999", "atividade": "lanchonete"}).status_code == 404


def test_sem_publicado_responde_503(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "PUB", tmp_path)
    with pytest.raises(m.HTTPException) as e:
        REAL_DADOS.__wrapped__()
    assert e.value.status_code == 503


def test_formato_antigo_responde_503(tmp_path, monkeypatch):
    (tmp_path / "meta.json").write_text(json.dumps({"uf": "AL"}), encoding="utf-8")
    monkeypatch.setattr(m, "PUB", tmp_path)
    with pytest.raises(m.HTTPException) as e:
        REAL_DADOS.__wrapped__()
    assert e.value.status_code == 503


def test_notas_do_indice(cliente):
    _, j = _sinais(cliente, "2700005")
    n = j["marketScore"]
    assert set(n) == {"market", "survival"}
    assert all(v is None or 0 <= v <= 100 for v in n.values())
    _, j = _sinais(cliente, "2700005", "oficina")
    assert j["marketScore"]["market"] is None   # sem dados não vira nota


def test_onde_tem_espaco(cliente):
    _, j = _sinais(cliente, "2700005")
    o = j["opportunities"]
    assert set(o) == {"cities", "activities"}
    for c in o["cities"]:
        assert c["uf"] == "AL" and c["code"] != "2700005"
