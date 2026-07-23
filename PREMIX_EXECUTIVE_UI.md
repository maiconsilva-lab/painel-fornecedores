# Premix Executive UI

Esta versão aplica uma reconstrução visual do painel para aproximá-lo de um produto corporativo premium, sem alterar a finalidade operacional: receber os dados necessários e disponibilizá-los para cadastro manual no Protheus.

## Direção visual

- Sidebar azul-marinho com identidade Premix, navegação mais espaçada e item ativo com assinatura laranja.
- Topbar clara, mais baixa e funcional, com busca global como elemento principal.
- Cabeçalhos editoriais em vez de banners genéricos com gradientes e círculos decorativos.
- Azul Premix para ações principais; laranja reservado a assinatura, atenção e detalhes de marca.
- Fundos neutros, superfícies brancas, bordas discretas e sombras mínimas.
- Tipografia e números maiores, reduzindo a sensação de interface comprimida.
- Menos caixas independentes: indicadores e categorias foram reunidos em faixas contínuas.
- Tabelas tratadas como o elemento visual central da operação.
- Drawer de detalhes convertido em uma ficha cadastral mais limpa, com botões de cópia exibidos no contexto.
- Pendências Fiscais redesenhadas para pertencer ao mesmo ecossistema visual.

## Arquivo principal da camada visual

A nova camada está em:

```text
app/executive.css
```

Ela é importada depois de `globals.css` em `app/layout.js` e concentra os refinamentos executivos, incluindo responsividade e compatibilidade com o tema escuro.

## Componentes atualizados

- `components/premiumPanels.js`
  - cabeçalho editorial da Visão Geral;
  - faixa unificada de indicadores;
  - painéis operacionais e atividade recente;
  - volume por categoria com menor fragmentação visual.

- `app/page.js`
  - sidebar executiva;
  - identidade institucional;
  - topbar e busca global;
  - cabeçalhos, abas e conteúdo de Cadastros;
  - classes de apoio para painéis e estatísticas.

- `app/pendencias/page.js`
  - masthead institucional;
  - cabeçalho editorial;
  - seletor de filial e tabs;
  - indicadores, gráficos, filtros e tabelas.

## Princípios preservados

- Nenhum campo de fornecedor, produto ou desbloqueio foi removido.
- O painel continua sendo uma central de preparação e consulta para o Protheus, e não um substituto do ERP.
- Azul e laranja seguem a identidade Premix.
- Status semânticos continuam usando verde, amarelo e vermelho.
- Rotas, APIs e tabelas existentes foram preservadas.

## Revisão recomendada no ambiente real

Após o build, revisar em 1440×900 e 1920×1080:

1. comprimento do logotipo na sidebar;
2. nomes muito extensos nas tabelas;
3. quantidade real de filtros da Fila Protheus;
4. drawer com cadastros que possuam muitos campos;
5. tema escuro;
6. telas de 1366 px e notebooks com zoom do navegador acima de 100%;
7. Pendências Fiscais com grandes volumes de NF-e e CT-e.
