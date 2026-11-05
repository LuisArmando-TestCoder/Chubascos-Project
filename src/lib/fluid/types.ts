import type { FluidTone, Splat } from './bus';

export type FluidSplatPx = Splat;

export interface FluidRenderer {
  kind: 'webgpu' | 'ripple2d';
  resize(cssW: number, cssH: number, dpr: number): void;
  splat(s: FluidSplatPx): void;
  force(fx: number, fy: number): void;
  step(dt: number): void;
  isLost(): boolean;
  destroy(): void;
}

/** Palette in linear-ish RGB, mirrors the SCSS tokens. */
export const TONE_RGB: Record<FluidTone, [number, number, number]> = {
  rain: [0.43, 0.36, 0.99],   // $rain  #6d5dfc
  puddle: [0.56, 0.83, 0.91], // $puddle #8fd3e8
  paper: [0.92, 0.92, 0.89],  // $paper #ecebe4
  ember: [1.0, 0.7, 0.54],    // $ember #673ab7
};
