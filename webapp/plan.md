# Plano de implementação — Lab do Meu Negócio

## Objetivo e escopo

Criar no starter Expo/React Native existente um MVP navegável e funcional, em português, orientado a smartphones, para ajudar o perfil planejador a avaliar uma ideia de negócio físico em Alagoas. O app entrega uma primeira leitura útil em menos de três minutos, reduzindo perguntas iniciais e revelando detalhes progressivamente. O discurso explicita que a ferramenta organiza premissas e riscos, mas não garante sucesso.

O MVP inclui boas-vindas e onboarding financeiro/profissional e da ideia; painel; simulador determinístico; missões/progresso; teste de vendas; oferta do relatório; solicitação de mentoria; perfil, privacidade e consentimentos. Exibe métricas de mercado e sobrevivência somente quando houver fonte e metodologia verificadas; sem tais dados, explica a indisponibilidade, não preenche com números fictícios. Não ativa cobranças, não simula pagamento aprovado, não declara disponibilidade externa de mentores e não finge validação por e-mail/WhatsApp.

## Implementação e dependências

- Preservar o starter fixo Expo Router, React Native, TypeScript, NativeWind, Express, tRPC e Drizzle. Manter `app/`, `components/`, `hooks/`, `lib/`, `server/`, `drizzle/`.
- Usar o login real Manus OAuth fornecido pelo starter (não criar senha/autenticação separada nem OTP sem provedor conectado). Coletar os dados adicionais do perfil, incluindo WhatsApp e consentimentos separados. Toda consulta/mutação privada deve derivar o usuário do contexto autenticado e limitar registros a essa identidade.
- Usar MySQL gerenciado via Drizzle para dados duráveis associados a `openId`, com perfil/consentimentos, ideia e premissas, progresso de missões, testes de venda e solicitações em um workspace JSON por usuário; AsyncStorage guarda rascunho convidado e cópias locais com namespace separado por conta. Só importar dados de convidado mediante confirmação explícita. Criar migrações aditivas e idempotentes. O banco é compartilhado por desenvolvimento e publicação; executar preparação do esquema apenas após revisar a migração gerada.
- No MVP, separar o cálculo financeiro determinístico em `shared/finance.ts` e o armazenamento de workspace em procedimentos tRPC protegidos de `server/routers.ts`; não implementar Statistical Intelligence Engine ou Generative AI Explanation Layer até haver dados e modelos validados. Data Engine, camadas estatísticas/decisórias completas, IA explicativa e integração Python/FastAPI são próximas etapas, não funcionalidades entregues. Não invocar IA para inventar dados ou substituir cálculos.
- Fórmulas financeiras demonstrativas determinísticas: receita = ticket × clientes/dia × dias; custos variáveis a partir da hipótese informada; margem de contribuição; equilíbrio operacional e clientes necessários; capital de giro como referência fixa de três meses de custos fixos. Mostrar premissas editáveis e classificação HIPÓTESE DO USUÁRIO/CENÁRIO SIMULADO. Não produzir probabilidades ou retorno garantido. Cenários alteram parâmetros por fatores declarados, exibidos ao usuário; nenhum Monte Carlo sem distribuições calibradas.
- Validar os 102 nomes de municípios de Alagoas em fonte oficial e guardar origem/data junto ao catálogo. Catálogo de atividades inicial com até 20 entradas configuráveis, sem inventar CNAE nem alegar validação oficial.
- Preparar oferta de compra única, mas a ação de compra informa integração pendente e não processa cobrança. Solicitação de mentoria fica em estado pendente até integração real de calendário; datas e horários de demonstração devem ser rotulados como solicitações não confirmadas.
- Perfil deve distinguir preferências/consentimentos e oferecer solicitações seguras de exportação/exclusão; implementar somente capacidades que realmente funcionem e informar estado.

### Estrutura prevista

- `app/(tabs)/`: painel e abas Início, Simulador, Missões e Perfil; rotas independentes `app/onboarding.tsx`, `app/sales-test.tsx`, `app/report.tsx`, `app/mentorship.tsx` e `app/privacy.tsx` atendem os fluxos progressivos.
- `components/lab-ui.tsx` e `components/brand-mark.tsx`: componentes React Native acessíveis, controles de formulário e identidade local da marca.
- `shared/`: `finance.ts` com tipos, premissas e fórmulas determinísticas; `catalog.ts`; `workspace-storage.ts`; `format.ts`; `data/alagoas-municipios.json` com metadados IBGE.
- `hooks/use-app-data.ts`: hidratação por conta, armazenamento local isolado, sincronização tRPC e importação explícita de rascunho convidado.
- `server/routers.ts`: procedimentos protegidos para ler/salvar o workspace do usuário autenticado; manter rotas do starter.
- `server/db.ts` e `drizzle/`: consultas por usuário, esquema e migrações aditivas.
- `assets/images/`: ícones quadrados próprios e recursos de splash/favicon/adaptive-icon; manter IDs e scheme do app.

