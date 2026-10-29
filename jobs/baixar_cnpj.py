"""baixar_cnpj.py — Baixa os dados abertos do CNPJ da Receita Federal para um mês.

Grava em data/raw/cnpj/<mes>/. Pula arquivos que já existem com o mesmo tamanho.

O endereço do repositório da Receita muda de tempos em tempos. Se o download
falhar, baixe os zips pelo navegador em
https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9
e coloque-os na pasta acima (ou passe --base-url com o endereço novo).

Uso:
    python jobs/baixar_cnpj.py --mes 2026-10
    python jobs/baixar_cnpj.py --mes 2026-10 --apenas Estabelecimentos0.zip Simples.zip
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import ARQUIVOS_CNPJ, RAW  # noqa: E402

# A CONFIRMAR: estrutura WebDAV do compartilhamento público da Receita.
BASE_URL = "https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/{mes}/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) lab-product-launch"}


def baixar(url: str, destino: Path) -> None:
    import requests
    with requests.get(url, headers=HEADERS, stream=True, timeout=60) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        if destino.exists() and total and destino.stat().st_size == total:
            print(f"  já existe: {destino.name}")
            return
        tmp = destino.with_suffix(".parcial")
        feito = 0
        with open(tmp, "wb") as f:
            for bloco in r.iter_content(chunk_size=1 << 20):
                f.write(bloco)
                feito += len(bloco)
                if total:
                    print(f"\r  {destino.name}: {feito / total:5.1%}", end="")
        tmp.replace(destino)
        print(f"\r  {destino.name}: ok ({feito / 1e6:,.0f} MB)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mes", required=True, help="edição no formato AAAA-MM")
    ap.add_argument("--base-url", default=BASE_URL)
    ap.add_argument("--apenas", nargs="*", help="baixar só estes arquivos")
    a = ap.parse_args()

    pasta = RAW / "cnpj" / a.mes
    pasta.mkdir(parents=True, exist_ok=True)
    base = a.base_url.format(mes=a.mes)
    for nome in a.apenas or ARQUIVOS_CNPJ:
        try:
            baixar(base + nome, pasta / nome)
        except Exception as e:  # segue para o próximo arquivo
            print(f"  FALHOU {nome}: {e}")
    print(f"Arquivos em {pasta}")


if __name__ == "__main__":
    main()
