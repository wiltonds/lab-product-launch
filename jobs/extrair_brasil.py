"""extrair_brasil.py — Separa a base do CNPJ por UF (Brasil inteiro) em Parquet.

Lê data/raw/cnpj/<mes>/Estabelecimentos*.zip em blocos e grava
data/processed/<mes>/estab/uf=XX.parquet (só situação, datas, CNAE e município:
nada de nome, endereço ou contato). Copia também Municipios e Cnaes.

Uso:
    python jobs/extrair_brasil.py --mes 2026-10
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab import receita  # noqa: E402
from lab.brasil import particionar  # noqa: E402
from lab.config import PROC, RAW  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mes", required=True)
    ap.add_argument("--pasta", help="pasta com os zips (padrão: data/raw/cnpj/<mes>)")
    a = ap.parse_args()
    origem = Path(a.pasta) if a.pasta else RAW / "cnpj" / a.mes
    destino = PROC / a.mes
    zips = sorted(origem.glob("Estabelecimentos*.zip"))
    if not zips:
        sys.exit(f"Nenhum Estabelecimentos*.zip em {origem}.")
    cont = particionar(zips, destino / "estab")
    print(f"{sum(cont.values()):,} estabelecimentos em {len(cont)} UFs")
    for uf, n in sorted(cont.items(), key=lambda x: -x[1]):
        print(f"  {uf}: {n:,}")
    for nome in ("Municipios", "Cnaes"):
        z = origem / f"{nome}.zip"
        if z.exists():
            receita.ler_tabela_codigos(z).to_parquet(destino / f"{nome.lower()}.parquet", index=False)


if __name__ == "__main__":
    main()
