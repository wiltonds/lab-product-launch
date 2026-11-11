"""API sobre os agregados SINTÉTICOS de lab/demo.py (cidades inventadas, só para validar o contrato)."""
import pytest
from fastapi.testclient import TestClient

import api.main as m
from lab.demo import CIDADES, agregados

REAL_DADOS = m.dados  # versão com cache, antes do fixture trocar
CODIGOS = {f"270000{i}": nome for i, nome in enumerate(CIDADES)}


@pytest.fixture(scope="module")
def cliente():
    d = agregados()
    d["populacao"] = d["populacao"].assign(cod_ibge=list(CODIGOS))
    d["meta"]["fontes"] = {"cnpj": "CNPJ demo", "populacao": "IBGE demo"}
    pronto = m.preparar(d)
    m.dados.cache_clear()
    original = m.dados
    m.dados = lambda: pronto  # noqa: E731
    yield TestClient(m.app)
    m.dados = original


def _sinais(cliente, cod, ativ="lanchonete"):
    r = cliente.get("/v1/insights", params={"municipio": cod, "atividade": ativ})
    assert r.status_code == 200, r.text
    return r.json()


def test_contrato(cliente):
    j = _sinais(cliente, "2700000")
    assert set(j) == {"municipalityCode", "activityId", "modelVersion", "generatedAt", "signals", "limitations"}
    s = {x["id"]: x for x in j["signals"]}
    assert set(s) == {"concorrencia", "sobrevivencia", "demanda"}
    for x in s.values():
        assert x["verdict"] in {"favoravel", "atencao", "risco", "neutro"}
        assert x["confidence"] in {"OBSERVADO", "ESTIMADO"} and x["source"] and x["headline"]


def test_sobrevivencia_com_faixa(cliente):
    s = next(x for x in _sinais(cliente, "2700000")["signals"] if x["id"] == "sobrevivencia")
    assert "seguem abertos após 2 anos" in s["headline"]
    assert "Faixa provável entre" in s["detail"] and s["sampleSize"] >= 30


def test_amostra_respeita_minimo(cliente):
    # todo resultado de sobrevivência mostrado tem pelo menos N_MIN_COORTE negócios na base
    s = next(x for x in _sinais(cliente, "2700005", "barbearia")["signals"] if x["id"] == "sobrevivencia")
    assert s["sampleSize"] >= 30


def test_atividade_sem_dados_no_demo(cliente):
    # oficina (4520001) não existe nos dados demo: responde sem inventar número
    j = _sinais(cliente, "2700000", "oficina")
    con = next(x for x in j["signals"] if x["id"] == "concorrencia")
    assert con["headline"].startswith("Nenhum CNPJ ativo") and con["verdict"] == "neutro"


def test_erros(cliente):
    assert cliente.get("/v1/insights", params={"municipio": "2700000", "atividade": "foguete"}).status_code == 404
    assert cliente.get("/v1/insights", params={"municipio": "3550308", "atividade": "lanchonete"}).status_code == 404


def test_sem_publicado_responde_503(tmp_path, monkeypatch):
    monkeypatch.setattr(m, "PUB", tmp_path)
    with pytest.raises(m.HTTPException) as e:
        REAL_DADOS.__wrapped__()
    assert e.value.status_code == 503
