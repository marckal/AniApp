export type Tool = 'brush' | 'hard-brush' | 'eraser' | 'fill' | 'select' | 'move' | 'rectangle' | 'circle' | 'line' | 'image';
export type FillType = 'solid' | 'gradient-linear' | 'gradient-dither';
export type EaseType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-sine'
  | 'ease-out-sine'
  | 'ease-in-out-sine'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'custom';
export type Theme = 'dark' | 'light';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  tool: Tool;
  opacity: number;
  // Para formas geométricas, preenchimento e imagens bitmap
  startPoint?: Point;
  endPoint?: Point;
  fillColor?: string;
  filled?: boolean;
  fillType?: FillType;
  gradientColors?: [string, string];
  ditherPattern?: 'checkerboard' | 'bayer4x4' | 'lines';
  imageUrl?: string;
  width?: number;
  height?: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: Stroke[];
  undoStack: Stroke[][];
  redoStack: Stroke[][];
}

export interface Frame {
  id: string;
  layers: Layer[];
  duration: number; // em frames (a 24fps, 1 = 1/24s)
  easing: EaseType;
  customCurve: Point[]; // para easing customizado
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  gridSize?: number;
  frames: Frame[];
  currentFrameIndex: number;
  currentLayerIndex: number;
  backgroundColor: string;
  createdAt: number;
  updatedAt: number;
}

export interface BrushSettings {
  size: number;
  opacity: number;
  color: string;
  hardness: number;
  filled: boolean;
  fillColor: string;
  fillType?: FillType;
  gradientColors?: [string, string];
  ditherPattern?: 'checkerboard' | 'bayer4x4' | 'lines';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  loop: boolean;
  onionSkin: boolean;
  onionSkinFrames: number;
}
