import type { Project, Frame, Stroke } from '@/types';

export interface AnimationPrinciple {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  shortDesc: string;
  description: string;
  bookSource: string;
  keyLessons: string[];
  generateProject: () => Project;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function makeCircle(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  size = 3,
  filled = true,
  fillColor?: string,
  opacity = 1
): Stroke {
  const start = { x: cx - rx, y: cy - ry };
  const end = { x: cx + rx, y: cy + ry };
  return {
    tool: 'circle',
    color,
    size,
    opacity,
    filled,
    fillColor: fillColor || color,
    startPoint: start,
    endPoint: end,
    points: [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }],
  };
}

function makeRect(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  size = 3,
  filled = true,
  fillColor?: string,
  opacity = 1
): Stroke {
  const start = { x, y };
  const end = { x: x + w, y: y + h };
  return {
    tool: 'rectangle',
    color,
    size,
    opacity,
    filled,
    fillColor: fillColor || color,
    startPoint: start,
    endPoint: end,
    points: [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }],
  };
}

function makeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  size = 3,
  opacity = 1
): Stroke {
  const start = { x: x1, y: y1 };
  const end = { x: x2, y: y2 };
  return {
    tool: 'line',
    color,
    size,
    opacity,
    startPoint: start,
    endPoint: end,
    points: [start, end],
  };
}

function makeFrame(strokes: Stroke[]): Frame {
  return {
    id: genId(),
    layers: [
      {
        id: genId(),
        name: 'Desenho Principal',
        visible: true,
        opacity: 1,
        strokes,
        undoStack: [],
        redoStack: [],
      },
    ],
    duration: 1,
    easing: 'linear',
    customCurve: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }],
  };
}

