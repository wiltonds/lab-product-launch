# Ligação Receita → IBGE e modelos — edição 2026-10

- Municípios do IBGE: 5,571
- Municípios com CNPJ ligados: 5,571 (exato 5554, apelido 7, nome parecido 10)
- Códigos da Receita sem par no IBGE: 2 (os estabelecimentos deles ficam fora dos agregados)

## Espaço no mercado (MOD-03)

- CNAEs com modelo: 1008
- Modelo escolhido pelo AIC: {'tamanho+renda+regiao': 806, 'tamanho+regiao': 133, 'tamanho+renda': 53, 'tamanho': 16}
- Pseudo-R² mediano: 0.28

## Validação fora da amostra

Sobrevivência: treino nas 5 coortes anteriores, teste na mais recente (3,980,468 negócios).

| Jeito de prever | Log-loss (menor = melhor) | Erro médio (p.p.) |
| --- | --- | --- |
| Só a cidade | 0.6350 | 7.6 |
| Só a UF | 0.5572 | 7.4 |
| Bayes empírico (usado no app) | 0.5570 | 7.4 |

Espaço no mercado: validação cruzada em 5 partes, 40 atividades. Erro mediano do modelo 0.496 contra 1.042 da regra proporcional à população; o modelo ganha em 40 de 40.

## Sem par

| UF | Código Receita | Nome |
| --- | --- | --- |
| PA | 6969 | RIBEIRAO PRETO |
| SC | 403 | ACARA |
