/* ── Sistema de Temas ─────────────────────────────── */
export const TEMAS = {
  premix_claro: {
    nome: 'Premix Claro',
    descricao: 'Tema institucional Premix (padrão)',
    bg: '#F5F7FA', surface: '#FFFFFF', surface2: '#F8F9FB', border: '#E5E9EF',
    text1: '#1A2332', text2: '#4F5868', text3: '#8B94A3',
    primary: '#00A650', primaryDark: '#008C44', primaryLight: '#E6F7EE',
  },
  premix_escuro: {
    nome: 'Premix Escuro',
    descricao: 'Versão noturna do tema Premix',
    bg: '#0A0F14', surface: '#161B22', surface2: '#1C2128', border: '#30363D',
    text1: '#E6EDF3', text2: '#9BA8B5', text3: '#6B7785',
    primary: '#34D399', primaryDark: '#10B981', primaryLight: 'rgba(52,211,153,.15)',
  },
  foco: {
    nome: 'Foco',
    descricao: 'Minimalista cinza, sem distrações',
    bg: '#FAFAFA', surface: '#FFFFFF', surface2: '#F4F4F5', border: '#E4E4E7',
    text1: '#18181B', text2: '#52525B', text3: '#A1A1AA',
    primary: '#3F3F46', primaryDark: '#27272A', primaryLight: '#F4F4F5',
  },
  campo: {
    nome: 'Campo',
    descricao: 'Verde Premix + dourado, ar rural',
    bg: '#F7F8F3', surface: '#FFFFFF', surface2: '#F0F2E8', border: '#D9DCC8',
    text1: '#2A3520', text2: '#556045', text3: '#8B9474',
    primary: '#00A650', primaryDark: '#008C44', primaryLight: '#E6F7EE',
  },
  noite: {
    nome: 'Noite',
    descricao: 'Preto puro, alta legibilidade',
    bg: '#000000', surface: '#0A0A0A', surface2: '#141414', border: '#262626',
    text1: '#FAFAFA', text2: '#A3A3A3', text3: '#737373',
    primary: '#22D3EE', primaryDark: '#06B6D4', primaryLight: 'rgba(34,211,238,.15)',
  },
};

/* Curadoria de wallpapers Unsplash (URLs estáveis, 1200x800 ~150kb) */
export const WALLPAPERS = [
  { id:'agro1', cat:'Agro',       url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=70', autor:'Federico Respini' },
  { id:'agro2', cat:'Agro',       url:'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=70', autor:'Mark Stosberg' },
  { id:'agro3', cat:'Agro',       url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=70', autor:'No Revisions' },
  { id:'agro4', cat:'Agro',       url:'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=70', autor:'Tim Mossholder' },
  { id:'nat1',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200&q=70', autor:'Sergei Akulich' },
  { id:'nat2',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=70', autor:'David Marcu' },
  { id:'nat3',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=70', autor:'Eberhard 🖐' },
  { id:'nat4',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=70', autor:'Luca Bravo' },
  { id:'abs1',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'abs2',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'abs3',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1554034483-04fda0d3507b?w=1200&q=70', autor:'Henry & Co.' },
  { id:'abs4',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=70', autor:'Solen Feyissa' },
  { id:'min1',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min2',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1557682260-96773eb01377?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min3',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1620503374956-c942862f0372?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min4',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1554034483-263c20973167?w=1200&q=70', autor:'Henry & Co.' },
  { id:'tex1',  cat:'Textura',    url:'https://images.unsplash.com/photo-1517137744914-fbb030f54116?w=1200&q=70', autor:'Annie Spratt' },
  { id:'tex2',  cat:'Textura',    url:'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=1200&q=70', autor:'Sven Mieke' },
  { id:'tex3',  cat:'Textura',    url:'https://images.unsplash.com/photo-1573164574511-73c773193279?w=1200&q=70', autor:'Steve Johnson' },
  { id:'tex4',  cat:'Textura',    url:'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200&q=70', autor:'Pawel Czerwinski' },
];

/* Cores customizáveis (paleta sugerida) */
export const CORES_SUGERIDAS = ['#00A650','#008C44','#2563EB','#7C3AED','#E63946','#D97706','#C8A951','#06B6D4','#EC4899','#10B981','#6366F1','#1A2332'];
