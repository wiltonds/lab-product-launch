"""compactar_publicado.py — Regrava as tabelas grandes de data/publicado/ no formato compacto.

Uso único para a edição já publicada; as próximas já saem compactas de publicar_brasil.py.
    python jobs/compactar_publicado.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.compacto import GRANDES, compactar  # noqa: E402
from lab.config import PUB  # noqa: E402

for nome in GRANDES:
    arq = PUB / f"{nome}.parquet"
    t = compactar(pd.read_parquet(arq), nome)
    t.to_parquet(arq, index=False, compression="zstd")
    print(f"{nome}: {len(t):,} linhas, {arq.stat().st_size / 1e6:.1f} MB")
