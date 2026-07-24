# Premix Spatial UI V4

## Conceito

A V4 introduz uma camada visual tridimensional sobre a Central de Cadastros sem transformar a ferramenta em uma landing page ou comprometer a operação. O conceito visual representa o fluxo real:

**Solicitação → Validação → Protheus → Conclusão**

A identidade continua baseada no azul e no laranja Premix. O 3D é utilizado como elemento de presença e narrativa; as tabelas e os formulários permanecem objetivos e legíveis.

## Implementação visual

### 1. Hero 3D procedural

O componente `components/spatial/SpatialSceneR3F.js` cria uma cena própria em React Three Fiber:

- núcleo azul translúcido;
- anéis luminosos;
- quatro módulos operacionais;
- conexões curvas;
- partículas e pontos laranja;
- iluminação azul e laranja;
- movimento orgânico;
- parallax de câmera pelo ponteiro.

A cena não depende de Spline, conta externa ou arquivo hospedado por terceiros.

### 2. Fallback de desempenho

`components/spatial/SpatialScene.js` escolhe automaticamente o motor:

- WebGL/React Three Fiber no desktop compatível;
- Canvas 2D procedural no celular, em economia de dados ou sem WebGL;
- versão estática/reduzida quando o sistema solicita menos movimento.

### 3. Fundo atmosférico

`SpatialBackground` e `app/spatial.css` adicionam:

- grid geométrico discreto;
- manchas de luz em profundidades diferentes;
- granulação suave;
- vinheta;
- iluminação contextual pelo cursor;
- deslocamento mínimo, sem interferir na leitura.

### 4. Superfícies físicas

`TiltSurface` aplica aos indicadores:

- perspectiva curta;
- inclinação máxima controlada;
- reflexo luminoso posicional;
- sombra difusa;
- retorno suave ao repouso.

### 5. Motion e continuidade

`PageMotion` utiliza Motion for React para:

- entrada e saída entre módulos;
- opacidade, deslocamento, escala e blur;
- transição curta com curva de aceleração suave;
- manutenção da percepção de continuidade.

A sidebar, drawers, filtros, menus e tabelas recebem microinterações complementares por CSS.

### 6. Login imersivo

O login possui:

- composição espacial em destaque;
- fundo azul-marinho;
- partículas e conexões;
- marca Premix em profundidade;
- formulário glassmorphism;
- orbes de luz;
- indicador de ambiente ativo;
- versão simplificada no celular.

### 7. Fluxo Protheus espacial

A Fila Protheus inclui uma trilha visual com quatro nós:

- Recebido;
- Validando;
- Pronto;
- Cadastrado.

Os nós possuem contagem animada, profundidade, pulso e conexão em movimento.

### 8. Tabelas e operação

As tabelas continuam sólidas. Foram adicionados apenas efeitos que preservam a produtividade:

- realce suave da linha;
- deslocamento mínimo no hover;
- cabeçalho translúcido e fixo;
- menus com escala e blur;
- status com pulso discreto;
- skeletons luminosos;
- transições após filtros e atualizações.

### 9. Cursor e botões

Os botões principais possuem magnetismo de baixa intensidade no desktop. O cursor não é substituído. O efeito é desativado no celular e com movimento reduzido.

### 10. Acessibilidade e performance

- `prefers-reduced-motion` desativa movimentos não essenciais;
- WebGL é limitado às áreas de impacto;
- DPR da cena é limitado;
- dispositivos móveis recebem Canvas simplificado;
- `saveData` força o fallback leve;
- a tabela e os formulários não dependem do motor 3D;
- falha de WebGL não bloqueia a aplicação.

## Arquivos principais

```text
components/spatial/
  SpatialLogin.js
  SpatialScene.js
  SpatialSceneCanvas.js
  SpatialSceneR3F.js
  SpatialUI.js

app/
  spatial.css
```

Integrações principais:

- `app/layout.js`: carrega a folha espacial;
- `app/page.js`: login, fundo atmosférico, transições e magnetismo;
- `components/premiumPanels.js`: hero, indicadores e fluxo Protheus;
- `app/pendencias/page.js`: atmosfera visual integrada.
