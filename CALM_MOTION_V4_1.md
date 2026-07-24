# Premix Spatial UI V4.1 — Calm Motion

Esta revisão corrige o excesso de movimento percebido na V4.

## Ajustes principais

- removidos parallax do fundo, câmera seguindo o cursor, tilt de cards e magnetismo dos botões;
- transições entre módulos reduzidas a um fade de 140 ms, sem blur, escala ou deslocamento;
- troca entre Pendentes e Concluídos/Devolvidos estabilizada, com área mínima fixa e fade discreto;
- hero reduzido e reorganizado para impedir sobreposição entre texto e composição 3D;
- cena 3D redesenhada com nós compactos, sem flutuação e com rotação extremamente lenta;
- partículas e brilhos reduzidos;
- tabelas sem deslocamento horizontal no hover;
- drawers sem efeito de mola e sem overshoot;
- pulsos contínuos removidos de status, sidebar e fluxo Protheus;
- logo Premix incluída localmente em `public/premix-logo.png`, evitando o bloco branco sem marca;
- `prefers-reduced-motion` continua sendo respeitado.

## Orientação para o Claude

1. Execute `npm ci` (ou `npm install` se o lockfile precisar ser regenerado).
2. Execute `npm run build`.
3. Faça um smoke test das abas Pendentes / Concluídos e Devolvidos em Fornecedores, Produtos e Desbloqueios.
4. Confirme a cena da Visão Geral em desktop e o fallback em telas menores.
5. Suba o conteúdo desta pasta para o repositório e faça o deploy pelo Vercel.
