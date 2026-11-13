"""publicar_brasil.py — Agregados do Brasil inteiro para o app (formato 2).

Lê data/processed/<mes>/estab/uf=XX.parquet, municipios.parquet e cnaes.parquet,
data/processed/populacao.parquet e (opcional) data/processed/pib.parquet.

Grava data/publicado/:
    municipios.parquet        código IBGE, nome, UF, região, população, PIB per capita
    ativos.parquet            estabelecimentos ativos por município × CNAE
    movimento.parquet         aberturas e fechamentos nos últimos 36 meses
    sobrevivencia.parquet     sobrevivência em 24 meses com Bayes empírico (MOD-02)
    sobrevivencia_uf.parquet  a mesma coisa por UF (para cidades sem aberturas no período)
    saturacao.parquet         um modelo Binomial Negativa por CNAE (MOD-03)
    cnaes.parquet, meta.json
E data/auditoria/municipios_<mes>.md com a ligação Receita → IBGE.

Uso:
    python jobs/publicar_brasil.py --mes 2026-10
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lab.config import AUDIT, PROC, PUB  # noqa: E402
from lab.compacto import GRANDES, compactar  # noqa: E402
from lab.publicacao import FORMATO, montar  # noqa: E402

VERSAO = "0.3.0"
ANTIGOS = ["fluxo.parquet", "vida.parquet", "populacao.parquet"]   # formato 1 (só AL)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mes", required=True)
    a = ap.parse_args()
    d = PROC / a.mes
    pop = pd.read_parquet(PROC / "populacao.parquet")
    pib = pd.read_parquet(PROC / "pib.parquet") if (PROC / "pib.parquet").exists() else None
    if pib is None:
        print("Aviso: sem PIB; o modelo de espaço no mercado usa só tamanho e região.")
    r = montar(d / "estab", pd.read_parquet(d / "municipios.parquet"), pop, pib)

    PUB.mkdir(parents=True, exist_ok=True)
    for velho in ANTIGOS:
        (PUB / velho).unlink(missing_ok=True)
    for nome in ("municipios", "ativos", "movimento", "sobrevivencia", "sobrevivencia_uf", "saturacao"):
        t = compactar(r[nome], nome) if nome in GRANDES else r[nome]
        t.to_parquet(PUB / f"{nome}.parquet", index=False, compression="zstd")
    if (d / "cnaes.parquet").exists():
        pd.read_parquet(d / "cnaes.parquet").to_parquet(PUB / "cnaes.parquet", index=False)

    lig, sem = r["ligacao"], r["sem_par"]
    co = r["_coortes"].iloc[0]
    meta = {"formato": FORMATO, "cobertura": "BR", "edicao": a.mes, "data_referencia": str(r["_ref"].date()),
            "gerado_em": str(date.today()), "versao": VERSAO,
            "coortes_sobrevivencia": [int(co["primeira"]), int(co["ultima"])],
            "municipios": int(r["municipios"]["cod_ibge"].nunique()),
            "municipios_com_cnpj": int(lig["cod_ibge"].nunique()),
            "modelos_saturacao": int(len(r["saturacao"])),
            "validacao": r["_validacao"],
            "fontes": {
                "cnpj": "Receita Federal, dados abertos do CNPJ",
                "populacao": "IBGE/SIDRA, tabela 6579 (população estimada)",
                "pib": "IBGE/SIDRA, tabela 5938 (PIB dos municípios)" if pib is not None else "indisponível nesta edição"}}
    (PUB / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    AUDIT.mkdir(parents=True, exist_ok=True)
    tipos = lig["ligacao"].value_counts().to_dict()
    sat = r["saturacao"]
    linhas = [f"# Ligação Receita → IBGE e modelos — edição {a.mes}", "",
              f"- Municípios do IBGE: {meta['municipios']:,}",
              f"- Municípios com CNPJ ligados: {meta['municipios_com_cnpj']:,} "
              f"(exato {tipos.get('exato', 0)}, apelido {tipos.get('apelido', 0)}, nome parecido {tipos.get('parecido', 0)})",
              f"- Códigos da Receita sem par no IBGE: {len(sem)} (os estabelecimentos deles ficam fora dos agregados)", "",
              "## Espaço no mercado (MOD-03)", "",
              f"- CNAEs com modelo: {len(sat)}"]
    if len(sat):
        linhas += [f"- Modelo escolhido pelo AIC: {sat['modelo'].value_counts().to_dict()}",
                   f"- Pseudo-R² mediano: {sat['pseudo_r2'].median():.2f}"]
    v = r["_validacao"]
    vs, ve = v.get("sobrevivencia") or {}, v.get("espaco_no_mercado") or {}
    linhas += ["", "## Validação fora da amostra", ""]
    if vs:
        ll, pp = vs["logloss"], vs["erro_pp"]
        linhas += [f"Sobrevivência: treino nas 5 coortes anteriores, teste na mais recente ({vs['negocios_no_teste']:,} negócios).", "",
                   "| Jeito de prever | Log-loss (menor = melhor) | Erro médio (p.p.) |", "| --- | --- | --- |"]
        linhas += [f"| {nome} | {ll[k]:.4f} | {('—' if pp[k] is None else f'{pp[k]:.1f}')} |"
                   for k, nome in (("cidade_sozinha", "Só a cidade"), ("uf", "Só a UF"), ("bayes_empirico", "Bayes empírico (usado no app)"))]
    if ve:
        linhas += ["", f"Espaço no mercado: validação cruzada em 5 partes, {ve['cnaes_testados']} atividades. "
                   f"Erro mediano do modelo {ve['erro_log_modelo']:.3f} contra {ve['erro_log_proporcional']:.3f} da regra proporcional à população; "
                   f"o modelo ganha em {ve['cnaes_em_que_o_modelo_ganha']} de {ve['cnaes_testados']}."]
    if len(sem):
        linhas += ["", "## Sem par", "", "| UF | Código Receita | Nome |", "| --- | --- | --- |"]
        linhas += [f"| {s.uf} | {s.municipio_receita} | {s.nome_receita} |" for s in sem.itertuples()]
    (AUDIT / f"municipios_{a.mes}.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"Publicado em {PUB}: {meta['municipios_com_cnpj']:,} municípios, {len(sat)} modelos de saturação")


if __name__ == "__main__":
    main()
