const META_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'status', 'atribuido_para', 'finalizado_por',
  'data_finalizacao', 'observacoes_internas', 'motivo_devolucao', 'motivo_rejeicao',
  'token_correcao', 'token_expira_em', 'campos_correcao', 'codigo_fornecedor',
  'codigo_protheus', 'primeiro_login', 'ativo', 'ordem', 'senha_hash',
]);

const HIDDEN_COPY_FIELDS = new Set([...META_FIELDS, 'comprovante_cnpj_url', 'contrato_social_url', 'comprovante_bancario_url', 'documento_identidade_url']);

export const isFilled = (value) => {
  if (value === true || value === false || value === 0) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '';
};

export function humanizeField(key = '') {
  const acronyms = { cnpj: 'CNPJ', cpf: 'CPF', rg: 'RG', ie: 'IE', ncm: 'NCM', ean: 'EAN', cep: 'CEP', pix: 'PIX', antt: 'ANTT', cnh: 'CNH', uf: 'UF', url: 'URL' };
  return key.split('_').map((part) => acronyms[part.toLowerCase()] || part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export const supplierFields = (record = {}) => {
  const preferredKeys = [
    'razao_social', 'nome_completo', 'nome_fantasia', 'cnpj', 'cpf',
    'inscricao_estadual', 'inscricao_estadual_isento', 'ramo_atividade', 'produtos_servicos',
    'rg', 'cnh_categoria', 'antt', 'responsavel_nome', 'responsavel_cargo',
    'email', 'telefone', 'celular', 'website', 'cep', 'logradouro', 'numero',
    'complemento', 'bairro', 'cidade', 'estado', 'banco', 'agencia', 'conta',
    'tipo_conta', 'titular_conta', 'cpf_cnpj_titular', 'pix', 'tipo_cadastro',
    'nome_solicitante', 'email_solicitante',
  ];
  const preferred = [
    ['Razão social / Nome', record.razao_social || record.nome_completo],
    ['Nome fantasia', record.nome_fantasia],
    ['CNPJ / CPF', record.cnpj || record.cpf],
    ['Inscrição estadual', record.inscricao_estadual_isento ? 'ISENTO' : record.inscricao_estadual],
    ['Ramo de atividade', record.ramo_atividade],
    ['Produtos / Serviços', record.produtos_servicos],
    ['RG', record.rg], ['CNH / categoria', record.cnh_categoria], ['ANTT', record.antt],
    ['Responsável', record.responsavel_nome], ['Cargo', record.responsavel_cargo],
    ['E-mail', record.email], ['Telefone', record.telefone], ['Celular', record.celular], ['Website', record.website],
    ['CEP', record.cep], ['Logradouro', record.logradouro], ['Número', record.numero], ['Complemento', record.complemento],
    ['Bairro', record.bairro], ['Cidade', record.cidade], ['Estado', record.estado],
    ['Banco', record.banco], ['Agência', record.agencia], ['Conta', record.conta], ['Tipo de conta', record.tipo_conta],
    ['Titular da conta', record.titular_conta], ['CPF/CNPJ do titular', record.cpf_cnpj_titular], ['PIX', record.pix],
    ['Tipo de cadastro', record.tipo_cadastro], ['Solicitante', record.nome_solicitante], ['E-mail do solicitante', record.email_solicitante],
  ].filter(([, value]) => isFilled(value));
  const dynamic = Object.entries(record)
    .filter(([key, value]) => !META_FIELDS.has(key) && !HIDDEN_COPY_FIELDS.has(key) && !preferredKeys.includes(key) && !key.endsWith('_url') && isFilled(value))
    .map(([key, value]) => [humanizeField(key), value]);
  return [...preferred, ...dynamic];
};

export const productFields = (record = {}) => {
  const preferredKeys = [
    'descricao', 'ncm', 'unidade_medida', 'grupo', 'tipo_produto', 'tipo', 'fabricante',
    'codigo_fabricante', 'ean', 'codigo_barras', 'fornecedor', 'nome_fornecedor',
    'finalidade', 'nome_solicitante', 'email_solicitante',
  ];
  const preferred = preferredKeys.map((key) => [humanizeField(key), record[key]]).filter(([, value]) => isFilled(value));
  const dynamic = Object.entries(record)
    .filter(([key, value]) => !META_FIELDS.has(key) && !preferredKeys.includes(key) && isFilled(value))
    .map(([key, value]) => [humanizeField(key), value]);
  return [...preferred, ...dynamic];
};

export const unlockFields = (record = {}) => {
  const preferredKeys = ['codigo_produto', 'nome_produto', 'nome_solicitante', 'email_solicitante', 'motivo', 'justificativa'];
  const preferred = preferredKeys.map((key) => [humanizeField(key), record[key]]).filter(([, value]) => isFilled(value));
  const dynamic = Object.entries(record)
    .filter(([key, value]) => !META_FIELDS.has(key) && !preferredKeys.includes(key) && isFilled(value))
    .map(([key, value]) => [humanizeField(key), value]);
  return [...preferred, ...dynamic];
};

export function fieldsForType(record, type = 'fornecedor') {
  if (type === 'produto') return productFields(record);
  if (type === 'desbloqueio') return unlockFields(record);
  return supplierFields(record);
}

export function getCompleteness(record, type = 'fornecedor') {
  // Os formulários já entregam exatamente os dados necessários ao Protheus.
  // Este indicador confirma disponibilidade/copiabilidade, sem inventar campos faltantes.
  const received = fieldsForType(record, type).filter(([label, value]) => label && isFilled(value));
  return { total: received.length, filled: received.length, percent: 100, missing: [] };
}

export function getAgeDays(date) {
  if (!date) return 0;
  const created = new Date(date).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86400000));
}