## Decisões de design

### Movimento

Fintech editorial de confiança: uma interface de decisão pessoal, sem estética de painel corporativo.

### Princípios centrais

1. Uma decisão por etapa, com progresso real e retorno imediato.
2. Números sempre acompanhados de significado, origem e grau de certeza.
3. Hierarquia por leitura vertical e blocos curtos, com detalhes sob demanda.
4. Ações acessíveis com alvos generosos e linguagem sem pressão.

### Filosofia de cor

Fundo marfim/branco para reduzir ruído; azul-marinho profundo para confiança institucional; verde apenas para sinal positivo e progresso; âmbar para atenção; vermelho reservado a risco importante. Cor não é a única forma de comunicar estado.

### Paradigma de layout

Fluxo vertical de cartão editorial com resumo principal, explicação curta e expansão opcional; navegação inferior de quatro áreas para uso com uma mão. Uma prioridade por tela, espaçamento amplo, sem matriz de indicadores.

### Elementos de assinatura

- Marca gráfica: monograma “L” dentro de um contorno incompleto que sugere experimento/rota de decisão.
- Filete vertical azul que conecta premissa a explicação.
- Etiquetas visíveis “Hipótese”, “Cenário simulado” e “Fonte” para distinguir confiança.

### Interação e animação

Toque em indicadores abre origem, premissas e limitações. Botões com áreas generosas, estados de foco/pressionado, feedback de salvamento e validação inline. Transições curtas (150–220 ms), sem movimento contínuo, contagem regressiva ou animação de recompensa manipulativa; respeitar redução de movimento e acessibilidade.

### Tipografia

Usar famílias disponíveis no sistema/Expo já suportadas pelo starter: sans-serif legível, com títulos em peso 700 e corpo em 400–500. Escala: título 28–32, cabeçalho 22–24, corpo 16–17, auxiliares 13–14; números monetários tabulares e unidades explícitas. Verificar leitura em telas estreitas.

### Essência, voz e marca

Essência: “clareza prática para decidir antes de investir”; personalidade: confiável, didática, respeitosa. Voz direta e calma. Exemplos: “Vamos olhar para as premissas, não adivinhar o futuro.” “Este resultado depende do preço e do movimento que você informou.” Logotipo próprio derivado do monograma e ícones nativos quadrados sem cantos arredondados embutidos. Cor de assinatura: azul-petróleo profundo, complementado por marinho institucional.

## Interface e fluxo

A tela inicial apresenta a promessa solicitada (“Antes de investir, entenda o seu negócio.”) e começa uma análise curta. O onboarding pergunta situação profissional, faixa etária, cidade, capital disponível, reserva, custo pessoal e prazo; depois categoria/atividade e cidade de Alagoas, imóvel, equipamentos, equipe e manutenção do emprego. “Outro estado” explica cobertura inicial e registra interesse sem fingir cobertura.

O painel apresenta atividade, município, capital, situação e progresso, depois seis áreas: potencial financeiro, sobrevivência, concorrência/mercado, realidade financeira, fatores de resultado e próximos passos. No MVP, sobrevivência e concorrência mostram a ausência de dados locais validados; não há métricas cadastrais, probabilidades de sobrevivência ou previsão de lucro. Indicadores calculados têm rótulo de cenário e premissas. Proveniência detalhada ao tocar nos indicadores e camadas estatísticas permanecem pendentes.

Simulador permite editar investimento inicial, aluguel, energia, água, internet, funcionários, pró-labore, custos variáveis, ticket, clientes/dia e dias/mês. Mostra receita, custos, resultado, equilíbrio, clientes para equilíbrio e capital de giro como referência fixa de três meses de custos fixos. Três cenários são determinísticos e revelam suas alterações.

Teste de vendas registra dias, pessoas abordadas, interesse, intenção de compra, compras reais e preço; resultados descrevem somente a amostra. Missões registram tarefas úteis e progresso. Relatório explica a oferta de R$ 1.990 em compra única (10 × R$ 199), sem checkout. Mentoria registra pedido de horário pendente, não confirmação externa. Perfil permite atualizar dados e consentimentos e iniciar pedidos de exportação/exclusão com estado verificável.

## Restrições

O conteúdo recebido termina logo após o cabeçalho “Requisito obrigatório BUCA-001”; não há critério detalhado adicional para esse requisito e não será inferido. Município, mercado e sobrevivência exigem fontes/dados; CNPJ ativo não prova operação real; menos de 30 negócios exige aviso conservador se um cálculo futuro usar coorte; custos padrão sempre são hipóteses; dados ausentes devem ser expostos. Não publicar nem configurar serviços pagos sem pedido explícito.
