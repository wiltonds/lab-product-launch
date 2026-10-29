"""Motor de simulação Monte Carlo do Lab_Product_Launch (spec 001).

Princípio I da constituição: todo número sai daqui, nunca do LLM.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import numpy as np
import pandas as pd

MESES = 24
DIAS_MES = 26


# ---------------------------------------------------------------- premissas
@dataclass
class Premissa:
    """Uma premissa como faixa (FR-001)."""
    nome: str
    minimo: float
    provavel: float
    maximo: float
    fonte: str
    dist: str = "triangular"  # triangular | fixo

    def amostrar(self, rng: np.random.Generator, n: int) -> np.ndarray:
        if self.dist == "fixo" or self.minimo == self.maximo:
            return np.full(n, self.provavel, dtype=float)
        return rng.triangular(self.minimo, self.provavel, self.maximo, n)


@dataclass
class FichaIdeia:
    texto: str
    cnae: str
    municipio: str
    arquetipo: str  # fluxo | capacidade | b2b
    premissas: dict[str, Premissa]
    concorrentes: int = 0
    sobrevivencia_2a_setor: float | None = None  # da base de CNPJs
    cobertura_dados: float = 0.5  # 0 a 1: fração das premissas com dado real


# ---------------------------------------------------------------- arquétipos
def _rampa(meses_rampa: np.ndarray, inicio: np.ndarray) -> np.ndarray:
    """Demanda sai de `inicio` (fração) e chega a 100% em `meses_rampa` meses."""
    t = np.arange(MESES)[None, :]
    ini = inicio[:, None]
    return np.minimum(1.0, ini + (1 - ini) * t / meses_rampa[:, None])


def _receita_fluxo(a: dict, rng, n: int) -> tuple[np.ndarray, dict]:
    """Varejo de fluxo: demanda vem dos dados (FR-003)."""
    conc = a["_concorrentes"]
    # fatia ~ Beta com média 1/(conc+1); concentração 40 dá incerteza moderada
    media = 1.0 / (conc + 1)
    k = 40
    fatia = rng.beta(k * media, k * (1 - media), n)
    mercado = a["domicilios_raio"] * a["gasto_domicilio_mes"]
    receita_madura = mercado * fatia
    clientes_dia = receita_madura / (a["ticket"] * DIAS_MES)
    extra = {"fatia_mercado": fatia, "clientes_dia": clientes_dia}
    return receita_madura, extra


def _receita_capacidade(a: dict, rng, n: int) -> tuple[np.ndarray, dict]:
    """Serviço por capacidade (salão, clínica, oficina)."""
    atend_max = a["estacoes"] * a["atendimentos_estacao_dia"] * DIAS_MES
    receita_madura = atend_max * a["ocupacao"] * a["ticket"]
    return receita_madura, {}


def _receita_b2b(a: dict, rng, n: int) -> tuple[np.ndarray, dict]:
    """Serviço B2B recorrente (agência, consultoria): carteira em regime."""
    # carteira em regime = novos por mês / churn mensal, limitada pela equipe
    carteira = np.minimum(a["novos_clientes_mes"] / a["churn_mensal"],
                          a["capacidade_clientes"])
    receita_madura = carteira * a["mensalidade"]
    return receita_madura, {"carteira": carteira}


ARQUETIPOS = {
    "fluxo": _receita_fluxo,
    "capacidade": _receita_capacidade,
    "b2b": _receita_b2b,
}


# ---------------------------------------------------------------- simulação
@dataclass
class Resultado:
    metricas: dict
    decisao: str
    sensibilidade: pd.Series
    alertas: list[str]
    confianca: str
    amostras: dict = field(repr=False, default_factory=dict)
    caixa: np.ndarray = field(repr=False, default=None)


LIMIARES = {"go_payback": 0.60, "go_caixa": 0.20,
            "kill_payback": 0.30, "kill_caixa": 0.50}


def simular(ficha: FichaIdeia, n: int = 10_000, seed: int = 42,
            limiares: dict = LIMIARES) -> Resultado:
    rng = np.random.default_rng(seed)
    a = {k: p.amostrar(rng, n) for k, p in ficha.premissas.items()}
    a["_concorrentes"] = ficha.concorrentes

    receita_madura, extra = ARQUETIPOS[ficha.arquetipo](a, rng, n)
    inicio = a.get("rampa_inicio", np.full(n, 0.5))
    receita = receita_madura[:, None] * _rampa(a["meses_rampa"], inicio)
    lucro = receita * a["margem_bruta"][:, None] - a["custo_fixo_mes"][:, None]
    caixa = -a["investimento"][:, None] + np.cumsum(lucro, axis=1)

    positivo = caixa > 0
    payback = np.where(positivo.any(1), positivo.argmax(1) + 1, 99)
    # caixa acaba: perda acumulada passa do investimento + reserva
    quebra = (caixa < -(a["investimento"] + a["reserva_caixa"])[:, None]).any(1)

    lucro_maduro = lucro[:, -1]
    m = {
        "lucro_mensal_p10": float(np.percentile(lucro_maduro, 10)),
        "lucro_mensal_p50": float(np.percentile(lucro_maduro, 50)),
        "lucro_mensal_p90": float(np.percentile(lucro_maduro, 90)),
        "p_payback_12m": float((payback <= 12).mean()),
        "p_payback_24m": float((payback <= 24).mean()),
        "p_caixa_acabar": float(quebra.mean()),
        "caixa_esperado_m24": float(caixa[:, -1].mean()),
        "receita_mensal_p50": float(np.percentile(receita_madura, 50)),
    }
    if "clientes_dia" in extra:
        m["clientes_dia_p50"] = float(np.percentile(extra["clientes_dia"], 50))

    # decisão (FR-007)
    if m["p_payback_24m"] >= limiares["go_payback"] and \
       m["p_caixa_acabar"] <= limiares["go_caixa"]:
        decisao = "GO"
    elif m["p_payback_24m"] < limiares["kill_payback"] or \
         m["p_caixa_acabar"] > limiares["kill_caixa"]:
        decisao = "KILL"
    else:
        decisao = "PIVOT"

    # sensibilidade (FR-006): correlação de postos com o caixa do mês 24
    alvo = pd.Series(caixa[:, -1]).rank()
    sens = {}
    variaveis = {k: v for k, v in a.items()
                 if not k.startswith("_") and np.ptp(v) > 0}
    variaveis.update({k: v for k, v in extra.items() if k == "fatia_mercado"})
    for k, v in variaveis.items():
        sens[k] = float(pd.Series(v).rank().corr(alvo))
    sens = pd.Series(sens).sort_values(key=np.abs, ascending=False)

    # checagem com a história (FR-008)
    alertas = []
    s = ficha.sobrevivencia_2a_setor
    if s is not None and m["p_payback_24m"] - s > 0.25:
        alertas.append(
            f"O plano está mais otimista que a história: {m['p_payback_24m']:.0%} "
            f"de chance de se pagar em 2 anos, mas só {s:.0%} dos negócios do "
            f"setor na região passam de 2 anos abertos.")

    conf = ("alta" if ficha.cobertura_dados >= 0.7 else
            "média" if ficha.cobertura_dados >= 0.4 else "baixa")

    return Resultado(m, decisao, sens, alertas, conf,
                     amostras={**a, **extra}, caixa=caixa)


def para_llm(ficha: FichaIdeia, r: Resultado) -> dict:
    """JSON entregue ao LLM para redigir a explicação (FR-009)."""
    return {
        "ideia": ficha.texto,
        "cnae": ficha.cnae,
        "municipio": ficha.municipio,
        "arquetipo": ficha.arquetipo,
        "decisao": r.decisao,
        "metricas": {k: round(v, 3) for k, v in r.metricas.items()},
        "o_que_mais_pesa": r.sensibilidade.head(3).round(2).to_dict(),
        "alertas": r.alertas,
        "confianca": r.confianca,
        "fontes": {k: p.fonte for k, p in ficha.premissas.items()},
        "instrucao": ("Explique em português simples, sem jargão. Não altere "
                      "nenhum número. Mostre faixas, não um número só."),
    }


# ---------------------------------------------------------------- sobrevivência
def kaplan_meier(df: pd.DataFrame, col_inicio="data_inicio_atividade",
                 col_fim="data_fim", ref="2026-10-01") -> pd.DataFrame:
    """Curva de sobrevivência a partir da base de CNPJs.

    df: um estabelecimento por linha; `data_fim` = data da baixa/inaptidão
    (NaT se ativo). Retorna a sobrevivência S(t) por mês.
    """
    ref = pd.Timestamp(ref)
    ini = pd.to_datetime(df[col_inicio])
    fim = pd.to_datetime(df[col_fim])
    evento = fim.notna()
    dur = ((fim.fillna(ref) - ini).dt.days / 30.44).clip(lower=0)
    tabela = pd.DataFrame({"t": np.ceil(dur).astype(int), "e": evento})
    s, linhas = 1.0, []
    em_risco = len(tabela)
    for t, g in tabela.groupby("t"):
        d = int(g["e"].sum())
        if em_risco > 0:
            s *= 1 - d / em_risco
        linhas.append((t, s, em_risco))
        em_risco -= len(g)
    return pd.DataFrame(linhas, columns=["mes", "sobrevivencia", "em_risco"])


def sobrevivencia_em(curva: pd.DataFrame, mes: int) -> float:
    sub = curva[curva["mes"] <= mes]
    return float(sub["sobrevivencia"].iloc[-1]) if len(sub) else 1.0
