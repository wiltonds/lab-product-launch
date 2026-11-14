# Como o Vinga calcula cada número

Versão 0.3 · Edição de dados 2026-10 · Responsável: Wilton Costa, mestre em Gestão com ênfase em Ciência de Dados

O Vinga só usa dados públicos e mostra a conta. Este texto explica, em linguagem simples, de onde vem cada número que aparece no app e o que ele **não** diz.

## De onde vêm os dados

| Fonte | O que usamos | Atualização |
| --- | --- | --- |
| Receita Federal, dados abertos do CNPJ | Situação de cada estabelecimento (ativo, baixado, inapto), data de abertura, data da última mudança, atividade principal (CNAE) e município | Mensal |
| IBGE, tabela 6579 | População estimada dos 5.570 municípios | Anual |
| IBGE, tabela 5938 | PIB dos municípios (usado como PIB por morador, um retrato da renda da cidade) | Anual, com 2 anos de atraso |

Guardamos só contagens por município e atividade. Nome, endereço, telefone e e-mail das empresas não entram.

## As quatro perguntas

### 1. Concorrência: quantos negócios parecidos já existem por morador?
Contamos os estabelecimentos **ativos** da atividade na cidade e dividimos pela população. Comparamos com a média do estado.

### 2. Espaço no mercado: quantos uma cidade como a sua costuma ter?
Para cada atividade, ajustamos um modelo com todas as cidades do Brasil que responde: "dado o tamanho, a renda e a região, quantos estabelecimentos dessa atividade uma cidade costuma ter?". Depois comparamos a sua cidade com o número esperado e com uma faixa normal (onde caem 8 de cada 10 cidades parecidas).

- **Modelo:** regressão Binomial Negativa. Ela foi feita para contagens que variam muito de cidade para cidade.
- **Navalha de Occam:** testamos três versões, da mais simples (só tamanho) à mais completa (tamanho, renda e região). Uma informação só entra se melhorar o ajuste de verdade (critério AIC). Por isso, em algumas atividades a renda não aparece: ela não explicava o suficiente.

### 3. Sobrevivência: de cada 100 que abriram, quantos seguem abertos depois de 2 anos?
Pegamos os negócios abertos nos 5 anos mais recentes que já completaram 2 anos de vida e contamos quantos fecharam (baixa ou inaptidão) antes de 2 anos.

- **Cidades pequenas:** "3 de 4 fecharam" é ruído, não informação. Por isso usamos **Bayes empírico**: a taxa da cidade é puxada para a do estado na medida da incerteza. Quanto menos casos, mais o número se apoia no estado. Quanto as cidades realmente diferem entre si é medido nos próprios dados, não escolhido por nós.
- Mostramos sempre uma **faixa provável** (90%), não só um número.

### 4. Movimento do setor: está abrindo mais ou fechando mais?
Somamos aberturas e fechamentos dos últimos 36 meses na cidade e comparamos com o estado.

## O Índice Vinga (0 a 100)

Junta quatro partes, cada uma de 0 a 100 (maior = mais a favor). Os pesos abaixo são a versão inicial e serão calibrados com dados reais.

| Parte | De onde vem | Peso | Peso para quem está recomeçando |
| --- | --- | --- | --- |
| Mercado | Espaço no mercado (65%) e movimento do setor (35%) | 30% | 25% |
| Sobrevivência | Sobrevivência em 2 anos: 40% vira nota 0 e 90% vira nota 100 | 25% | 20% |
| Bolso | Folga nas contas (50%), meses de reserva da família (30%) e dinheiro para abrir (20%) | 30% | 40% |
| Preparo | Experiência no ramo (60%) e fase do plano (40%) | 15% | 15% |

- **Recomeço:** quem diz que perdeu o emprego tem mais peso no bolso, porque um erro custa mais caro.
- **O motivo** mostrado no app é a parte que mais tira pontos da nota (peso × distância até 100). **A ação** da semana vem desse motivo.
- **Nota parcial:** sem os dados da cidade, a nota usa só bolso e preparo, e o app avisa.

| Nota | O que o app diz |
| --- | --- |
| 75 a 100 | Vinga, com boas chances |
| 55 a 74 | Vinga, com atenção |
| 35 a 54 | Dá, mas ajuste antes de investir |
| 0 a 34 | Ainda não: mude o plano antes |

## O que os números NÃO dizem (limites)

1. **Negócio sem CNPJ não aparece.** Muita gente trabalha na informalidade, então a concorrência real costuma ser **maior** do que a mostrada.
2. **CNPJ baixado não é sinônimo de falência.** Pode ser alguém que mudou de ramo, de cidade, ou que passou de MEI para outro tipo de empresa. E CNPJ ativo não prova que a porta está aberta.
3. **Atividade registrada errada.** Algumas empresas escolhem um CNAE que não é o que fazem de verdade. Barbearias e salões, por exemplo, usam o mesmo código.
4. **Passado não é destino.** Os números descrevem o que aconteceu com o setor. Não são previsão do resultado de uma pessoa.
5. **Ligação de municípios.** O código de município da Receita não é o do IBGE. Ligamos pelo nome dentro do estado; os que não batem ficam listados no relatório de auditoria de cada edição.

## Como sabemos se funciona

Cada edição dos dados roda um teste fora da amostra: o modelo é avaliado em dados que ele não viu ao aprender. Resultado da edição de outubro de 2026:

### Espaço no mercado
Validação cruzada em 5 partes: cada pedaço das cidades é previsto por um modelo que não o viu. Comparamos com a regra simples "proporcional à população", nas 40 atividades com mais negócios.

| Jeito de prever | Erro típico (quantas vezes a previsão erra para mais ou para menos) |
| --- | --- |
| Proporcional à população | cerca de 2,8 vezes |
| **Modelo do Vinga** | **cerca de 1,6 vez** |

O modelo ganhou nas **40 de 40** atividades testadas. Entre os 1.008 modelos ajustados, a versão completa (tamanho, renda e região) venceu em 806; nas demais ficou uma versão mais simples, porque a informação extra não pagava o próprio custo (critério AIC).

### Sobrevivência em 2 anos
O modelo aprendeu com quem abriu de 2018 a 2022 e tentou prever o que aconteceu com quem abriu em 2023: **3.980.468 negócios** que ele nunca tinha visto.

| Jeito de prever | Log-loss (menor = melhor) | Erro médio |
| --- | --- | --- |
| Só a cidade | 0,635 | 7,6 pontos percentuais |
| Só o estado | 0,557 | 7,4 pontos percentuais |
| **Bayes empírico (usado no app)** | **0,557** | **7,4 pontos percentuais** |

O que isso mostra: olhar só a cidade é o pior jeito de prever. Em sobrevivência, a cidade acrescenta pouco além do estado e da atividade, e o Bayes empírico aprendeu isso sozinho, apoiando-se no estado. Mostrar o número cru da cidade seria mostrar ruído. Os próximos ganhos devem vir de outras informações (porte da empresa, tipo de ponto), não de mais detalhe geográfico.

### Sempre
- Todo o código é testado com dados sintéticos de resultado conhecido (o modelo precisa recuperar o que foi colocado).
- Regra da navalha de Occam: se o modelo mais complexo não ganhar no teste fora da amostra, volta o mais simples.
- Os números de cada edição ficam em `data/auditoria/municipios_<edição>.md` e em `data/publicado/meta.json`.
