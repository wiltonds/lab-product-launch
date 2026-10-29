# Lab_Product_Launch

Ajuda quem quer empreender no Brasil a decidir com dados antes de arriscar o
próprio dinheiro. O sistema calcula; o LLM explica.

**MVP:** Alagoas. Pergunta central: "vale a pena abrir um negócio do tipo X no
município Y?"

## Estrutura (Spec Kit)

```
.specify/memory/constitution.md       princípios inegociáveis
specs/000-produto/spec.md             especificação do produto (MVP Alagoas)
specs/001-motor-monte-carlo/spec.md   motor de simulação financeira
lab/engine.py                         arquétipos, Monte Carlo, Kaplan-Meier (protótipo)
lab/dados.py                          consultas a fontes públicas + dados sintéticos de demo
notebooks/                            notebook do motor em modo demonstração
data/FONTES.md                        catálogo de fontes públicas e armadilhas conhecidas
tools/calculadora-clt.html            calculadora "Quanto custa largar a CLT"
docs/matematica-do-lab.html           guia interativo da estatística do produto
```

## Estado

O protótipo do motor (`lab/engine.py`) foi escrito antes da spec 000 e ainda
viola três pontos dela: sobrevivência calculada sobre a foto da base, demanda
no raio estimada sem dado e limiares Go/Pivot/Kill não validados. A próxima
etapa é a auditoria das fontes (Etapa A) e a refatoração para a spec 000.

## Regra de separação

Este repositório usa **apenas dados públicos ou fornecidos pelo próprio
usuário**. Nada de dados, arquivos processados ou código de sistemas
institucionais (ver constituição, princípio X). Arquivos de dados baixados
ficam fora do Git (`data/raw/`, `data/processed/`).

## Rodar

```bash
pip install -r requirements.txt
jupyter notebook notebooks/01_motor_monte_carlo.ipynb
```
