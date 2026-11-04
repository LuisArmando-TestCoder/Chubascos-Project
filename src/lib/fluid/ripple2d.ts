/**
 * Canvas2D fallback for browsers without WebGPU: no simulation, just
 * concentric rings where something touched the water. Same input contract.
 */
import type { FluidRenderer, FluidSplatPx } from './types';
import { TONE_RGB } from './types';

type Ring = { x: number; y: number; t: number; life: number; max: number; rgb: [number, number, number]; a: number };

export function createRipple2d(canvas: HTMLCanvasElement): FluidRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rings: Ring[] = [];
  let scale = 1;
  let last = { x: -1e4, y: -1e4, at: 0 };

  return {
    kind: 'ripple2d',
    resize(w, h, dpr) {
      scale = Math.min(dpr, 1.5);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
    },
    splat(s: FluidSplatPx) {
      const now = performance.now();
      // drop() emits a ring of impulses; collapse them into one ripple.
      if (Math.hypot(s.x - last.x, s.y - last.y) < 50 && now - last.at < 40) return;
      const strength = s.strength ?? 0.5;
      if (strength < 0.2 && rings.length > 24) return;
      last = { x: s.x, y: s.y, at: now };
      rings.push({
        x: s.x, y: s.y, t: 0,
        life: 0.9 + strength * 1.1,
        max: 30 + strength * 110,
        rgb: TONE_RGB[s.tone ?? 'rain'],
        a: Math.min(0.55, 0.15 + strength * 0.5),
      });
      if (rings.length > 48) rings.shift();
    },
    force() { /* no body forces without a simulation */ },
    step(dt) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const k = r.t / r.life;
        if (k >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 2.5);
        const alpha = r.a * Math.pow(1 - k, 1.6);
        const [cr, cg, cb] = r.rgb.map((c) => Math.round(c * 255));
        for (let j = 0; j < 3; j++) {
          const rad = r.max * e * (1 - j * 0.22);
          if (rad <= 0) continue;
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(alpha * (1 - j * 0.3)).toFixed(3)})`;
          ctx.lineWidth = 1.2 - j * 0.3;
          ctx.stroke();
        }
      }
    },
    isLost: () => false,
    destroy() { rings.length = 0; },
  };
}
