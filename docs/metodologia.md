# Como o Vinga calcula cada número

Versão 0.3 · Responsável: Wilton Costa, mestre em Gestão com ênfase em Ciência de Dados

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

## O que os números NÃO dizem (limites)

1. **Negócio sem CNPJ não aparece.** Muita gente trabalha na informalidade, então a concorrência real costuma ser **maior** do que a mostrada.
2. **CNPJ baixado não é sinônimo de falência.** Pode ser alguém que mudou de ramo, de cidade, ou que passou de MEI para outro tipo de empresa. E CNPJ ativo não prova que a porta está aberta.
3. **Atividade registrada errada.** Algumas empresas escolhem um CNAE que não é o que fazem de verdade. Barbearias e salões, por exemplo, usam o mesmo código.
4. **Passado não é destino.** Os números descrevem o que aconteceu com o setor. Não são previsão do resultado de uma pessoa.
5. **Ligação de municípios.** O código de município da Receita não é o do IBGE. Ligamos pelo nome dentro do estado; os que não batem ficam listados no relatório de auditoria de cada edição.

## Como sabemos se funciona

- Todo o código é testado com dados sintéticos de resultado conhecido (o modelo precisa recuperar o que foi colocado).
- Próximo passo: treinar com as empresas abertas até 2021 e testar com as de 2022, que o modelo nunca viu. Um modelo mais complexo só entra se acertar mais nesse teste.
