/**
 * Mini drops: real raindrops on small surfaces (cards, panels).
 *
 * The shading is the hero's own capillary-wave model (same physics, same
 * moonlit palette) scaled down. Browsers cap WebGL contexts at ~16, so ONE
 * hidden WebGL canvas renders every visible field in turn and copies the
 * pixels into each field's own 2D canvas. Off-screen fields cost nothing;
 * the loop stops when none are visible or the tab is hidden.
 */

export type DropTint = 'rain' | 'puddle' | 'ember' | 'paper';

const TINTS: Record<DropTint, [number, number, number]> = {
  rain: [0.43, 0.36, 0.99],
  puddle: [0.56, 0.83, 0.91],
  ember: [1.0, 0.7, 0.54],
  paper: [0.92, 0.92, 0.89],
};

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Adapted from the hero shader (hero/constants.ts): addWave() is the same
// capillary ripple: speed, wavenumber, envelope and decay.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3 uPointer;   // xy in p-space, z = age in seconds (large = none)
uniform vec3 uTint;
uniform float uDensity;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 rainCycleKey(float cycle) {
  float c = fract(mod(cycle, 997.0) * 0.61803398875);
  return vec2(c, fract(c * 7.31 + 0.17)) * 13.0;
}
float smoothNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) { v += amp * smoothNoise(p); p *= 2.0; amp *= 0.5; }
  return v;
}

#define WAVE_SPEED 0.4
#define WAVENUMBER 70.0
#define WAVE_DECAY 3.2
#define WAVE_ENVELOPE 15.0
#define WAVE_AMP 0.08

