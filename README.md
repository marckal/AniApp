# AniApp - Ferramenta de Animação

Uma ferramenta de animação web inspirada no Flipnote (Nintendo DS) e Procreate, com suporte a desenho quadro a quadro, timeline com easing, camadas e exportação.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: PHP 8+ com SQLite
- **Estado**: Zustand
- **Ícones**: Lucide React

## Funcionalidades

### Desenho
- **Pincel** com controle de tamanho, opacidade e dureza
- **Borracha** para apagar traços
- **Balde de tinta** (Flood Fill) para preenchimento
- **Ferramenta de mão** para pan/zoom do canvas
- Suporte a **pressão** do stylus/touch

### Animação
- **Modo quadro a quadro** (flipbook) com onion skin
- **Timeline** com playback, loop e controle de velocidade
- **Easing curves**: Linear, Ease In, Ease Out, Ease In-Out, e funções cúbicas, senoidais e exponenciais
- **Editor de curva customizada** com pontos de controle

### Camadas
- Múltiplas camadas por frame
- Controle de opacidade e visibilidade
- Reordenação de camadas

### Projeto
- Presets de tamanho (HD 1080p, 4K, Square 1:1, Flipnote 256x192, sprites)
- FPS configurável (até 120fps)
- Fundo customizável
- Salvar/Carregar em JSON (`.ani`)
- Exportação de frames como sequência PNG

### Atalhos de Teclado
| Tecla | Ação |
|-------|------|
| `B` | Pincel |
| `E` | Borracha |
| `F` | Balde de tinta |
| `H` | Mover/Hand |
| `V` | Selecionar |
| `Espaço` | Play/Pause |
| `[` / `]` | Diminuir/Aumentar pincel |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` | Refazer |
| `Ctrl+N` | Novo projeto |
| `Ctrl+S` | Salvar projeto |
| `Ctrl+O` | Abrir projeto |

## Estrutura do Projeto

```
AniApp/
├── src/
│   ├── components/
│   │   ├── canvas/         # DrawingCanvas.tsx
│   │   ├── timeline/       # Timeline.tsx, LayerPanel.tsx
│   │   ├── tools/          # Toolbar.tsx, BrushSettings.tsx
│   │   └── modals/         # NewProjectModal.tsx
│   ├── lib/
│   │   ├── store.ts        # Zustand store
│   │   ├── easing.ts       # Funções de easing
│   │   └── utils.ts        # Utilitários (cn)
│   ├── types/
│   │   └── index.ts        # Tipos TypeScript
│   ├── App.tsx             # Componente principal
│   └── main.tsx            # Entry point
├── api/
│   ├── index.php           # API PHP (projetos, exportação)
│   └── .htaccess           # Rewrite rules
├── dist/                   # Build de produção
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

## Como Executar

### Desenvolvimento Frontend
```bash
npm install
npm run dev
```
Acesse `http://localhost:3000`

### Build de Produção
```bash
npm run build
```
O build será gerado em `dist/`

### Backend PHP
1. Configure um servidor Apache/NGINX apontando para a pasta do projeto
2. Certifique-se de que o PHP 8+ e a extensão `pdo_sqlite` estão instalados
3. A API estará disponível em `/api/projects`, `/api/export`, `/api/health`
4. Para reescrita de rotas, o `.htaccess` já está configurado na pasta `api/`

### Exemplo de deploy integrado
Coloque o conteúdo de `dist/` na raiz do servidor web e a pasta `api/` no mesmo nível. Configure o servidor para:
- Servir arquivos estáticos do `dist/`
- Redirecionar `/api/*` para `api/index.php`

## Tamanhos de Canvas Suportados

- **Máximo**: 4096x4096 (4K e além)
- Presets incluídos: HD 720p, HD 1080p, 4K UHD, Square, Story, Flipnote (256x192), Sprites (64x64, 128x128, 256x256)

## Licença

MIT
