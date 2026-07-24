# Premix — Central de Cadastros Protheus

**Versão visual:** Premix Spatial UI 4.0

Painel interno do Núcleo Fiscal para receber, organizar, validar operacionalmente e copiar para o Protheus os dados de fornecedores, produtos e solicitações de desbloqueio.

A versão 4 acrescenta uma camada visual espacial e autoral sobre a base operacional existente: composição 3D procedural, Motion, profundidade, materiais translúcidos, iluminação contextual e microinterações. O painel continua priorizando legibilidade, velocidade e uso diário.

## Objetivo do projeto

O painel **não substitui o Protheus**. Ele concentra as informações recebidas e organiza a fila de trabalho para que o analista:

1. encontre rapidamente a solicitação;
2. visualize todos os dados recebidos;
3. copie campos individualmente, por seção ou em bloco;
4. registre o código gerado no Protheus;
5. devolva o cadastro quando necessário;
6. mantenha histórico, auditoria e indicadores operacionais.

Todos os dados já recebidos pelos formulários foram preservados. As telas de detalhes continuam exibindo campos dinâmicos existentes na base, inclusive informações que não estejam na lista prioritária do layout.

## Premix Spatial UI 4.0

- Login imersivo com composição 3D Premix, partículas, conexões e formulário em vidro.
- Hero 3D procedural na Visão Geral representando **Solicitação → Validação → Protheus → Conclusão**.
- Fundo atmosférico com malha, luzes azul/laranja, ruído, vinheta e parallax suave.
- Cards com perspectiva curta, reflexo contextual e contagem animada.
- Transições cinematográficas entre os módulos com Motion for React.
- Sidebar com profundidade, iluminação laranja e microinterações.
- Fluxo Protheus espacial com nós, pulso e conexão animada.
- Tabelas preservadas como superfícies sólidas, com microinterações e cabeçalho translúcido.
- Botões principais com efeito magnético discreto no desktop.
- Fallback Canvas 2D para dispositivos móveis, economia de dados e navegadores sem WebGL.
- Respeito a `prefers-reduced-motion`.

## Principais módulos

- **Visão Geral:** indicadores executivos, prioridades, fila pessoal, atividade recente e hero 3D operacional.
- **Fila Protheus:** fila unificada de fornecedores, produtos e desbloqueios, com fluxo espacial, filtros, ordenação, paginação, visões salvas, seleção em lote, cópia e CSV.
- **Cadastros:** tabelas operacionais separadas por fornecedor, produto e desbloqueio.
- **Detalhes / Modo Protheus:** drawer lateral com todos os dados recebidos, cópia por campo/seção, documentos, histórico, possíveis duplicidades e conclusão.
- **Gestão de Tarefas:** Kanban com arrastar e soltar, lista, agenda por prazo, checklist e comentários.
- **Relatórios:** volume, conclusão, devoluções, SLA e produtividade por responsável.
- **Histórico e Auditoria:** linha do tempo consolidada das ações.
- **Pendências Fiscais:** NF-e, pré-notas e CT-e com a mesma atmosfera visual.
- **Equipe:** administração de usuários conforme o papel de acesso.
- **Aparência:** tema claro/escuro Premix, densidade e sidebar compacta.

## Stack

- Next.js 14 — App Router
- React 18
- Motion for React
- React Three Fiber
- Drei
- Three.js
- Canvas 2D procedural como fallback
- Supabase
- Google APIs para sincronização agendada
- EmailJS chamado exclusivamente pelo servidor
- Vercel

## Instalação local

O `package-lock.json` anterior foi removido porque não contemplava as novas dependências espaciais. Gere um lockfile atualizado no primeiro preparo do projeto:

```bash
npm install
cp env.local.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

Copie `env.local.example` para `.env.local` e preencha os valores reais. No Vercel, cadastre as mesmas variáveis em **Project Settings → Environment Variables**.

Variáveis essenciais:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

Variáveis para e-mail:

- `EMAILJS_SERVICE`
- `EMAILJS_PUBLIC`
- `EMAILJS_TEMPLATE_APROVADO`
- `EMAILJS_TEMPLATE_DEVOLVIDO`
- `EMAILJS_TEMPLATE_DESBLOQ`
- `NEXT_PUBLIC_CORRECTION_FORM_URL`

Variáveis da sincronização fiscal:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `CRON_SECRET`

`NEXT_PUBLIC_SUPABASE_ANON_KEY` é opcional na versão ativa, pois as operações internas passam pelas rotas autenticadas do servidor.

## Tabelas já esperadas no Supabase

O projeto permanece compatível com as tabelas utilizadas pela versão recebida:

- `usuarios_painel`
- `fornecedores`
- `produtos`
- `desbloqueios`
- `kanban_tarefas`
- `preferencias_usuario`
- `auditoria`
- `tokens_correcao`
- `filiais`
- `monitor_xml`
- `pre_notas`

Não foi criada migração destrutiva. A camada Spatial UI não exige mudança no banco de dados.

## Build e deploy

Antes do push, o Claude deve executar:

```bash
npm install
npm run build
```

Depois do build aprovado:

```bash
git add .
git commit -m "feat: Premix Spatial UI v4"
git push
```

Com o repositório conectado ao Vercel, o deploy ocorre automaticamente.

## Validação recomendada antes de produção

1. Instalação das novas dependências e geração do `package-lock.json`.
2. Build de produção sem erros.
3. Login em desktop e celular, incluindo fallback sem WebGL.
4. Navegação entre todos os módulos e transições de página.
5. Abertura de fornecedor, produto e desbloqueio.
6. Cópia de campo, seção e cadastro completo.
7. Atribuição, devolução e conclusão com código Protheus.
8. Envio dos três modelos de e-mail.
9. Criação, movimentação, edição e exclusão de tarefa.
10. Pendências Fiscais, administração de usuários e sincronização por cron.
11. Tema escuro, responsividade e `prefers-reduced-motion`.
12. Verificação de desempenho em computadores corporativos mais modestos.

Leia também `CLAUDE_HANDOFF.md`, `PREMIX_SPATIAL_UI_V4.md`, `MELHORIAS_IMPLEMENTADAS.md`, `VALIDACAO_LOCAL.txt` e `SECURITY.md`.
