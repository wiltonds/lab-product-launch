"""publicar_agregados.py — Gera os agregados sem identificação que o app lê.

Lê data/processed/<mes>/ e grava data/publicado/:
    ativos.parquet         IND-01 por município × CNAE
    fluxo.parquet          IND-02/03/05 por município × CNAE × ano
    vida.parquet           tabela de vida (coorte × mês: eventos e censuras), duas definições de evento
    populacao.parquet      IND-10
    cnaes.parquet          códigos e descrições
    meta.json              edição, data de referência, fontes e versão

Nada aqui identifica empresa ou pessoa: são contagens.

Uso:
    python jobs/publicar_agregados.py --mes 2026-10
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab import indicadores as ind  # noqa: E402
from lab.config import PROC, PUB, UF  # noqa: E402
from lab.sobrevivencia import tabela_vida  # noqa: E402

VERSAO = "0.1.0"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mes", required=True)
    a = ap.parse_args()
    d = PROC / a.mes
    est = pd.read_parquet(d / "estabelecimentos.parquet")
    pop = pd.read_parquet(PROC / "populacao.parquet") if (PROC / "populacao.parquet").exists() else None
    est = ind.anexar_municipio(est, pd.read_parquet(d / "municipios.parquet"), pop)
    ref = est["data_situacao"].dropna().max()  # última movimentação registrada na edição

    PUB.mkdir(parents=True, exist_ok=True)
    ind.ativos(est).to_parquet(PUB / "ativos.parquet", index=False)
    ind.fluxo_anual(est).to_parquet(PUB / "fluxo.parquet", index=False)
    vida = pd.concat([tabela_vida(est, ref, "baixada").assign(evento="baixada"),
                      tabela_vida(est, ref, "baixada_ou_inapta").assign(evento="baixada_ou_inapta")])
    vida.to_parquet(PUB / "vida.parquet", index=False)
    if pop is not None:
        pop.to_parquet(PUB / "populacao.parquet", index=False)
    if (d / "cnaes.parquet").exists():
        pd.read_parquet(d / "cnaes.parquet").to_parquet(PUB / "cnaes.parquet", index=False)
    meta = {"uf": UF, "edicao": a.mes, "data_referencia": str(ref.date()), "gerado_em": str(date.today()),
            "versao": VERSAO, "fontes": {
                "cnpj": "Receita Federal, dados abertos do CNPJ (Estabelecimentos, Municípios, CNAEs)",
                "populacao": "IBGE/SIDRA, tabela 6579 (população estimada)"}}
    (PUB / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Agregados publicados em {PUB} (referência {ref.date()})")


if __name__ == "__main__":
    main()
