export const DEV_MOTIVOS = [
  'Conta bancária divergente dos dados do cadastro',
  'Conta bancária de terceiros (não é PJ/PF do cadastro)',
  'Dados bancários incompletos ou ilegíveis',
  'CNPJ divergente da Razão Social',
  'Contrato Social ilegível ou desatualizado',
  'IE inválida, vencida ou faltante',
  'Comprovante bancário faltante ou ilegível',
  'Documento de identidade ilegível',
  'CPF/CNPJ do titular não confere',
  'Dados cadastrais incompletos',
  'Endereço incompleto ou inválido',
  'Foto/CNH do motorista ilegível',
  'ANTT/RNTRC inválido ou expirado',
  'E-mail ou telefone inválido',
  'Outros (descrever no campo abaixo)',
];

/* Mapeamento de motivo → campos do formulário que precisam ser corrigidos.
   Quando o analista escolhe o motivo, esses campos vêm marcados por padrão. */
export const MOTIVO_CAMPOS = {
  'Conta bancária divergente dos dados do cadastro': ['banco','agencia','conta','titular_conta','cpf_cnpj_titular','comprovante_bancario'],
  'Conta bancária de terceiros (não é PJ/PF do cadastro)': ['titular_conta','cpf_cnpj_titular','comprovante_bancario'],
  'Dados bancários incompletos ou ilegíveis': ['banco','agencia','conta','titular_conta','comprovante_bancario'],
  'CNPJ divergente da Razão Social': ['cnpj','razao_social','comprovante_cnpj'],
  'Contrato Social ilegível ou desatualizado': ['contrato_social'],
  'IE inválida, vencida ou faltante': ['inscricao_estadual','comprovante_ie'],
  'Comprovante bancário faltante ou ilegível': ['comprovante_bancario'],
  'Documento de identidade ilegível': ['documento_identidade'],
  'CPF/CNPJ do titular não confere': ['cpf_cnpj_titular','titular_conta'],
  'Dados cadastrais incompletos': [],  // analista marca manualmente
  'Endereço incompleto ou inválido': ['cep','logradouro','numero','bairro','cidade','estado'],
  'Foto/CNH do motorista ilegível': ['documento_identidade_mot','comprovante_endereco_mot'],
  'ANTT/RNTRC inválido ou expirado': ['antt'],
  'E-mail ou telefone inválido': ['email','celular','telefone'],
  'Outros (descrever no campo abaixo)': [],
};

/* Labels amigáveis dos campos (para exibir no e-mail e no link de correção) */
export const CAMPO_LABELS = {
  razao_social:'Razão Social', nome_fantasia:'Nome Fantasia', cnpj:'CNPJ',
  inscricao_estadual:'Inscrição Estadual', nome_completo:'Nome Completo',
  cpf:'CPF', rg:'RG', data_nascimento:'Data de Nascimento',
  nome_completo_mot:'Nome do Motorista', cpf_mot:'CPF do Motorista',
  rg_mot:'RG do Motorista', data_nascimento_mot:'Data Nasc. Motorista',
  cnh_categoria:'CNH Categoria', antt:'ANTT/RNTRC',
  responsavel_nome:'Responsável', responsavel_cargo:'Cargo',
  telefone:'Telefone', celular:'Celular', email:'E-mail', website:'Website',
  cep:'CEP', logradouro:'Logradouro', numero:'Número', complemento:'Complemento',
  bairro:'Bairro', cidade:'Cidade', estado:'UF',
  banco:'Banco', tipo_conta:'Tipo de Conta', agencia:'Agência',
  conta:'Conta', titular_conta:'Titular da Conta',
  cpf_cnpj_titular:'CPF/CNPJ do Titular', pix:'PIX',
  comprovante_cnpj:'Cartão CNPJ', contrato_social:'Contrato Social',
  comprovante_bancario:'Comprovante Bancário', documento_identidade:'Doc. com Foto',
  documento_identidade_mot:'CNH/Documento Motorista',
  comprovante_endereco_mot:'Comprovante Endereço Motorista',
  comprovante_ie:'Comprovante IE',
};
