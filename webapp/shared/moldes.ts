/**
 * Moldes por negócio: o ponto de partida de cada ramo para o simulador e o plano.
 *
 * Um molde diz COMO o negócio ganha dinheiro:
 *  - agenda:      atendimento com hora marcada (manicure, barbearia, oficina). Limite = horas da pessoa.
 *  - unidade:     produto vendido por unidade (lanche, marmita, bolo). Limite = produção e demanda.
 *  - mensalidade: cliente paga por mês (aulas, gestão de redes). Limite = número de clientes.
 *  - revenda:     compra e revende (marketplace). Margem depois de taxa e custo do produto.
 *
 * Números: estimativa inicial para começar pequeno no Nordeste, A CALIBRAR com preços da região
 * (`calibrado: false`). O simulador sempre deixa a pessoa trocar.
 */
export type TipoMolde = "agenda" | "unidade" | "mensalidade" | "revenda";

export type Molde = {
  id: string;
  tipo: TipoMolde;
  /** Como chamar uma venda: "atendimento", "refeição", "aluno". */
  unidade: string;
  unidadePlural: string;
  /** Preço médio de uma venda (R$). */
  ticket: number;
  /** Vendas por dia quando o movimento firma (uma pessoa trabalhando). */
  vendasDia: number;
  diasMes: number;
  /** Custo que vai em cada venda: material, insumo, peça (% do preço). */
  custoVariavel: number;
  /** Dá para começar em casa ou a domicílio? */
  podeEmCasa: boolean;
  /** Investimento para abrir (R$). */
  investimento: { casa: number; ponto: number };
  /** Custos fixos do mês sem aluguel e sem a retirada: MEI, luz, água, internet (R$). */
  fixos: { casa: number; ponto: number };
  /** Fração do movimento normal nos meses 1, 2 e 3 (depois, 100%). */
  rampa: [number, number, number];
  /** Primeiros passos práticos (90 dias). */
  passos: string[];
  /** Canvas de partida (texto curto por bloco). */
  canvas: { clientes: string; proposta: string; canais: string; relacionamento: string; recursos: string; atividades: string; parcerias: string };
  calibrado: boolean;
};

