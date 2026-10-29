# Lab_Product_Launch

Ajuda quem quer empreender no Brasil a decidir com dados antes de arriscar o
próprio dinheiro. O sistema calcula; o LLM explica.

**MVP:** Alagoas. Pergunta central: "vale a pena abrir um negócio do tipo X no
município Y?"

## Começar na sua máquina

```bash
git clone https://github.com/wiltonds/lab-product-launch.git
cd lab-product-launch
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
streamlit run app.py          # abre em modo demonstração (dados sintéticos)
pytest -q                     # testes
```

## Carregar os dados reais de Alagoas

```bash
python jobs/baixar_cnpj.py --mes 2026-10        # ~6 GB da Receita Federal
python jobs/extrair_al.py --mes 2026-10         # recorta AL, todas as situações, sem contatos
python jobs/coletar_populacao.py                # IBGE/SIDRA
python jobs/auditar_fontes.py --mes 2026-10     # Etapa A: relatório em data/auditoria/
python jobs/publicar_agregados.py --mes 2026-10 # agregados que o app lê, em data/publicado/
streamlit run app.py
```

Se o download da Receita falhar (o endereço muda de tempos em tempos), baixe
os zips pelo navegador e rode `extrair_al.py --pasta <pasta dos zips>`.

## Publicar o app (Streamlit Community Cloud)

1. Rode os jobs acima e faça commit de `data/publicado/` (só contagens agregadas,
   sem identificar empresas ou pessoas).
2. Em share.streamlit.io: New app → repositório `wiltonds/lab-product-launch`,
   branch `main`, arquivo `app.py`.
3. Repositório privado funciona; o app pode ficar privado ou público nas
   configurações de compartilhamento.

## Estrutura

```
app.py                         app Streamlit (Mercado, Sobrevivência, Simulação, Fontes)
jobs/                          download, recorte, auditoria e publicação dos dados
lab/receita.py                 leitura do CNPJ da Receita
lab/indicadores.py             IND-01 a IND-07
lab/sobrevivencia.py           MOD-01: Kaplan-Meier por coorte, IC de Greenwood
lab/financeiro.py              MOD-03 ponto de equilíbrio, MOD-04 Monte Carlo
lab/demo.py                    dados sintéticos do modo demonstração
lab/engine.py, lab/dados.py    protótipo anterior (substituído; manter só como referência)
specs/                         spec 000 (produto) e 001 (motor)
.specify/memory/constitution.md  princípios
data/FONTES.md                 catálogo de fontes públicas
tools/, docs/                  calculadora da CLT e guia de matemática
tests/                         pytest
```

## Regra de separação

Só dados públicos ou fornecidos pelo próprio usuário (constituição, princípio X).
`data/raw/` e `data/processed/` ficam fora do Git; `data/publicado/` contém
apenas agregados.
