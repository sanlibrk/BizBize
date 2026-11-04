import type { Coordinate, LiveLocation, Memory } from '../types';
export type MapProps = {
  memories: Memory[]; locations: LiveLocation[]; userId: string; preview: boolean;
  onMemory: (memory: Memory) => void; focus?: Coordinate; pick?: (coordinate: Coordinate) => void;
  selected?: Coordinate;
};