const MOLDES: Molde[] = [
  {
    id: "lanchonete", tipo: "unidade", unidade: "lanche", unidadePlural: "lanches", ticket: 22, vendasDia: 35, diasMes: 26, custoVariavel: 40,
    podeEmCasa: true, investimento: { casa: 6000, ponto: 25000 }, fixos: { casa: 350, ponto: 900 }, rampa: [0.4, 0.7, 1],
    passos: ["Fechar um cardápio curto (5 itens) com custo de cada um", "Abrir MEI e vigilância sanitária", "Vender para 20 conhecidos por encomenda", "Teste de 2 semanas no delivery e no balcão"],
    canvas: { clientes: "Quem trabalha ou estuda perto e quer lanche rápido", proposta: "Lanche bom, rápido e com preço justo", canais: "Balcão, WhatsApp e app de entrega", relacionamento: "Cartão fidelidade e combo do dia", recursos: "Chapa, freezer, embalagens", atividades: "Comprar, preparar, vender, entregar", parcerias: "Fornecedor de pão e carnes; motoboy" },
    calibrado: false,
  },
  {
    id: "restaurante", tipo: "unidade", unidade: "refeição", unidadePlural: "refeições", ticket: 28, vendasDia: 45, diasMes: 26, custoVariavel: 38,
    podeEmCasa: false, investimento: { casa: 0, ponto: 45000 }, fixos: { casa: 0, ponto: 1500 }, rampa: [0.4, 0.7, 1],
    passos: ["Escolher o ponto com movimento no almoço", "Fechar cardápio e custo por prato", "Alvará, vigilância sanitária e bombeiros", "Abrir só no almoço por 1 mês e medir"],
    canvas: { clientes: "Trabalhadores da região na hora do almoço", proposta: "Comida caseira no ponto, sem espera", canais: "Salão, marmita para viagem e entrega", relacionamento: "Prato do dia e mensalista", recursos: "Cozinha equipada, mesas, equipe", atividades: "Compras, produção, atendimento", parcerias: "Feira e atacado; empresas próximas" },
    calibrado: false,
  },
  {
    id: "marmitaria", tipo: "unidade", unidade: "marmita", unidadePlural: "marmitas", ticket: 20, vendasDia: 30, diasMes: 22, custoVariavel: 40,
    podeEmCasa: true, investimento: { casa: 3000, ponto: 15000 }, fixos: { casa: 400, ponto: 900 }, rampa: [0.4, 0.7, 1],
    passos: ["Montar cardápio da semana com custo por marmita", "Abrir MEI e ver as regras de alimento da prefeitura", "Fechar 10 clientes fixos por WhatsApp", "Entregar 2 semanas e medir sobra e desperdício"],
    canvas: { clientes: "Quem trabalha fora e almoça no trabalho", proposta: "Comida de casa entregue no horário", canais: "Lista de transmissão no WhatsApp", relacionamento: "Pacote semanal com desconto", recursos: "Fogão industrial, embalagens, freezer", atividades: "Comprar, cozinhar, embalar, entregar", parcerias: "Feira; empresas para pacote coletivo" },
    calibrado: false,
  },
  {
    id: "barbearia", tipo: "agenda", unidade: "corte", unidadePlural: "cortes", ticket: 35, vendasDia: 9, diasMes: 24, custoVariavel: 10,
    podeEmCasa: true, investimento: { casa: 2500, ponto: 12000 }, fixos: { casa: 200, ponto: 600 }, rampa: [0.4, 0.7, 1],
    passos: ["Montar a cadeira e o kit (máquina, navalha, produtos)", "Abrir MEI e perfil no Instagram com fotos de cortes", "Cortar para 15 conhecidos com desconto em troca de indicação", "Agenda por 2 semanas: medir horários vazios"],
    canvas: { clientes: "Homens do bairro que cortam a cada 2 a 4 semanas", proposta: "Corte com hora marcada, sem fila", canais: "Instagram, WhatsApp, indicação", relacionamento: "Plano mensal de cortes", recursos: "Cadeira, máquinas, espelho", atividades: "Atender, agendar, postar trabalhos", parcerias: "Distribuidor de produtos; academias" },
    calibrado: false,
  },
  {
    id: "salao", tipo: "agenda", unidade: "atendimento", unidadePlural: "atendimentos", ticket: 60, vendasDia: 5, diasMes: 22, custoVariavel: 20,
    podeEmCasa: true, investimento: { casa: 3000, ponto: 20000 }, fixos: { casa: 250, ponto: 800 }, rampa: [0.4, 0.7, 1],
    passos: ["Escolher 3 serviços para começar (corte, escova, química)", "Abrir MEI e montar o espaço", "Atender conhecidas com desconto em troca de fotos", "Agenda por 2 semanas: medir retorno das clientes"],
    canvas: { clientes: "Mulheres do bairro que cuidam do cabelo todo mês", proposta: "Atendimento perto de casa, com hora marcada", canais: "Instagram, WhatsApp, indicação", relacionamento: "Pacote mensal e lembrete de retorno", recursos: "Lavatório, secador, produtos", atividades: "Atender, agendar, comprar produtos", parcerias: "Distribuidora de cosméticos; manicure parceira" },
    calibrado: false,
  },
  {
    id: "estetica", tipo: "agenda", unidade: "atendimento", unidadePlural: "atendimentos", ticket: 35, vendasDia: 4, diasMes: 22, custoVariavel: 20,
    podeEmCasa: true, investimento: { casa: 1500, ponto: 8000 }, fixos: { casa: 230, ponto: 600 }, rampa: [0.4, 0.7, 1],
    passos: ["Fazer curso e montar o kit", "Abrir MEI e WhatsApp Business", "Atender 5 conhecidas com desconto em troca de fotos", "Teste de 2 semanas: meta de 2 clientes por dia"],
    canvas: { clientes: "Mulheres do bairro que querem unha e sobrancelha sem sair de casa", proposta: "Atendimento em casa, com hora marcada", canais: "WhatsApp e indicação", relacionamento: "Pacote mensal para quem volta", recursos: "Kit, curso, celular", atividades: "Atender, agendar, postar trabalhos", parcerias: "Salões sem manicure; lojas de cosméticos" },
    calibrado: false,
  },
  {
    id: "oficina", tipo: "agenda", unidade: "serviço", unidadePlural: "serviços", ticket: 180, vendasDia: 3, diasMes: 24, custoVariavel: 45,
    podeEmCasa: true, investimento: { casa: 6000, ponto: 25000 }, fixos: { casa: 300, ponto: 1200 }, rampa: [0.4, 0.7, 1],
    passos: ["Escolher os serviços rápidos (óleo, freio, revisão)", "Ferramentas mínimas e ponto de descarte de óleo", "Oferecer revisão a motoristas de aplicativo", "2 semanas de agenda: medir serviços e retorno"],
    canvas: { clientes: "Motoristas e motoboys que dependem do veículo", proposta: "Serviço rápido, preço claro, peça mostrada", canais: "WhatsApp, indicação, autopeças", relacionamento: "Lembrete de revisão", recursos: "Ferramentas, elevador ou macaco, espaço", atividades: "Diagnosticar, consertar, comprar peças", parcerias: "Autopeças; pontos de táxi e mototáxi" },
    calibrado: false,
  },
  {
    id: "servicos-auto", tipo: "agenda", unidade: "lavagem", unidadePlural: "lavagens", ticket: 40, vendasDia: 10, diasMes: 26, custoVariavel: 15,
    podeEmCasa: false, investimento: { casa: 0, ponto: 15000 }, fixos: { casa: 0, ponto: 900 }, rampa: [0.4, 0.7, 1],
    passos: ["Escolher ponto com água e passagem de carros", "Lavadora, aspirador e produtos", "Licença ambiental e descarte de água", "2 semanas abertas: medir carros por dia"],
    canvas: { clientes: "Donos de carro e moto do bairro", proposta: "Lavagem rápida com hora marcada", canais: "Fachada, WhatsApp, indicação", relacionamento: "Plano mensal de lavagens", recursos: "Lavadora, aspirador, produtos, ponto", atividades: "Lavar, atender, comprar produtos", parcerias: "Estacionamentos; oficinas" },
    calibrado: false,
  },
];

export function moldeDe(activityId: string | undefined): Molde | null {
  return MOLDES.find((m) => m.id === activityId) ?? null;
}

export function todosMoldes(): Molde[] {
  return MOLDES;
}
