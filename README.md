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

## Carregar os dados reais (Brasil inteiro)

Na prática quem roda é o GitHub Actions (`.github/workflows/atualizar-dados.yml`), todo dia 20.
Para rodar na mão (precisa de ~15 GB livres):

```bash
python jobs/baixar_cnpj.py --mes 2026-10         # ~6 GB da Receita Federal
python jobs/extrair_brasil.py --mes 2026-10      # separa por UF, sem nome, endereço nem contato
python jobs/coletar_populacao.py                 # IBGE/SIDRA, 5.570 municípios
python jobs/coletar_pib.py                       # IBGE/SIDRA, PIB dos municípios (opcional)
python jobs/publicar_brasil.py --mes 2026-10     # modelos e agregados em data/publicado/
```

Como cada número é calculado, e os limites: [docs/metodologia.md](docs/metodologia.md).

## Publicar o app (Streamlit Community Cloud)

1. Rode os jobs acima e faça commit de `data/publicado/` (só contagens agregadas,
   sem identificar empresas ou pessoas).
2. Em share.streamlit.io: New app → repositório `wiltonds/lab-product-launch`,
   branch `main`, arquivo `app.py`.
3. Repositório privado funciona; o app pode ficar privado ou público nas
   configurações de compartilhamento.

## Web app + API (o produto para o público)

```
data/publicado/ ──► api/ (FastAPI) ──► webapp/ (Expo, versão web)
```

- `webapp/`: o app Lab do Meu Negócio (Expo/React Native, publicado como site). O onboarding, o resultado, o simulador e o plano funcionam sem login, com os dados guardados no aparelho.
- `api/`: lê `data/publicado/` com os mesmos módulos de `lab/` e responde em `GET /v1/insights?municipio=<código IBGE>&atividade=<id>` com três sinais:
  - **concorrência**: ativos por morador, comparado com a média de AL;
  - **sobrevivência**: Kaplan-Meier aos 24 meses, com faixa de confiança, nas 5 coortes completas mais recentes. Com menos de `N_MIN_COORTE` negócios no município, usa o estado;
  - **movimento do setor**: aberturas contra baixadas e inaptas nos últimos 3 anos.

  Sem `data/publicado/`, a API responde 503 e nunca serve dados de demonstração.
- `api/atividades.json`: atividade do app → CNAE. **Falta validar** na lista CONCLA (`"validado": false`).

Rodar localmente:

```bash
uvicorn api.main:app --reload                     # http://localhost:8000/docs
cd webapp && pnpm install && EXPO_PUBLIC_INSIGHTS_API_URL=http://localhost:8000 pnpm dev:metro
```

### Atualizar os dados sem usar o seu computador

O workflow `.github/workflows/atualizar-dados.yml` roda na nuvem do GitHub: baixa a base da Receita, recorta AL, gera `data/publicado/` e faz o commit sozinho. Roda todo dia 20 ou na hora, pela aba **Actions → Atualizar dados de Alagoas → Run workflow**. O relatório da auditoria fica anexado à execução.

### Publicar (Render, um clique)

1. Tenha `data/publicado/` no repositório (pelo workflow acima ou rodando os jobs).
2. No render.com: **New → Blueprint → `wiltonds/lab-product-launch`**. O `render.yaml` cria os dois serviços:
   - `lab-dados-api` (Docker, plano gratuito);
   - `lab-do-meu-negocio` (site estático, já apontando para a API).
3. Depois do primeiro deploy, troque `CORS_ORIGINS` da API pelo endereço do site.

No plano gratuito, a API dorme depois de 15 minutos parada e a primeira consulta leva uns 30 segundos. O login com Manus não funciona fora do Manus: para contas de usuário, troque por outro provedor (ex.: Supabase Auth) numa próxima etapa.

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
