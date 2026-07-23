# Premix — Central de Cadastros Protheus

**Versão visual:** Premix Executive UI 3.0

Painel interno do Núcleo Fiscal para receber, organizar, validar operacionalmente e copiar para o Protheus os dados de fornecedores, produtos e solicitações de desbloqueio.

## Objetivo do projeto

O painel **não substitui o Protheus**. Ele concentra as informações recebidas e organiza a fila de trabalho para que o analista:

1. encontre rapidamente a solicitação;
2. visualize todos os dados recebidos;
3. copie campos individualmente, por seção ou em bloco;
4. registre o código gerado no Protheus;
5. devolva o cadastro quando necessário;
6. mantenha histórico, auditoria e indicadores operacionais.

Todos os dados já recebidos pelos formulários foram preservados. As telas de detalhes usam campos dinâmicos para também exibir informações existentes na base que não estejam na lista prioritária do layout.

## Principais módulos

- **Visão Geral:** indicadores executivos, prioridades, fila pessoal e atividade recente.
- **Fila Protheus:** fila unificada de fornecedores, produtos e desbloqueios, com filtros, ordenação, paginação, visões salvas, seleção em lote, cópia e CSV.
- **Cadastros:** tabelas operacionais separadas por fornecedor, produto e desbloqueio.
- **Detalhes / Modo Protheus:** drawer lateral com todos os dados recebidos, cópia por campo/seção, documentos, histórico, possíveis duplicidades e conclusão.
- **Gestão de Tarefas:** Kanban com arrastar e soltar, lista, agenda por prazo, checklist e comentários.
- **Relatórios:** volume, conclusão, devoluções, SLA e produtividade por responsável.
- **Histórico e Auditoria:** linha do tempo consolidada das ações.
- **Pendências Fiscais:** NF-e, pré-notas e CT-e, com identidade visual e navegação integradas.
- **Equipe:** administração de usuários conforme o papel de acesso.
- **Aparência:** tema claro/escuro Premix, densidade e sidebar compacta.

## Stack

- Next.js 14 (App Router)
- React 18
- Supabase
- Google APIs para sincronização agendada
- EmailJS chamado exclusivamente pelo servidor
- Vercel

## Instalação local

```bash
npm ci
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

O projeto foi mantido compatível com as tabelas utilizadas pela versão recebida:

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

Não foi criada migração destrutiva. Os recursos de checklist e comentários continuam usando os campos JSON já utilizados em `kanban_tarefas`.

## Build e deploy

```bash
npm ci
npm run build
```

Depois do build aprovado:

```bash
git add .
git commit -m "feat: central Premix premium para cadastros Protheus"
git push
```

Com o repositório conectado ao Vercel, o deploy ocorre automaticamente.

## Validação recomendada antes de produção

1. Login, logout e troca de senha.
2. Abertura de fornecedor, produto e desbloqueio.
3. Cópia de campo, seção e cadastro completo.
4. Atribuição, devolução e conclusão com código Protheus.
5. Envio dos três modelos de e-mail.
6. Criação, movimentação, edição e exclusão de tarefa.
7. Abertura das Pendências Fiscais e consulta por filial.
8. Administração de usuários com conta `admin` e `subadmin`.
9. Responsividade em desktop, tablet e celular.
10. Execução da rota de sincronização com o segredo do cron.

Leia também `CLAUDE_HANDOFF.md`, `MELHORIAS_IMPLEMENTADAS.md`, `PREMIX_EXECUTIVE_UI.md` e `SECURITY.md`.