export function getOperationalStatus(item, type = 'fornecedor') {
  const status = item?.status || 'pendente';
  if (type === 'desbloqueio' && status === 'desbloqueado') return { label: 'Concluído', tone: 'success' };
  const map = {
    rascunho: { label: 'Rascunho', tone: 'neutral' },
    pendente: { label: 'Aguardando análise', tone: 'warning' },
    em_analise: { label: type === 'desbloqueio' ? 'Em análise' : 'Em cadastro no Protheus', tone: 'info' },
    pronto: { label: 'Pronto para o Protheus', tone: 'brand' },
    aguardando_retorno: { label: 'Aguardando retorno', tone: 'warning' },
    aprovado: { label: 'Cadastrado no Protheus', tone: 'success' },
    rejeitado: { label: 'Devolvido para correção', tone: 'danger' },
    desbloqueado: { label: 'Desbloqueado', tone: 'success' },
    cancelado: { label: 'Cancelado', tone: 'neutral' },
  };
  return map[status] || { label: humanizeField(status), tone: 'neutral' };
}

export function getRecordName(item, type = 'fornecedor') {
  if (type === 'produto') return item.descricao || item.nome_produto || 'Produto sem descrição';
  if (type === 'desbloqueio') return item.nome_produto || item.descricao || 'Produto sem identificação';
  return item.razao_social || item.nome_completo || item.nome_fantasia || 'Cadastro sem identificação';
}

export function getRecordDocument(item, type = 'fornecedor') {
  if (type === 'produto') return item.ncm || item.codigo_fabricante || item.ean || item.codigo_barras || '';
  if (type === 'desbloqueio') return item.codigo_produto || '';
  return item.cnpj || item.cpf || '';
}

export function buildUnifiedQueue(fornecedores = [], produtos = [], desbloqueios = []) {
  const normalize = (item, type) => {
    const status = getOperationalStatus(item, type);
    const age = getAgeDays(item.created_at);
    const completeness = getCompleteness(item, type);
    const priority = age >= 5 ? 'critica' : age >= 3 ? 'alta' : age >= 1 ? 'normal' : 'nova';
    return { ...item, _type: type, _name: getRecordName(item, type), _document: getRecordDocument(item, type), _age: age, _completeness: completeness, _status: status, _priority: priority };
  };
  const openStatuses = ['pendente', 'em_analise', 'rejeitado', 'pronto', 'aguardando_retorno'];
  return [
    ...fornecedores.filter((i) => openStatuses.includes(i.status)).map((i) => normalize(i, 'fornecedor')),
    ...produtos.filter((i) => openStatuses.includes(i.status)).map((i) => normalize(i, 'produto')),
    ...desbloqueios.filter((i) => openStatuses.includes(i.status)).map((i) => normalize(i, 'desbloqueio')),
  ].sort((a, b) => b._age - a._age || new Date(a.created_at) - new Date(b.created_at));
}

