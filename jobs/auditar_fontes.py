"""auditar_fontes.py — Etapa A da spec 000: relatório de qualidade e cobertura.

Lê data/processed/<mes>/ e grava data/auditoria/auditoria_<mes>.md com:
contagem por situação cadastral, campos vazios, datas inválidas, ligação de
municípios Receita → IBGE, cobertura por município e CNAE, e a diferença entre
empresas e estabelecimentos.

Uso:
    python jobs/auditar_fontes.py --mes 2026-10
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import AUDIT, N_MIN_COORTE, PROC, SITUACOES  # noqa: E402
from lab.indicadores import anexar_municipio  # noqa: E402


def auditar(est: pd.DataFrame, mes: str, muni: pd.DataFrame | None, pop: pd.DataFrame | None) -> str:
    L = [f"# Auditoria da base CNPJ — Alagoas, edição {mes}", ""]
    L += [f"- Estabelecimentos: {len(est):,}", f"- Empresas (CNPJ básico distinto): {est['cnpj_basico'].nunique():,}",
          f"- Filiais: {int((est['matriz_filial'] == 2).sum()):,}", ""]
    L += ["## Situação cadastral", "", "| Situação | Estabelecimentos | % |", "| --- | --- | --- |"]
    vc = est["situacao"].value_counts()
    for k, v in vc.items():
        L.append(f"| {SITUACOES.get(int(k), k)} ({k}) | {v:,} | {v / len(est):.1%} |")
    L += ["", "## Qualidade dos campos", "", "| Checagem | Ocorrências |", "| --- | --- |"]
    ref = pd.Timestamp(f"{mes}-28")
    checks = {
        "data de início ausente ou inválida": est["data_inicio"].isna().sum(),
        "data de início no futuro": (est["data_inicio"] > ref).sum(),
        "data da situação anterior à abertura": (est["data_situacao"] < est["data_inicio"]).sum(),
        "baixada sem data da situação": ((est["situacao"] == 8) & est["data_situacao"].isna()).sum(),
        "CNAE principal vazio": (est["cnae_principal"].str.strip("0") == "").sum(),
        "CEP vazio": (est["cep"].str.strip() == "").sum(),
    }
    for k, v in checks.items():
        L.append(f"| {k} | {int(v):,} |")
    if muni is not None:
        e = anexar_municipio(est, muni, pop)
        sem = e["municipio"].isna().sum()
        L += ["", "## Municípios", "", f"- Municípios distintos: {e['municipio'].nunique()}",
              f"- Estabelecimentos sem município identificado: {int(sem):,}"]
        if pop is not None:
            sem_ibge = e["cod_ibge"].isna().sum()
            L.append(f"- Estabelecimentos sem código IBGE após ligação por nome: {int(sem_ibge):,}")
            faltam = sorted(set(e.loc[e['cod_ibge'].isna(), 'municipio'].dropna()))[:20]
            if faltam:
                L.append(f"- Nomes sem par no IBGE (até 20): {', '.join(faltam)}")
        cob = e.assign(ano=e["data_inicio"].dt.year).groupby(["municipio", "cnae_principal", "ano"]).size()
        L += ["", "## Cobertura para coortes", "",
              f"- Combinações município × CNAE × ano de abertura: {len(cob):,}",
              f"- Com pelo menos {N_MIN_COORTE} aberturas (coorte utilizável): {int((cob >= N_MIN_COORTE).sum()):,}"]
    L += ["", "## Limitações conhecidas", "",
          "- CNAE declarado pode não ser a atividade real.",
          "- Empresas fechadas de fato podem seguir 'ativas' sem baixa formal.",
          "- Inapta não é fechamento: pode voltar a ativa.",
          "- Negócios informais não aparecem."]
    return "\n".join(L) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mes", required=True)
    a = ap.parse_args()
    d = PROC / a.mes
    est = pd.read_parquet(d / "estabelecimentos.parquet")
    muni = pd.read_parquet(d / "municipios.parquet") if (d / "municipios.parquet").exists() else None
    pop = pd.read_parquet(PROC / "populacao.parquet") if (PROC / "populacao.parquet").exists() else None
    AUDIT.mkdir(parents=True, exist_ok=True)
    saida = AUDIT / f"auditoria_{a.mes}.md"
    saida.write_text(auditar(est, a.mes, muni, pop), encoding="utf-8")
    print(f"Relatório em {saida}")


if __name__ == "__main__":
    main()
