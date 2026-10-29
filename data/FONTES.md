# Fontes públicas candidatas (MVP Alagoas)

Toda fonte abaixo precisa passar pela auditoria (Etapa A da spec 000) antes de
ser usada. Os dados baixados não vão para o Git.

| Fonte | O que traz | Nível | Frequência | Uso no Lab | Armadilhas |
|---|---|---|---|---|---|
| CNPJ — dados abertos da Receita (Estabelecimentos, Empresas, Simples) | CNAE, abertura, situação cadastral e data, matriz/filial, endereço, MEI | Estabelecimento | Mensal | Ativos, aberturas, encerramentos, coortes, transições | Guardar **todas** as situações (ativa, suspensa, inapta, baixada), não só ativas; inapta ≠ fechada; empresa ≠ estabelecimento; arquivos nacionais grandes (vários GB) |
| IBGE / SIDRA | População, PIB e VAB municipal, produção agropecuária por cadeia | Município | Anual | Tamanho de mercado e contexto econômico | Defasagem de 1 a 2 anos no PIB |
| Censo 2022 (IBGE) | Domicílios, renda, idade | Município e setor censitário | Decenal | Público potencial | Renda com defasagem |
| Novo CAGED (PDET/MTE) | Admissões, desligamentos, salário de admissão | Município × CNAE | Mensal | Setor crescendo ou encolhendo, salário de entrada | Só emprego formal |
| RAIS (PDET/MTE) | Vínculos e remuneração | Município × CNAE | Anual | Custo de folha do setor | 1 a 2 anos de atraso |
| POF 2017-2018 (IBGE) | Despesa das famílias por categoria | UF | Irregular | Gasto da cidade na categoria (fase 2) | Não chega ao município |
| CNO — Cadastro Nacional de Obras (Receita) | Obras abertas, área, responsável PJ | Obra | Diária | Sinal de demanda para negócios ligados à construção | Link de download instável |
| BNDES — operações contratadas | Financiamentos por empresa, setor, município | Operação | Mensal | Acesso a crédito por setor na região | Concentrado em empresas maiores |
| PNCP — contratações públicas | Editais e contratos públicos | Contratação | Contínua | Demanda pública para negócios B2B/B2G | Acesso instável de alguns ambientes |
| Tabela CNAE 2.3 (CONCLA/IBGE) | Lista oficial de atividades | — | Rara | Classificação da ideia | Ideias novas sem classe exata |
| Banco Central | Selic, IPCA, juros PJ | Nacional | Mensal | Custo do dinheiro no plano | — |