export const ANIMATION_PRINCIPLES: AnimationPrinciple[] = [
  // 1. Squash and Stretch
  {
    id: 'squash-stretch',
    number: 1,
    title: 'Squash & Stretch (Esmagar e Esticar)',
    subtitle: 'O princípio número um da animação clássica',
    shortDesc: 'Confere sensação de peso, flexibilidade e vida mantendo o volume do objeto constante.',
    description:
      'Considerado o princípio mais importante por Frank Thomas & Ollie Johnston. Quando um objeto se move e atinge uma superfície, ele se achata (squash) e estica na velocidade máxima (stretch). O segredo fundamental (enfatizado por Richard Williams) é conservar a massa: se a altura reduz para a metade, a largura deve dobrar.',
    bookSource: 'The Illusion of Life (Cap. 3) / Animator\'s Survival Kit (Pág. 35)',
    keyLessons: [
      'Volume Constante: Área (largura × altura) deve se manter parecida.',
      'Deformação na Velocidade: Maior esticamento ocorre nos quadros de queda mais rápida.',
      'Impacto no Solo: O esmagamento máximo ocorre exatamente no ponto de contato.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const groundY = 820;
      const baseR = 75;
      const frames: Frame[] = [];

      // 12 quadros de quique completo
      const motionData = [
        { y: 250, rx: baseR, ry: baseR },        // 1: topo
        { y: 340, rx: baseR - 8, ry: baseR + 10 }, // 2: início queda
        { y: 460, rx: baseR - 15, ry: baseR + 20 },// 3: aceleração
        { y: 620, rx: baseR - 25, ry: baseR + 32 },// 4: velocidade máxima
        { y: groundY - 45, rx: baseR + 45, ry: 45 },// 5: SQUASH (solo)
        { y: 600, rx: baseR - 22, ry: baseR + 28 },// 6: impulso de subida
        { y: 440, rx: baseR - 12, ry: baseR + 15 },// 7: desacelerando
        { y: 320, rx: baseR - 4, ry: baseR + 5 },  // 8: quase no topo
        { y: 250, rx: baseR, ry: baseR },          // 9: ápice (esfera perfeita)
        { y: 250, rx: baseR, ry: baseR },          // 10: hold
      ];

      for (const m of motionData) {
        const strokes: Stroke[] = [];
        // Chão de referência
        strokes.push(makeLine(300, groundY, 1620, groundY, '#334155', 6));
        // Sombra suave no chão
        const shadowScale = Math.max(0.2, 1 - (groundY - m.y) / 600);
        strokes.push(
          makeCircle(W / 2, groundY + 15, (m.rx + 20) * shadowScale, 12 * shadowScale, 'rgba(0,0,0,0.15)', 1, true, '#cbd5e1', 0.4)
        );
        // Bola em movimento
        strokes.push(
          makeCircle(W / 2, m.y, m.rx, m.ry, '#000000', 5, true, '#f5c518', 1)
        );
        // Brilho decorativo
        strokes.push(
          makeCircle(W / 2 - m.rx * 0.3, m.y - m.ry * 0.3, m.rx * 0.25, m.ry * 0.25, 'rgba(255,255,255,0.8)', 1, true, '#ffffff', 0.9)
        );
        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '01. Squash & Stretch',
        width: W,
        height: H,
        fps: 12,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 2. Anticipation
  {
    id: 'anticipation',
    number: 2,
    title: 'Anticipation (Antecipação)',
    subtitle: 'Prepara o espectador para a ação principal',
    shortDesc: 'Um movimento recua na direção oposta antes de disparar para a frente.',
    description:
      'Richard Williams enfatiza que em animação o público deve entender o movimento fração de segundo antes de ele acontecer. A antecipação prepara a musculatura e o olhar: um salto começa agachando; um arremesso recua o braço.',
    bookSource: 'The Illusion of Life (Cap. 4) / Animator\'s Survival Kit (Pág. 48)',
    keyLessons: [
      'Direção Oposta: Para ir para a direita, primeiro recue levemente para a esquerda.',
      'Clareza Narrativa: Evita que movimentos rápidos pareçam aparições repentinas.',
      'Contraste de Energia: Maior a antecipação = maior a força da ação principal.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const groundY = 780;
      const frames: Frame[] = [];

      // Sequência: 1-3 Recuo/Agachamento (Antecipação), 4-6 Disparo, 7-9 Pouso
      const sequence = [
        { x: 400, y: groundY - 120, w: 120, h: 240, color: '#3b82f6', label: 'Repouso' },
        { x: 370, y: groundY - 80, w: 150, h: 160, color: '#ef4444', label: 'ANTECIPAÇÃO (Agacha & Recua)' },
        { x: 350, y: groundY - 60, w: 170, h: 120, color: '#ef4444', label: 'ANTECIPAÇÃO MÁXIMA' },
        { x: 600, y: groundY - 260, w: 200, h: 100, color: '#f5c518', label: 'Disparo (Impulso)' },
        { x: 950, y: groundY - 450, w: 110, h: 260, color: '#f5c518', label: 'Ápice do Salto' },
        { x: 1300, y: groundY - 220, w: 180, h: 120, color: '#10b981', label: 'Impacto de Pouso' },
        { x: 1450, y: groundY - 120, w: 120, h: 240, color: '#3b82f6', label: 'Estabilização' },
      ];

      for (const s of sequence) {
        const strokes: Stroke[] = [];
        strokes.push(makeLine(200, groundY, 1720, groundY, '#334155', 6));
        // Personagem em bloco
        strokes.push(makeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, '#000000', 5, true, s.color, 0.95));
        // Olho expressivo para indicar direção
        strokes.push(makeCircle(s.x + s.w * 0.25, s.y - s.h * 0.25, 14, 14, '#000000', 2, true, '#ffffff', 1));
        strokes.push(makeCircle(s.x + s.w * 0.3, s.y - s.h * 0.25, 5, 5, '#000000', 1, true, '#000000', 1));
        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '02. Anticipation',
        width: W,
        height: H,
        fps: 8,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 3. Staging
  {
    id: 'staging',
    number: 3,
    title: 'Staging (Encenação)',
    subtitle: 'Dirige a atenção do espectador de forma inconfundível',
    shortDesc: 'Apresentação de uma ideia visual de forma limpa, com silhueta clara e enquadramento forte.',
    description:
      'Encenar é organizar todos os elementos na tela (personagem, luz, posição, câmera) para que a ação principal seja compreendida instantaneamente. Teste de fogo da Disney: se preenchermos o personagem de preto, a silhueta ainda explica o que ele está fazendo?',
    bookSource: 'The Illusion of Life (Cap. 5) / Animator\'s Survival Kit (Pág. 62)',
    keyLessons: [
      'Silhueta Limpa: A ação deve ser compreensível mesmo sem detalhes internos.',
      'Foco Único: Apenas uma ação primária de cada vez na tela.',
      'Contraste de Cenário: Elementos secundários não podem poluir a área da ação.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      for (let i = 0; i < 8; i++) {
        const strokes: Stroke[] = [];
        // Fundo escuro de teatro/foco
        strokes.push(makeRect(100, 100, W - 200, H - 200, '#1e293b', 4, true, '#0f172a', 1));
        // Holofote direcionado (Staging via iluminação)
        const spotX = 700 + i * 70;
        strokes.push(makeCircle(spotX, 540, 320, 320, '#f5c518', 2, true, '#fef08a', 0.25));

        // Personagem em silhueta nítida no centro do holofote
        strokes.push(makeCircle(spotX, 420, 65, 65, '#000000', 4, true, '#090d16', 1)); // Cabeça
        strokes.push(makeRect(spotX - 45, 485, 90, 160, '#000000', 4, true, '#090d16', 1)); // Tronco
        // Braço estendido apontando com clareza
        strokes.push(makeLine(spotX + 45, 520, spotX + 160, 480 - (i % 2) * 20, '#090d16', 18));
        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '03. Staging',
        width: W,
        height: H,
        fps: 8,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f1f5f9',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 4. Straight Ahead Action & Pose to Pose
  {
    id: 'straight-ahead-pose-to-pose',
    number: 4,
    title: 'Straight Ahead & Pose to Pose (Ação Direta vs Pose a Pose)',
    subtitle: 'Os dois métodos fundamentais de criação de quadros',
    shortDesc: 'Pose a Pose estrutura chaves (Keyframes). Ação Direta gera fluidez orgânica e imprevisível.',
    description:
      'Richard Williams ensina a combinar as duas técnicas: use Pose to Pose para estruturar o planejamento geométrico e marcas rígidas; depois aplique Straight Ahead para animações de água, fogo, cabelos e panos soltos.',
    bookSource: 'The Illusion of Life (Cap. 6) / Animator\'s Survival Kit (Pág. 78)',
    keyLessons: [
      'Keyframes (Poses-Chave): Poses principais que definem o início, meio e fim.',
      'In-betweens (Interpolação): Quadros intermediários que conectam as chaves.',
      'Ação Direta: Sequencial, ideal para elementos fluídos e imprevisíveis.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      for (let i = 0; i < 10; i++) {
        const strokes: Stroke[] = [];
        // Linhas de trilho indicando planejamento Pose to Pose
        strokes.push(makeLine(200, 350, 1720, 350, '#94a3b8', 3));
        strokes.push(makeLine(200, 750, 1720, 750, '#94a3b8', 3));

        // TOPO: Pose to Pose (Keyframes em Azul, Inbetweens em Dourado)
        const isKeyframe = i === 0 || i === 4 || i === 9;
        const topX = 250 + i * 150;
        strokes.push(
          makeCircle(topX, 350, 50, 50, '#000000', 4, true, isKeyframe ? '#3b82f6' : '#f5c518', 1)
        );

        // BASE: Straight Ahead (Crescimento orgânico e variado)
        const botX = 250 + i * 140;
        const botY = 750 - Math.sin(i * 0.6) * 80;
        strokes.push(
          makeRect(botX - 40, botY - 40, 80, 80, '#000000', 4, true, '#10b981', 0.9)
        );
        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '04. Straight Ahead & Pose to Pose',
        width: W,
        height: H,
        fps: 10,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 5. Follow Through & Overlapping Action
  {
    id: 'follow-through-overlapping',
    number: 5,
    title: 'Follow Through & Overlapping (Continuidade e Sobreposição)',
    subtitle: 'Nada para tudo ao mesmo tempo',
    shortDesc: 'Partes soltas (caudas, cabelos, tecidos) continuam se movendo após o corpo principal parar.',
    description:
      'Princípio fundamental do *"Animator\'s Survival Kit"*: diferentes partes de um corpo se movem em tempos diferentes (Overlapping). Quando o bloco principal para bruscamente, os elementos anexados continuam pelo efeito da inércia (Follow Through).',
    bookSource: 'The Illusion of Life (Cap. 7) / Animator\'s Survival Kit (Pág. 120)',
    keyLessons: [
      'Arraste (Drag): O apêndice se atrasa em relação à cabeça/corpo.',
      'Reversão de Curva: O movimento forma um S no ar ao mudar de direção.',
      'Parada Desfasada: O corpo para primeiro; a cauda/cabelo para por último.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const groundY = 750;
      const frames: Frame[] = [];

      // Bloco principal se move e para no quadro 5
      const positions = [
        { x: 300, tailAngle: -0.6 },
        { x: 550, tailAngle: -0.8 },
        { x: 800, tailAngle: -0.9 },
        { x: 1050, tailAngle: -0.9 },
        { x: 1150, tailAngle: 0.2 },  // Parada brusca! A cauda avança por inércia
        { x: 1150, tailAngle: 0.8 },  // Ultrapassagem (Overshoot)
        { x: 1150, tailAngle: 0.4 },  // Retorno
        { x: 1150, tailAngle: -0.1 }, // Estabilizando
        { x: 1150, tailAngle: 0 },    // Repouso
      ];

      for (const p of positions) {
        const strokes: Stroke[] = [];
        strokes.push(makeLine(200, groundY, 1720, groundY, '#334155', 6));
        // Bloco principal
        strokes.push(makeRect(p.x - 70, groundY - 140, 140, 140, '#000000', 4, true, '#6366f1', 1));

        // Cauda flexível articulada em 3 segmentos
        let currX = p.x;
        let currY = groundY - 140;
        const segLen = 90;
        for (let s = 0; s < 3; s++) {
          const angle = p.tailAngle * (1 + s * 0.4);
          const nextX = currX + Math.sin(angle) * segLen;
          const nextY = currY - Math.cos(angle) * segLen;
          strokes.push(makeLine(currX, currY, nextX, nextY, '#ef4444', 12 - s * 2));
          strokes.push(makeCircle(nextX, nextY, 10 - s * 2, 10 - s * 2, '#000000', 2, true, '#f5c518', 1));
          currX = nextX;
          currY = nextY;
        }

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '05. Follow Through & Overlapping',
        width: W,
        height: H,
        fps: 10,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 6. Slow In and Slow Out (Ease In / Ease Out)
  {
    id: 'slow-in-slow-out',
    number: 6,
    title: 'Slow In & Slow Out (Ease In & Ease Out)',
    subtitle: 'Controle de aceleração e desaceleração pelo espaçamento',
    shortDesc: 'Mais quadros perto das poses extremas geram movimento suave e natural.',
    description:
      'Richard Williams demonstra no *"Survival Kit"* a diferença vital entre Spacing (espaçamento gráfico) e Timing (tempo total). Movimentos mecânicos possuem espaçamento uniforme. Movimentos orgânicos começam devagar (Slow Out) e terminam devagar (Slow In).',
    bookSource: 'The Illusion of Life (Cap. 8) / Animator\'s Survival Kit (Pág. 142)',
    keyLessons: [
      'Espaçamento Gráfico: Distância entre os centros do objeto a cada quadro.',
      'Ease In: Diminuição da velocidade na chegada de uma pose.',
      'Ease Out: Aumento gradual da velocidade na saída de uma pose.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      // Curva de facilitação sinusoidal (Slow In / Slow Out)
      const totalFrames = 12;
      for (let f = 0; f < totalFrames; f++) {
        const t = f / (totalFrames - 1);
        // Função Easing EaseInOutSine
        const easedT = -(Math.cos(Math.PI * t) - 1) / 2;

        const strokes: Stroke[] = [];
        // Trilhos de comparação
        strokes.push(makeLine(250, 400, 1670, 400, '#cbd5e1', 4));
        strokes.push(makeLine(250, 700, 1670, 700, '#cbd5e1', 4));

        // TOPO: Movimento Mecânico Uniforme (Linear)
        const linearX = 250 + t * (1670 - 250);
        strokes.push(makeCircle(linearX, 400, 45, 45, '#000000', 3, true, '#94a3b8', 1));

        // BASE: Movimento Orgânico com Slow In & Slow Out (Ease In/Out)
        const easedX = 250 + easedT * (1670 - 250);
        strokes.push(makeCircle(easedX, 700, 50, 50, '#000000', 4, true, '#10b981', 1));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '06. Slow In & Slow Out',
        width: W,
        height: H,
        fps: 12,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 7. Arcs
  {
    id: 'arcs',
    number: 7,
    title: 'Arcs (Arcos Naturalistas)',
    subtitle: 'Trajetórias curvas e orgânicas para seres vivos',
    shortDesc: 'Praticamente todos os movimentos humanos e animais seguem arcos em vez de linhas retas.',
    description:
      'As articulações do corpo (ombros, cotovelos, joelhos) funcionam como pivôs de rotação. Richard Williams alerta: animações que se movem em linhas retas parecem robóticas ou travadas. Sempre desenhe arcos de guia.',
    bookSource: 'The Illusion of Life (Cap. 9) / Animator\'s Survival Kit (Pág. 168)',
    keyLessons: [
      'Estrutura Articulada: Braços, cabeças e membros giram ao redor de juntas.',
      'Curva de Trajetória: Teste os pontos intermediários verificando se formam um arco contínuo.',
      'Exceções: Golpes diretos e forças mecânicas mecânicas podem usar linhas retas.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const pivotX = 400, pivotY = 540;
      const armLength = 550;
      const frames: Frame[] = [];

      for (let i = 0; i < 12; i++) {
        const angle = -Math.PI / 3 + (i / 11) * ((2 * Math.PI) / 3); // -60° até +60°
        const handX = pivotX + Math.sin(angle) * armLength;
        const handY = pivotY + Math.cos(angle) * armLength;

        const strokes: Stroke[] = [];
        // Arco de guia pontilhado visual
        for (let a = -Math.PI / 3; a <= Math.PI / 3; a += 0.1) {
          const gx = pivotX + Math.sin(a) * armLength;
          const gy = pivotY + Math.cos(a) * armLength;
          strokes.push(makeCircle(gx, gy, 4, 4, '#cbd5e1', 1, true, '#cbd5e1', 1));
        }

        // Pivô (Ombro)
        strokes.push(makeCircle(pivotX, pivotY, 25, 25, '#000000', 3, true, '#3b82f6', 1));
        // Braço articulado
        strokes.push(makeLine(pivotX, pivotY, handX, handY, '#000000', 12));
        // Mão (Esfera na ponta do arco)
        strokes.push(makeCircle(handX, handY, 40, 40, '#000000', 4, true, '#f5c518', 1));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '07. Arcs',
        width: W,
        height: H,
        fps: 12,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 8. Secondary Action
  {
    id: 'secondary-action',
    number: 8,
    title: 'Secondary Action (Ação Secundária)',
    subtitle: 'Ações complementares que reforçam a ideia principal',
    shortDesc: 'Movimentos adicionais que enriquecem a ação primária e adicionam dimensão.',
    description:
      'Uma ação secundária NUNCA deve competir com a ação principal. Se um personagem está caminhando alegremente (ação principal), abanar um chapéu ou balançar os braços (ação secundária) enriquece a cena.',
    bookSource: 'The Illusion of Life (Cap. 10) / Animator\'s Survival Kit (Pág. 210)',
    keyLessons: [
      'Subordinação: A ação secundária deve apoiar, não distrair da ação primária.',
      'Naturalidade: Adiciona camadas de personalidade ao personagem.',
      'Expressividade: Mostra emoção e estado mental de forma orgânica.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const groundY = 780;
      const frames: Frame[] = [];

      for (let i = 0; i < 10; i++) {
        const bodyX = 350 + i * 130;
        const bobY = Math.sin(i * 0.8) * 30;
        const headY = groundY - 200 + bobY;

        const strokes: Stroke[] = [];
        strokes.push(makeLine(200, groundY, 1720, groundY, '#334155', 6));

        // AÇÃO PRIMÁRIA: Personagem caminhando (Cabeça & Corpo)
        strokes.push(makeCircle(bodyX, headY, 60, 60, '#000000', 4, true, '#3b82f6', 1));

        // AÇÃO SECUNDÁRIA: Antenas/Cabelo balançando alegremente com atraso
        const antennaAngle = Math.cos(i * 0.8) * 0.4;
        const antX = bodyX + Math.sin(antennaAngle) * 90;
        const antY = headY - 60 - Math.cos(antennaAngle) * 90;
        strokes.push(makeLine(bodyX, headY - 60, antX, antY, '#ef4444', 8));
        strokes.push(makeCircle(antX, antY, 16, 16, '#000000', 2, true, '#f5c518', 1));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '08. Secondary Action',
        width: W,
        height: H,
        fps: 10,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 9. Timing & Spacing
  {
    id: 'timing-spacing',
    number: 9,
    title: 'Timing & Spacing (Temporização e Espaçamento)',
    subtitle: 'Dita o peso, tamanho e velocidade dos objetos',
    shortDesc: 'Timing é o tempo total (quantidade de quadros). Spacing é a distância entre quadros.',
    description:
      'Regra de ouro de Richard Williams (*"The Animator\'s Survival Kit"*): "O número de quadros entre duas poses determina a velocidade. O espaçamento desses quadros determina a aceleração e o peso".',
    bookSource: 'The Illusion of Life (Cap. 11) / Animator\'s Survival Kit (Pág. 18)',
    keyLessons: [
      'Peso Pesado (Bola de Boliche): Requer mais força e desaceleração gradual.',
      'Peso Leve (Bola de Ping-Pong): Reage instantaneamente e quica com alta frequência.',
      'Número de Quadros: Animar em 1s (On Ones - 24fps) vs 2s (On Twos - 12fps).',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      for (let i = 0; i < 10; i++) {
        const strokes: Stroke[] = [];
        strokes.push(makeLine(200, 540, 1720, 540, '#94a3b8', 2));

        // Objeto LEVE (Movimento rápido e fluido)
        const lightX = 300 + i * 140;
        strokes.push(makeCircle(lightX, 350, 35, 35, '#000000', 3, true, '#10b981', 1));

        // Objeto PESADO (Inércia forte, avança com resistência)
        const heavyX = 300 + Math.pow(i / 9, 1.8) * 1260;
        strokes.push(makeCircle(heavyX, 730, 70, 70, '#000000', 5, true, '#64748b', 1));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '09. Timing & Spacing',
        width: W,
        height: H,
        fps: 10,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 10. Exaggeration
  {
    id: 'exaggeration',
    number: 10,
    title: 'Exaggeration (Exagero)',
    subtitle: 'Intensifica a essência da realidade sem perder a plausibilidade',
    shortDesc: 'Aumentar a expressão ou deformação para tornar a animação mais dramática e viva.',
    description:
      'Frank Thomas & Ollie Johnston explicam que copiar a realidade puramente parece sem graça na animação. O exagero leva a forma e a ação ao extremo mantendo o sentimento verdadeiro.',
    bookSource: 'The Illusion of Life (Cap. 12) / Animator\'s Survival Kit (Pág. 280)',
    keyLessons: [
      'Distorção Extrema: Levar os limites formais além do real durante os quadros de impacto.',
      'Expressividade: Caricatura e dinamismo nas linhas e formatos.',
      'Equilíbrio: Exagerar com propósito narrativo.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      const stages = [
        { rx: 70, ry: 70, color: '#3b82f6', label: 'Normal' },
        { rx: 50, ry: 90, color: '#3b82f6', label: 'Carregando' },
        { rx: 160, ry: 30, color: '#ef4444', label: 'EXAGERO EXTREMO!' },
        { rx: 40, ry: 150, color: '#f5c518', label: 'Rebote Esticado' },
        { rx: 70, ry: 70, color: '#3b82f6', label: 'Estabilizado' },
      ];

      for (const s of stages) {
        const strokes: Stroke[] = [];
        strokes.push(makeCircle(W / 2, 540, s.rx, s.ry, '#000000', 5, true, s.color, 1));
        // Olhos cartoon expressivos exagerados
        strokes.push(makeCircle(W / 2 - s.rx * 0.3, 540 - s.ry * 0.2, 18, 28, '#000000', 2, true, '#ffffff', 1));
        strokes.push(makeCircle(W / 2 + s.rx * 0.3, 540 - s.ry * 0.2, 18, 28, '#000000', 2, true, '#ffffff', 1));
        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '10. Exaggeration',
        width: W,
        height: H,
        fps: 6,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 11. Solid Drawing
  {
    id: 'solid-drawing',
    number: 11,
    title: 'Solid Drawing (Desenho Sólido / Tridimensionalidade)',
    subtitle: 'Respeita volume, massa e perspectiva tridimensional no espaço 2D',
    shortDesc: 'Compreensão de volume 3D, peso, iluminação e eixos de rotação no plano 2D.',
    description:
      'Evite formas "planas" sem profundidade. Richard Williams e Disney reforçam que desenhar com volume significa considerar eixos X, Y e Z no papel/tela canvas.',
    bookSource: 'The Illusion of Life (Cap. 13) / Animator\'s Survival Kit (Pág. 302)',
    keyLessons: [
      'Linhas de Contorno 3D: Ajudam a revelar o volume esférico ou cilíndrico.',
      'Perspectiva e Esforço: Formas diminuem ao se afastar no espaço Z.',
      'Sobreposição Tridimensional: Partes da frente ocultam partes de trás.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const strokes: Stroke[] = [];
        const cx = W / 2, cy = H / 2;
        const size = 180;

        // Cubo 3D girando em perspectiva
        const p1 = { x: cx + cos * size - sin * size * 0.5, y: cy + sin * size * 0.5 - size * 0.5 };
        const p2 = { x: cx - cos * size - sin * size * 0.5, y: cy - sin * size * 0.5 - size * 0.5 };
        const p3 = { x: cx - cos * size + sin * size * 0.5, y: cy - sin * size * 0.5 + size * 0.5 };
        const p4 = { x: cx + cos * size + sin * size * 0.5, y: cy + sin * size * 0.5 + size * 0.5 };

        strokes.push(makeLine(p1.x, p1.y, p2.x, p2.y, '#3b82f6', 4));
        strokes.push(makeLine(p2.x, p2.y, p3.x, p3.y, '#3b82f6', 4));
        strokes.push(makeLine(p3.x, p3.y, p4.x, p4.y, '#3b82f6', 4));
        strokes.push(makeLine(p4.x, p4.y, p1.x, p1.y, '#3b82f6', 4));

        // Esfera 3D com linhas de latitude/longitude
        strokes.push(makeCircle(cx, cy, 140, 140, '#000000', 4, false));
        strokes.push(makeCircle(cx, cy, Math.abs(cos * 140), 140, '#f5c518', 2, false));
        strokes.push(makeCircle(cx, cy, 140, Math.abs(sin * 140), '#10b981', 2, false));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '11. Solid Drawing',
        width: W,
        height: H,
        fps: 12,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  // 12. Appeal
  {
    id: 'appeal',
    number: 12,
    title: 'Appeal (Carisma e Design Atraente)',
    subtitle: 'Design magnético que atrai o interesse do público',
    shortDesc: 'Carisma não significa fofo; significa ter um design marcante com personalidade e boa leitura.',
    description:
      'Appeal é a qualidade que faz o público gostar de olhar para um personagem (herói ou vilão). Frank Thomas & Ollie Johnston recomendam usar contraste de proporções (formas grandes + médias + pequenas).',
    bookSource: 'The Illusion of Life (Cap. 14) / Animator\'s Survival Kit (Pág. 330)',
    keyLessons: [
      'Hierarquia de Formas: Combine formas primárias (círculos/retângulos) com variação de escala.',
      'Personalidade Clara: Formas pontiagudas transmitem perigo; arredondadas transmitem simpatia.',
      'Silhueta Expressiva: Fácil reconhecimento de relance.',
    ],
    generateProject: () => {
      const W = 1920, H = 1080;
      const frames: Frame[] = [];

      for (let i = 0; i < 8; i++) {
        const cx = W / 2, cy = H / 2;

        const strokes: Stroke[] = [];
        // Fundo decorativo atraente
        strokes.push(makeCircle(cx, cy, 300, 300, '#fef08a', 2, true, '#fef08a', 0.5));

        // Personagem carismático (combinação de Formas Círculo + Olhos Grandes)
        strokes.push(makeCircle(cx, cy + 20, 140, 130, '#000000', 6, true, '#f5c518', 1));

        // Olhos expressivos gigantes (Appeal clássico Disney)
        const eyeOffset = Math.sin(i * 0.8) * 15;
        strokes.push(makeCircle(cx - 50 + eyeOffset, cy - 20, 35, 45, '#000000', 3, true, '#ffffff', 1));
        strokes.push(makeCircle(cx + 50 + eyeOffset, cy - 20, 35, 45, '#000000', 3, true, '#ffffff', 1));

        // Pupilas brilhantes
        strokes.push(makeCircle(cx - 45 + eyeOffset, cy - 20, 18, 22, '#000000', 1, true, '#090d16', 1));
        strokes.push(makeCircle(cx + 55 + eyeOffset, cy - 20, 18, 22, '#000000', 1, true, '#090d16', 1));
        strokes.push(makeCircle(cx - 40 + eyeOffset, cy - 26, 6, 6, '#ffffff', 1, true, '#ffffff', 1));
        strokes.push(makeCircle(cx + 60 + eyeOffset, cy - 26, 6, 6, '#ffffff', 1, true, '#ffffff', 1));

        // Sorriso alegre
        strokes.push(makeCircle(cx + eyeOffset, cy + 40, 30, 20, '#000000', 4, false));

        frames.push(makeFrame(strokes));
      }

      return {
        id: genId(),
        name: '12. Appeal',
        width: W,
        height: H,
        fps: 8,
        gridSize: 50,
        frames,
        currentFrameIndex: 0,
        currentLayerIndex: 0,
        backgroundColor: '#f8fafc',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },
];
