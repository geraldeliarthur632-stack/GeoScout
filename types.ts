export interface Coordinate {
  lat: number;
  lng: number;
}

export interface LocationData {
  name: string;
  coords: Coordinate;
  description?: string;
}

export interface AnalysisResult {
  suitabilityScore: number; // Escala de 1 a 10
  rationale: string;
  suggestion: string;
  optimizedCoords: Coordinate; // Nova coordenada calculada pela IA
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
