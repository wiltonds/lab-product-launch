# Lab_Product_Launch — Spec Kit 01

## 1. Visão do produto

**Missão:** ajudar pessoas a avaliar oportunidades de negócio com dados verificáveis, modelos estatísticos e simulações financeiras, antes de comprometer capital.

**Problema:** quem deseja empreender frequentemente toma decisões com base em opiniões, exemplos isolados ou estimativas sem fonte.

**Solução:** uma plataforma que transforma uma ideia de negócio e sua localização em uma análise estruturada de mercado, dinâmica empresarial, viabilidade financeira e incerteza.

**Princípio fundamental:** o sistema calcula; o LLM explica. O LLM não pode inventar resultados quantitativos.

## 2. Objetivo do MVP

Responder à pergunta:

"Vale a pena abrir um negócio do tipo X no município Y?"

Território inicial: Alagoas, Brasil.

Interface inicial: Streamlit.

Linguagem: Python.

O MVP deverá demonstrar um fluxo funcional, da identificação da atividade econômica até a apresentação de um relatório rastreável.

## 3. Princípios inegociáveis

1. Todo dado observado possui fonte, período de referência e registro de processamento.
2. Toda estimativa possui método, premissas e limitações documentados.
3. Dados ausentes não podem ser substituídos silenciosamente por valores inventados.
4. Correlação não será apresentada como causalidade.
5. Abertura e encerramento de empresas não serão confundidos com sobrevivência de coortes.
6. A simulação financeira não será apresentada como garantia de retorno.
7. O nível de confiança deverá refletir a qualidade das evidências e a incerteza do modelo.
8. O LLM só poderá explicar resultados estruturados fornecidos pelo motor analítico.
9. Cada execução deverá registrar versões dos dados, parâmetros e modelos utilizados.
10. Quando as evidências forem insuficientes, o sistema deverá declarar essa limitação.

## 4. Usuário e caso de uso principal

Usuário: pessoa que deseja iniciar um pequeno negócio e precisa avaliar uma oportunidade local.

Entrada de exemplo:

- Atividade: sorveteria.
- Município: Arapiraca, Alagoas.
- Capital disponível: opcional na análise de mercado; necessário para avaliar a adequação do investimento ao empreendedor.
- Investimento estimado: opcional, sujeito à confirmação.
- Custos, preços e capacidade de vendas: informados pelo usuário ou apresentados como cenários explicitamente identificados.

Fluxo:

1. Interpretar a pergunta.
2. Identificar a atividade e sugerir CNAEs candidatos.
3. Solicitar confirmação quando a classificação for ambígua.
4. Consultar as bases disponíveis.
5. Validar cobertura, atualidade e qualidade dos dados.
6. Calcular indicadores empresariais e de mercado.
7. Simular cenários financeiros quando houver premissas suficientes.
8. Gerar relatório com evidências, incertezas e limitações.
9. Permitir que o usuário altere premissas e compare cenários.

## 5. Escopo funcional

### RF-01 — Identificação da atividade

Receber atividade econômica e município.

Resultado: atividade interpretada, candidatos CNAE, justificativa da classificação e eventuais ambiguidades.

### RF-02 — Dados empresariais

Consultar ou processar dados de CNPJ para identificar empresas por atividade, localização e situação cadastral.

Apresentar, conforme a disponibilidade:

- Empresas ativas na data de referência.
- Aberturas observadas no período.
- Encerramentos observados no período.
- Distribuição geográfica.
- Evolução temporal.
- Limitações de cobertura e classificação.

Contagens de empresas e estabelecimentos deverão ser diferenciadas. Filiais não deverão ser contadas como empresas independentes sem que isso seja explicitamente indicado.

### RF-03 — Caracterização do mercado

Utilizar dados do IBGE e outras fontes públicas pertinentes para caracterizar população, renda e contexto econômico.

A granularidade geográfica deverá respeitar a granularidade efetivamente publicada pela fonte.

Não estimar automaticamente demanda de um raio comercial quando não houver dados suficientes para sustentar essa estimativa.

### RF-04 — Dinâmica e sobrevivência empresarial

Calcular taxas de sobrevivência somente quando for possível identificar coortes de entrada e acompanhar seus resultados durante um período definido.

Documentar:

- Definição de empresa nova.
- Unidade de análise.
- Período da coorte.
- Horizonte de acompanhamento.
- Tratamento de mudanças cadastrais.
- Limitações de observação.
- Intervalos de incerteza, quando metodologicamente apropriados.

Quando não houver dados adequados, apresentar indicadores substitutos claramente identificados, sem chamá-los de taxa de sobrevivência.

### RF-05 — Modelo financeiro

Permitir a configuração de:

- Investimento inicial.
- Custos fixos.
- Custos variáveis.
- Preço médio.
- Volume de vendas.
- Margem de contribuição.
- Capital de giro.
- Horizonte de projeção.

Calcular, quando houver dados suficientes:

- Ponto de equilíbrio.
- Fluxo de caixa projetado.
- Necessidade de capital.
- Payback estimado.
- Distribuição de resultados em cenários de Monte Carlo.
- Probabilidade de caixa negativo no horizonte definido.
- Probabilidade de perda de capital, conforme uma definição explícita.

As distribuições das variáveis simuladas deverão ser justificadas ou identificadas como hipóteses do usuário.

### RF-06 — Relatório de decisão

Apresentar:

