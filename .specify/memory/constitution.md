# Constituição do Lab_Product_Launch

Princípios que valem para todo módulo, toda especificação e todo código gerado.
Se uma tarefa entrar em conflito com um princípio, o princípio vence.

## I. Números vêm de modelos, nunca do LLM
O LLM entende a ideia, faz perguntas, escolhe o modelo e explica o resultado.
Todo número mostrado ao usuário (demanda, lucro, probabilidade, payback) é
calculado por código determinístico ou estatístico, com semente registrada.

## II. Sempre faixas, nunca um número só
Todo resultado sai como distribuição (p10 / p50 / p90 ou probabilidade) e vem
acompanhado de um nível de confiança baseado na cobertura de dados reais.

## III. Toda resposta tem fonte
Cada número carrega a fonte (CNPJ/Receita, CAGED, RAIS, IBGE, POF, usuário,
referência curada) e a data de referência do dado.

## IV. CNAE + município é a chave universal
Toda ideia é classificada em um ou mais CNAEs (lista oficial CONCLA/IBGE, por
busca, nunca inventado) e em um município. É por essa chave que os dados são
cruzados.

## V. Arquétipos, não modelos por ideia
A conta do negócio é sempre um dos arquétipos versionados (varejo de fluxo,
serviço por capacidade, serviço B2B recorrente, comércio online, produção,
assinatura). Ideia nova não ganha modelo novo: ganha um arquétipo e parâmetros.

## VI. A história do setor confere o plano
Todo resultado do Monte Carlo é comparado com a sobrevivência real do mesmo
CNAE na mesma região. Divergência grande gera alerta ao usuário.

## VII. LGPD por padrão
Dados pessoais de clientes vindos de CRM são descartados na entrada; só ficam
agregados. Dados do usuário não treinam modelos de terceiros.

## VIII. Português do Brasil, sem jargão
"Quanto sua cidade gasta com isso", não "TAM/SAM/SOM". Termos técnicos só no
anexo metodológico.

## IX. Honestidade sobre o limite
O relatório reduz risco, não garante sucesso. Isso aparece no próprio relatório.
Quando as evidências forem insuficientes, o sistema declara a limitação e diz o
que falta para concluir.

## X. Só dados públicos ou do próprio usuário
Este repositório é independente de qualquer sistema institucional. Nenhum dado,
arquivo processado ou código de sistemas de empregadores entra aqui. Fontes
públicas são baixadas diretamente da origem (Receita Federal, IBGE, MTE, BNDES,
PNCP) por jobs deste repositório.

## XI. Coorte não é foto
Abertura e encerramento de empresas não são confundidos com sobrevivência de
coortes. Sobrevivência só é calculada com coortes de entrada e horizonte
definidos; o painel guarda todas as edições mensais da base, nunca só a última.

## XII. Correlação não é causa
Nenhum indicador ou modelo é apresentado como causa de sucesso ou fracasso.

## Referência
A especificação de produto que detalha estes princípios está em
`specs/000-produto/spec.md`.