void addWave(vec2 dropPos, vec2 p, float t, inout float totalH, inout vec2 normOff) {
  vec2 rel = p - dropPos;
  float d = length(rel);
  float dminusvt = d - WAVE_SPEED * t;
  float env = max(0.0, 1.0 - abs(dminusvt) * WAVE_ENVELOPE) * exp(-t * WAVE_DECAY);
  if (env < 0.001) return;
  float activeMask = smoothstep(-0.05, 0.1, t - d / WAVE_SPEED);
  float phase = dminusvt * WAVENUMBER;
  totalH += sin(phase) * env * activeMask * WAVE_AMP;
  if (d > 0.001) normOff += (rel / d) * (WAVENUMBER * cos(phase) * env * activeMask * WAVE_AMP);
  // The impact itself: a bright bead at the centre for the first instant.
  totalH += exp(-d * d * 4000.0) * exp(-t * 14.0) * 0.06;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv - 0.5;
  p.x *= aspect;

  float h = 0.0;
  vec2 nrm = vec2(0.0);

  vec2 gridP = p * 3.2;
  vec2 id = floor(gridP);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = id + vec2(float(x), float(y));
      vec2 home = cell + uSeed;
      // Rhythm per cell, a fresh landing spot per fall (same idea as the hero).
      float period = 2.4 + hash(home + 4.0) * 1.8;
      float clock = uTime + hash(home + 3.0) * 100.0;
      float localTime = mod(clock, period);
      vec2 key = home + rainCycleKey(floor(clock / period));
      if (hash(key) > 1.0 - uDensity) {
        vec2 dropPos = (cell + vec2(hash(key + 1.0), hash(key + 2.0))) / 3.2;
        addWave(dropPos, p, localTime, h, nrm);
      }
    }
  }
  if (uPointer.z < 3.0) addWave(uPointer.xy, p, uPointer.z, h, nrm);

  float t = uTime * 0.05;
  float n = fbm((p + nrm * 0.6) * 3.0 + t);

  vec3 black = vec3(0.01, 0.02, 0.03);
  vec3 gray = vec3(0.10, 0.12, 0.16);
  vec3 col = mix(black, gray, n);
  col = mix(col, uTint * 0.32, smoothstep(0.45, 0.85, n) * 0.6);
  // Moonlit crests and dark troughs, exactly like the hero.
  float spec = smoothstep(0.006, 0.03, h);
  col += vec3(0.83, 0.90, 0.96) * spec * 1.6;
  col += uTint * smoothstep(0.0, 0.015, h) * 0.18;
  col -= black * smoothstep(0.0, -0.02, h) * 0.5;
  // Soft vignette so the field melts into the card edges.
  float v = smoothstep(1.15, 0.25, length(p * vec2(1.0 / aspect, 1.0) * 1.6));
  gl_FragColor = vec4(clamp(col * mix(0.55, 1.0, v), 0.0, 1.0), 1.0);
}
`;

type Field = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  seed: number;
  tint: [number, number, number];
  density: number;
  visible: boolean;
  pointer: { x: number; y: number; start: number } | null;
};

class DropRenderer {
  private gl: WebGLRenderingContext | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private fields = new Set<Field>();
  private io: IntersectionObserver | null = null;
  private raf = 0;
  private last = 0;
  private t0 = performance.now();
  private reduced = false;
  failed = false;

  private init(): boolean {
    if (this.gl || this.failed) return !!this.gl;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) { this.failed = true; return false; }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[drops]', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { this.failed = true; return false; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { this.failed = true; return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['uRes', 'uTime', 'uSeed', 'uPointer', 'uTint', 'uDensity']) this.u[name] = gl.getUniformLocation(prog, name);
    this.gl = gl;
    this.glCanvas = c;
    this.program = prog;
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.failed = true; });

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const f = [...this.fields].find((x) => x.canvas === en.target);
        if (f) f.visible = en.isIntersecting;
      });
      this.kick();
    }, { rootMargin: '80px' });
    document.addEventListener('visibilitychange', () => this.kick());
    return true;
  }

  register(canvas: HTMLCanvasElement, opts: { seed: string; tint: DropTint; density: number }): Field | null {
    if (!this.init()) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let s = 0;
    for (let i = 0; i < opts.seed.length; i++) s = (s * 31 + opts.seed.charCodeAt(i)) % 9973;
    const field: Field = { canvas, ctx, seed: s / 97.0, tint: TINTS[opts.tint], density: opts.density, visible: false, pointer: null };
    this.fields.add(field);
    this.io!.observe(canvas);
    return field;
  }

  unregister(field: Field) {
    this.fields.delete(field);
    this.io?.unobserve(field.canvas);
  }

  /** A drop exactly where the pointer is, in the field's own coordinates. */
  poke(field: Field, clientX: number, clientY: number) {
    const r = field.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const aspect = r.width / r.height;
    field.pointer = {
      x: ((clientX - r.left) / r.width - 0.5) * aspect,
      y: 0.5 - (clientY - r.top) / r.height,
      start: performance.now(),
    };
    if (this.reduced) this.drawOne(field, (performance.now() - this.t0) / 1000);
    this.kick();
  }

  kick() {
    if (this.raf || document.visibilityState !== 'visible') return;
    if (![...this.fields].some((f) => f.visible)) return;
    if (this.reduced) {
      // One still frame per field: water, not motion.
      this.fields.forEach((f) => f.visible && this.drawOne(f, 7.3));
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (document.visibilityState !== 'visible') return;
    // ~30 fps is plenty for small water and halves the cost.
    if (now - this.last >= 32) {
      this.last = now;
      const time = (now - this.t0) / 1000;
      this.fields.forEach((f) => { if (f.visible) this.drawOne(f, time); });
    }
    if ([...this.fields].some((f) => f.visible)) this.raf = requestAnimationFrame(this.loop);
  };

  private drawOne(f: Field, time: number) {
    const gl = this.gl;
    const glc = this.glCanvas;
    if (!gl || !glc || this.failed) return;
    const rect = f.canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    if (f.canvas.width !== w || f.canvas.height !== h) { f.canvas.width = w; f.canvas.height = h; }
    if (glc.width < w || glc.height < h) {
      glc.width = Math.max(glc.width, w);
      glc.height = Math.max(glc.height, h);
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(this.u.uRes, w, h);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform1f(this.u.uSeed, f.seed);
    gl.uniform3f(this.u.uTint, f.tint[0], f.tint[1], f.tint[2]);
    gl.uniform1f(this.u.uDensity, f.density);
    const age = f.pointer ? (performance.now() - f.pointer.start) / 1000 : 99;
    gl.uniform3f(this.u.uPointer, f.pointer?.x ?? 0, f.pointer?.y ?? 0, age);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // WebGL's origin is bottom-left: our viewport sits at the bottom of the canvas.
    f.ctx.drawImage(glc, 0, glc.height - h, w, h, 0, 0, w, h);
  }
}

let singleton: DropRenderer | null = null;
export function dropRenderer(): DropRenderer {
  if (!singleton) singleton = new DropRenderer();
  return singleton;
}
export type { Field as DropFieldHandle };
