export interface Point {
  x: number;
  y: number;
}

export enum AppState {
  IDLE,
  PROCESSING,
  SUCCESS,
  ERROR,
}

export enum ProcessState {
    IDLE,
    LOADING,
    SUCCESS,
    ERROR,
}