1. Resumo executivo.
2. Evidências de mercado.
3. Dinâmica empresarial observada.
4. Resultados estatísticos.
5. Cenários financeiros.
6. Principais riscos.
7. Dados ausentes.
8. Fontes e períodos.
9. Premissas e métodos.
10. Próximas informações necessárias para melhorar a análise.

A recomendação deverá poder resultar em evidência favorável, evidência desfavorável ou dados insuficientes. Não deverá existir uma classificação universal de Go/Pivot/Kill antes da definição e validação dos critérios.

### RF-07 — Rastreabilidade

Cada indicador deverá estar vinculado a um registro contendo:

- Identificador do indicador.
- Fonte e referência documental.
- Data de extração ou processamento.
- Período de referência.
- Filtros e transformações.
- Fórmula ou método.
- Parâmetros.
- Versão do cálculo.
- Limitações conhecidas.

### RF-08 — Interface conversacional

O LLM poderá interpretar perguntas, solicitar esclarecimentos e explicar resultados.

Deverá receber resultados estruturados do motor analítico, com campos explícitos para valores, unidades, fontes, métodos e limitações.

O LLM não poderá alterar os valores calculados nem preencher campos quantitativos ausentes por inferência livre.

## 6. Fontes de dados candidatas

As fontes abaixo são candidatas a avaliação técnica; sua disponibilidade, cobertura e licença deverão ser verificadas antes de assumir que atendem ao MVP.

- Receita Federal: dados cadastrais públicos de CNPJ.
- IBGE: população, estimativas municipais e informações territoriais.
- IBGE: pesquisas econômicas e de orçamento familiar, conforme disponibilidade e granularidade.
- Novo CAGED: movimentação do emprego formal.
- RAIS: estoque e características do emprego formal, conforme disponibilidade.
- Fontes complementares: pesquisas setoriais, dados de preços e informações fornecidas pelo empreendedor.

Cada fonte deverá ter um contrato de dados documentado, com campos, granularidade, periodicidade, limitações e procedimentos de atualização.

CAGED e RAIS descrevem aspectos do mercado de trabalho formal. Não representam diretamente todos os negócios, trabalhadores informais ou a demanda de consumidores.

## 7. Arquitetura proposta

Camadas independentes:

1. Interface: Streamlit.
2. Interpretação: LLM opcional e substituível.
3. Classificação: atividade econômica e CNAE.
4. Ingestão: importação, validação e atualização das bases.
5. Armazenamento: arquivos de dados tratados e metadados.
6. Indicadores: consultas e métricas reproduzíveis.
7. Modelos: estatística empresarial e simulação financeira.
8. Relatórios: resultados estruturados e referências.
9. Auditoria: versões, parâmetros, execução e erros.

A primeira versão poderá utilizar Python, pandas e arquivos CSV ou Parquet. A escolha de banco de dados deverá considerar o volume real dos dados, evitando infraestrutura desnecessária.

## 8. Critérios de aceite

O MVP será considerado funcional quando:

- Uma atividade e um município puderem ser informados.
- A classificação CNAE apresentar ambiguidades quando existentes.
- As fontes utilizadas forem identificáveis.
- As contagens empresariais forem reproduzíveis e tiverem data de referência.
- As taxas de sobrevivência forem calculadas apenas com coortes adequadas.
- O ponto de equilíbrio puder ser conferido independentemente.
- As simulações financeiras utilizarem parâmetros explícitos.
- Alterações nas premissas produzirem mudanças coerentes nos resultados.
- O relatório diferenciar observações, estimativas e hipóteses.
- O sistema declarar insuficiência quando os dados não sustentarem uma conclusão.
- Testes automatizados cobrirem os cálculos centrais e casos de dados ausentes.

## 9. Fora do escopo inicial

- Cobertura nacional completa e continuamente atualizada.
- Recomendação automática de todos os negócios possíveis.
- Integrações com dados internos de empresas.
- Agentes autônomos executando pesquisas e ações externas.
- Previsões de receita sem premissas ou evidências suficientes.
- Garantias de sucesso ou retorno financeiro.
- Classificação universal de risco sem validação empírica.

## 10. Etapas de implementação

### Etapa A — Auditoria das fontes

Identificar arquivos, formatos, períodos, licenças, campos e cobertura geográfica.

### Etapa B — Contratos de dados

Definir os esquemas de CNPJ e IBGE, regras de qualidade e chaves de relacionamento.

### Etapa C — Primeiro indicador

Implementar e testar contagens empresariais por município, CNAE e situação cadastral.

### Etapa D — Primeiro modelo estatístico

Avaliar se os dados disponíveis permitem construir coortes e estimar sobrevivência empresarial.

### Etapa E — Primeiro modelo financeiro

Implementar ponto de equilíbrio e cenários com premissas explícitas.

### Etapa F — Interface Streamlit

Conectar entrada, indicadores, modelos e relatório.

### Etapa G — Explicação por LLM

Adicionar a camada de linguagem depois que os cálculos estiverem testados.

### Etapa H — Validação empírica

Comparar estimativas com resultados observados, documentar limitações e revisar os critérios de decisão.

## 11. Decisão técnica inicial

A prioridade não é criar um chatbot sofisticado.

A prioridade é demonstrar que os dados disponíveis permitem calcular pelo menos um conjunto útil de indicadores empresariais e produzir uma análise financeira reproduzível.

A primeira entrega de engenharia deverá ser um pipeline de dados auditável, acompanhado de testes automatizados e um relatório técnico de qualidade das fontes.

Somente depois dessa etapa deverá ser consolidada a primeira versão executável da aplicação.
