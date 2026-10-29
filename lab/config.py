"""Caminhos, recorte geográfico e layouts das fontes públicas."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"
RAW = DATA / "raw"              # downloads brutos (fora do Git)
PROC = DATA / "processed"       # Parquet por estabelecimento (fora do Git)
PUB = DATA / "publicado"        # agregados sem identificação (vão para o Git e para o app)
AUDIT = DATA / "auditoria"      # relatórios da Etapa A

UF = "AL"
COD_UF_IBGE = "27"

# Situação cadastral na Receita Federal
SITUACOES = {1: "nula", 2: "ativa", 3: "suspensa", 4: "inapta", 8: "baixada"}
ATIVA, SUSPENSA, INAPTA, BAIXADA = 2, 3, 4, 8

# Layout do arquivo Estabelecimentos (sem cabeçalho, separador ';', latin-1).
# Fonte: dicionário de dados do CNPJ, Receita Federal.
COLS_ESTAB = [
    "cnpj_basico", "cnpj_ordem", "cnpj_dv", "matriz_filial", "nome_fantasia",
    "situacao", "data_situacao", "motivo_situacao", "cidade_exterior", "pais",
    "data_inicio", "cnae_principal", "cnae_secundaria", "tipo_logradouro",
    "logradouro", "numero", "complemento", "bairro", "cep", "uf",
    "municipio_receita", "ddd1", "telefone1", "ddd2", "telefone2", "ddd_fax",
    "fax", "email", "situacao_especial", "data_situacao_especial",
]
# Só o necessário. Contatos e endereço completo ficam de fora (LGPD e desnecessários).
USAR_ESTAB = [
    "cnpj_basico", "cnpj_ordem", "matriz_filial", "situacao", "data_situacao",
    "motivo_situacao", "data_inicio", "cnae_principal", "cnae_secundaria",
    "bairro", "cep", "uf", "municipio_receita",
]

COLS_EMPRESAS = ["cnpj_basico", "razao_social", "natureza_juridica",
                 "qualificacao_responsavel", "capital_social", "porte", "ente_federativo"]
# Razão social fica de fora: no empresário individual ela traz o CPF.
USAR_EMPRESAS = ["cnpj_basico", "natureza_juridica", "capital_social", "porte"]

COLS_SIMPLES = ["cnpj_basico", "opcao_simples", "data_opcao_simples",
                "data_exclusao_simples", "opcao_mei", "data_opcao_mei", "data_exclusao_mei"]

ARQUIVOS_CNPJ = (
    [f"Estabelecimentos{i}.zip" for i in range(10)]
    + [f"Empresas{i}.zip" for i in range(10)]
    + ["Simples.zip", "Municipios.zip", "Cnaes.zip"]
)

# Limites iniciais de qualidade (spec 000, seção Qualidade e confiança). Revisar no backtest.
N_MIN_COORTE = 30
N_MIN_TAXA = 10
