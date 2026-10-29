"""extrair_al.py — Recorta os zips do CNPJ para Alagoas e grava Parquet.

Lê data/raw/cnpj/<mes>/ e grava em data/processed/<mes>/:
    estabelecimentos.parquet   todos os estabelecimentos de AL, em TODAS as
                               situações (ativa, suspensa, inapta, baixada),
                               sem contatos nem endereço completo
    empresas.parquet           natureza jurídica, capital social e porte
                               (sem razão social: no empresário individual ela traz CPF)
    simples.parquet            opção pelo Simples e pelo MEI, com datas
    municipios.parquet         código da Receita -> nome
    cnaes.parquet              código CNAE -> descrição

Uso:
    python jobs/extrair_al.py --mes 2026-10
    python jobs/extrair_al.py --mes 2026-10 --pasta "D:/downloads/cnpj"
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab import receita  # noqa: E402
from lab.config import PROC, RAW, UF  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mes", required=True)
    ap.add_argument("--pasta", help="pasta com os zips (padrão: data/raw/cnpj/<mes>)")
    a = ap.parse_args()

    origem = Path(a.pasta) if a.pasta else RAW / "cnpj" / a.mes
    destino = PROC / a.mes
    destino.mkdir(parents=True, exist_ok=True)

    est_zips = sorted(origem.glob("Estabelecimentos*.zip"))
    if not est_zips:
        sys.exit(f"Nenhum Estabelecimentos*.zip em {origem}. Rode jobs/baixar_cnpj.py antes.")
    print(f"Lendo {len(est_zips)} arquivos de estabelecimentos...")
    est = receita.ler_estabelecimentos(est_zips, UF)
    est["edicao"] = a.mes
    est.to_parquet(destino / "estabelecimentos.parquet", index=False)
    print(f"  {len(est):,} estabelecimentos de {UF}")

    cnpjs = set(est["cnpj_basico"])
    emp_zips = sorted(origem.glob("Empresas*.zip"))
    if emp_zips:
        receita.ler_empresas(emp_zips, cnpjs).to_parquet(destino / "empresas.parquet", index=False)
    if (origem / "Simples.zip").exists():
        receita.ler_simples(origem / "Simples.zip", cnpjs).to_parquet(destino / "simples.parquet", index=False)
    if (origem / "Municipios.zip").exists():
        receita.ler_tabela_codigos(origem / "Municipios.zip").to_parquet(destino / "municipios.parquet", index=False)
    if (origem / "Cnaes.zip").exists():
        receita.ler_tabela_codigos(origem / "Cnaes.zip").to_parquet(destino / "cnaes.parquet", index=False)
    print(f"Gravado em {destino}")


if __name__ == "__main__":
    main()