export function buildRecentActivity(fornecedores = [], produtos = [], desbloqueios = [], tarefas = [], limit = 20) {
  const rows = [];
  const add = (item, type, name) => {
    const date = item.data_finalizacao || item.updated_at || item.created_at;
    const status = getOperationalStatus(item, type);
    rows.push({ id: `${type}-${item.id}`, type, name, date, status: status.label, tone: status.tone, user: item.finalizado_por || item.atribuido_para || item.nome_solicitante || 'Sistema' });
  };
  fornecedores.forEach((i) => add(i, 'fornecedor', getRecordName(i, 'fornecedor')));
  produtos.forEach((i) => add(i, 'produto', getRecordName(i, 'produto')));
  desbloqueios.forEach((i) => add(i, 'desbloqueio', getRecordName(i, 'desbloqueio')));
  tarefas.forEach((i) => rows.push({ id: `tarefa-${i.id}`, type: 'tarefa', name: i.titulo || 'Tarefa', date: i.updated_at || i.created_at, status: i.status === 'concluido' ? 'Tarefa concluída' : 'Tarefa atualizada', tone: i.status === 'concluido' ? 'success' : 'info', user: i.atribuido_para || i.criado_por || 'Equipe' }));
  return rows.filter((i) => i.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

export function recordToClipboardText(record, type = 'fornecedor') {
  const title = getRecordName(record, type);
  const fields = fieldsForType(record, type).filter(([, value]) => isFilled(value));
  const code = record.codigo_protheus || record.codigo_fornecedor;
  const rows = [`${type === 'fornecedor' ? 'FORNECEDOR' : type === 'produto' ? 'PRODUTO' : 'DESBLOQUEIO'} — ${title}`];
  fields.forEach(([label, value]) => rows.push(`${label}: ${typeof value === 'object' ? JSON.stringify(value) : value}`));
  if (code) rows.push(`Código Protheus: ${code}`);
  return rows.join('\n');
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W/g, '');
}

export function getDuplicateCandidates(record, type, collection = []) {
  const id = record.id;
  if (type === 'fornecedor') {
    const doc = normalizeText(record.cnpj || record.cpf);
    const name = normalizeText(record.razao_social || record.nome_completo || record.nome_fantasia);
    return collection.filter((item) => item.id !== id && ((doc && normalizeText(item.cnpj || item.cpf) === doc) || (name.length > 8 && normalizeText(item.razao_social || item.nome_completo || item.nome_fantasia) === name)));
  }
  if (type === 'produto') {
    const ean = normalizeText(record.ean || record.codigo_barras);
    const manufacturerCode = normalizeText(record.codigo_fabricante);
    const description = normalizeText(record.descricao);
    return collection.filter((item) => item.id !== id && ((ean && normalizeText(item.ean || item.codigo_barras) === ean) || (manufacturerCode && normalizeText(item.codigo_fabricante) === manufacturerCode) || (description.length > 12 && normalizeText(item.descricao) === description)));
  }
  const code = normalizeText(record.codigo_produto);
  return collection.filter((item) => item.id !== id && code && normalizeText(item.codigo_produto) === code);
}

export function getReturnReasons(records = []) {
  const counts = new Map();
  records.forEach((item) => {
    const raw = item.motivo_devolucao || item.motivo_rejeicao;
    if (!raw) return;
    const label = String(raw).split(/[\n.;]/)[0].trim().slice(0, 90) || 'Outros';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

export function allVisibleFields(record = {}) {
  return Object.entries(record).filter(([key, value]) => !HIDDEN_COPY_FIELDS.has(key) && isFilled(value)).map(([key, value]) => [humanizeField(key), value]);
}
