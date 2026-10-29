# Especificação: Motor de simulação Monte Carlo

**Feature:** 001-motor-monte-carlo
**Status:** Rascunho
**Data:** 2026-10-26

## Contexto
Quem quer abrir um negócio precisa saber se a conta fecha e quanto arrisca. O
motor recebe a ficha estruturada da ideia (arquétipo, CNAE, município e
premissas), simula milhares de versões do negócio e devolve probabilidades que
sustentam a decisão Go / Pivot / Kill.

## Cenários de usuário

### Cenário 1 — Empreendedor sem dados próprios (prioridade P1)
Maria quer abrir uma sorveteria em uma cidade de Alagoas. Informa ticket
esperado, aluguel, investimento e reserva de caixa. O sistema calcula a
demanda com dados públicos, simula 24 meses e responde em linguagem simples.

**Aceite:**
1. Dado um município e um CNAE de varejo de fluxo, quando as premissas são
   enviadas, então o motor devolve p10/p50/p90 do lucro mensal maduro,
   probabilidade de payback em 12 e 24 meses e probabilidade de o caixa acabar.
2. Dado o mesmo input e a mesma semente, então o resultado é idêntico.

### Cenário 2 — Arquétipos diferentes (P1)
João quer um salão de beleza; Ana, uma agência de marketing. O motor aplica a
fórmula do arquétipo certo (capacidade ou B2B recorrente) sem código novo.

### Cenário 3 — Pivot orientado (P2)
Quando a decisão é Pivot, o motor mostra as variáveis que mais pesam no
resultado e permite simular uma variante (ex.: quiosque em vez de loja).

### Cenário 4 — Checagem com a história (P2)
Quando o Monte Carlo é muito mais otimista que a sobrevivência real do CNAE na
região, o resultado traz um alerta.

## Requisitos funcionais
- **FR-001:** Aceitar como entrada uma ficha com arquétipo, CNAE, município e
  premissas, cada premissa como faixa (mínimo, provável, máximo) e fonte.
- **FR-002:** Implementar os arquétipos varejo de fluxo, serviço por capacidade
  e serviço B2B recorrente.
- **FR-003:** Derivar a demanda do varejo de fluxo de: domicílios no raio ×
  gasto mensal por domicílio na categoria × fatia de mercado, sendo a fatia uma
  Beta centrada em 1 / (concorrentes + 1).
- **FR-004:** Simular N cenários (padrão 10.000) por 24 meses, com rampa de
  maturação da demanda.
- **FR-005:** Calcular: lucro mensal maduro (p10/p50/p90), probabilidade de
  payback ≤ 12 e ≤ 24 meses, probabilidade de o caixa acumulado ficar abaixo de
  −(investimento + reserva) e valor esperado do caixa no mês 24.
- **FR-006:** Calcular a sensibilidade de cada variável sobre o caixa do mês 24.
- **FR-007:** Aplicar a regra de decisão:
  Go se P(payback ≤ 24) ≥ 60% e P(caixa acabar) ≤ 20%;
  Kill se P(payback ≤ 24) < 30% ou P(caixa acabar) > 50%;
  Pivot nos demais casos. Limiares configuráveis.
- **FR-008:** Comparar P(payback ≤ 24) com a sobrevivência de 2 anos do CNAE
  na UF/município e alertar se a diferença passar de 25 pontos percentuais.
- **FR-009:** Devolver um JSON estruturado (números, fontes, confiança, alertas)
  para o LLM redigir a explicação; o LLM não altera os números.
- **FR-010:** Registrar semente, versão do arquétipo e data dos dados.

## Entidades
- **FichaIdeia:** texto original, CNAE(s), município, arquétipo, premissas.
- **Premissa:** nome, mínimo, provável, máximo, distribuição, fonte.
- **ResultadoSimulacao:** métricas, decisão, sensibilidade, alertas, confiança.

## Critérios de sucesso
- **SC-001:** 10.000 cenários × 24 meses em menos de 2 segundos.
- **SC-002:** Backtest com 20 casos conhecidos, Brier score registrado.
- **SC-003:** Usuário leigo entende o resultado (teste com 5 pessoas).

## Fora do escopo desta feature
Classificação da ideia em CNAE (feature 002), painel de agentes (003),
camada bayesiana (004), upload de CRM (005).

## Pontos a esclarecer
- [NEEDS CLARIFICATION] Fonte das margens de referência por CNAE.
- [NEEDS CLARIFICATION] Raio padrão por arquétipo (2 km? bairro? cidade?).
- [NEEDS CLARIFICATION] Limiares da regra de decisão após o backtest.
