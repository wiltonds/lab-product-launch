"""MOD-03 ponto de equilíbrio e MOD-04 Monte Carlo financeiro (spec 000, RF-05).

Toda premissa é uma Faixa com origem declarada. Os resultados saem no formato
do contrato com o LLM: valor, unidade, tipo, método, n, limitações.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

DIAS_MES = 26


@dataclass
class Faixa:
    minimo: float
    provavel: float
    maximo: float
    origem: str = "hipótese do usuário"

    def __post_init__(self):
        if not (self.minimo <= self.provavel <= self.maximo):
            raise ValueError(f"Faixa inválida: mínimo ≤ provável ≤ máximo ({self.minimo}, {self.provavel}, {self.maximo})")

    def sortear(self, rng: np.random.Generator, n: int) -> np.ndarray:
        if self.minimo == self.maximo:
            return np.full(n, float(self.provavel))
        return rng.triangular(self.minimo, self.provavel, self.maximo, n)


def ponto_equilibrio(custo_fixo: float, preco: float, custo_variavel: float, dias: int = DIAS_MES) -> dict:
    """Q = custo fixo ÷ (preço − custo variável). Conferível à mão."""
    margem = preco - custo_variavel
    if margem <= 0:
        raise ValueError("O preço precisa ser maior que o custo variável; sem isso não existe ponto de equilíbrio.")
    q = custo_fixo / margem
    return {"margem_unitaria": margem, "unidades_mes": q, "unidades_dia": q / dias,
            "faturamento_mes": q * preco, "metodo": "custo fixo ÷ (preço − custo variável)"}


@dataclass
class Premissas:
    preco: Faixa
    custo_variavel: Faixa
    volume_mes: Faixa            # unidades por mês depois de maturar
    custo_fixo: Faixa
    investimento: Faixa
    meses_maturacao: Faixa = field(default_factory=lambda: Faixa(3, 6, 9, "referência genérica"))
    volume_inicial: float = 0.4  # fração do volume maduro no mês 1


def simular(p: Premissas, capital_disponivel: float, meses: int = 24, n: int = 10_000,
            seed: int = 42, encerramento_mensal: float | None = None) -> dict:
    """Simula n versões do negócio por `meses`.

    encerramento_mensal: chance mensal de o negócio fechar, vinda da sobrevivência
    do setor (MOD-01). Se fechar, a receita e os custos param naquele mês.
    """
    if capital_disponivel <= 0:
        raise ValueError("Informe o capital disponível: é ele que define a perda de capital.")
    rng = np.random.default_rng(seed)
    a = {k: getattr(p, k).sortear(rng, n) for k in ("preco", "custo_variavel", "volume_mes", "custo_fixo", "investimento", "meses_maturacao")}
    margem = np.maximum(a["preco"] - a["custo_variavel"], 0)
    t = np.arange(meses)[None, :]
    rampa = np.minimum(1.0, p.volume_inicial + (1 - p.volume_inicial) * t / a["meses_maturacao"][:, None])
    lucro = a["volume_mes"][:, None] * rampa * margem[:, None] - a["custo_fixo"][:, None]
    if encerramento_mensal:
        fecha = rng.geometric(encerramento_mensal, n)  # opera os meses 1..fecha e depois fecha
        ativo = t < fecha[:, None]
        lucro = np.where(ativo, lucro, 0.0)
    caixa = -a["investimento"][:, None] + np.cumsum(lucro, axis=1)
    pos = caixa > 0
    payback = np.where(pos.any(1), pos.argmax(1) + 1, np.nan)
    perda = (caixa < -capital_disponivel).any(1)
    lm = lucro[:, -1]

    def item(id_, nome, valor, unidade, metodo, lim=None):
        return {"id": id_, "nome": nome, "valor": float(valor), "unidade": unidade,
                "tipo": "estimado sobre hipóteses", "metodo": metodo, "n_base": n,
                "limitacoes": lim or ["premissas informadas pelo usuário"]}

    m = f"Monte Carlo, {n:,} cenários, {meses} meses, semente {seed}".replace(",", ".")
    res = [
        item("MOD-04.lucro_p10", "Lucro mensal maduro, cenário pessimista (p10)", np.percentile(lm, 10), "R$/mês", m),
        item("MOD-04.lucro_p50", "Lucro mensal maduro, cenário provável (p50)", np.percentile(lm, 50), "R$/mês", m),
        item("MOD-04.lucro_p90", "Lucro mensal maduro, cenário otimista (p90)", np.percentile(lm, 90), "R$/mês", m),
        item("MOD-04.p_caixa_negativo", f"Chance de o caixa acumulado estar negativo no mês {meses}", (caixa[:, -1] < 0).mean(), "probabilidade", m),
        item("MOD-04.p_perda_capital", "Chance de perder todo o capital disponível em algum mês", perda.mean(), "probabilidade", m,
             ["premissas informadas pelo usuário", "perda de capital = caixa acumulado abaixo de −capital disponível"]),
        item("MOD-04.p_payback_12", "Chance de recuperar o investimento em até 12 meses", np.mean(payback <= 12), "probabilidade", m),
        item("MOD-04.p_payback_24", f"Chance de recuperar o investimento em até {meses} meses", np.mean(payback <= meses), "probabilidade", m),
    ]
    alvo = pd.Series(caixa[:, -1]).rank()
    sens = {k: float(pd.Series(v).rank().corr(alvo)) for k, v in a.items() if np.ptp(v) > 0}
    sens = dict(sorted(sens.items(), key=lambda kv: -abs(kv[1])))
    return {"resultados": res, "sensibilidade": sens, "caixa": caixa, "lucro_maduro": lm,
            "parametros": {"meses": meses, "n": n, "seed": seed, "capital_disponivel": capital_disponivel,
                           "encerramento_mensal": encerramento_mensal}}


def encerramento_mensal_de(S: float, meses: int) -> float:
    """Converte sobrevivência S em `meses` numa chance mensal constante de fechar."""
    S = min(max(S, 1e-6), 1.0)
    return 1 - S ** (1 / meses)
