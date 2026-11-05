/**
 * Water text: words that wash away under the pointer and re-form.
 *
 * Shared engine for every <WaterText>. Browsers allow ~16 WebGL contexts, and
 * a page can hold dozens of titles, so ONE hidden WebGL canvas renders each
 * text in turn and copies the pixels into that text's own 2D canvas.
 *
 * Per text: a glyph texture laid out word by word from the DOM's own line
 * boxes (so wrapping matches exactly) and a low-res trail canvas recording
 * pointer strokes in the text's coordinates. The rect is re-read every
 * frame, so scrolling under a still pointer also smears the ink.
 * Texts only redraw while their water is moving, then sleep.
 */

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uText;
uniform sampler2D uTrail;
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uWet;
uniform float uScale; // displacement relative to text size

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec4 tr = texture2D(uTrail, vUv);
  vec2 vel = (tr.rg - 0.5) * 2.0;
  float k = tr.b;

  float n1 = noise(vUv * vec2(9.0, 3.0) + uTime * 0.35);
  float n2 = noise(vUv * vec2(7.0, 2.5) - uTime * 0.27 + 4.1);
  vec2 swirl = vec2(n1 - 0.5, n2 - 0.5);
  vec2 disp = (-vel * 0.09 + swirl * 0.07) * k * uScale;

  float a = 0.0;
  for (int i = 0; i < 6; i++) {
    float f = float(i) / 5.0;
    a += texture2D(uText, vUv + disp * (0.4 + f) + swirl * k * 0.012 * f * uScale).a;
  }
  a /= 6.0;

  float erase = smoothstep(0.18, 0.9, k + (n1 - 0.5) * 0.45);
  a *= 1.0 - erase * 0.94;

  vec3 col = mix(uInk, uWet, clamp(k * 1.4, 0.0, 1.0));
  col += vec3(0.85, 0.92, 1.0) * smoothstep(0.05, 0.25, k) * (1.0 - smoothstep(0.25, 0.6, k)) * 0.35;
  gl_FragColor = vec4(col * a, a);
}
`;

const TRAIL_SCALE = 0.25;
const SETTLE_MS = 4000;

export type WaterItem = {
  host: HTMLElement;
  textEl: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  text: string;
  glyphs: HTMLCanvasElement;
  trail: HTMLCanvasElement;
  tctx: CanvasRenderingContext2D;
  textTex: WebGLTexture | null;
  trailTex: WebGLTexture | null;
  visible: boolean;
  dirty: boolean;
  lastActive: number;
  prev: { x: number; y: number } | null;
  ink: [number, number, number];
  /** Colour of the wet stroke; null = $puddle. */
  wet: [number, number, number] | null;
};

function parseColor(c: string): [number, number, number] {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0.925, 0.922, 0.894];
  const [r, g, b] = m[1].split(/[ ,]+/).map(Number);
  return [r / 255, g / 255, b / 255];
}

function applyTransform(s: string, tt: string): string {
  if (tt === 'uppercase') return s.toUpperCase();
  if (tt === 'lowercase') return s.toLowerCase();
  if (tt === 'capitalize') return s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
  return s;
}

class WaterTextEngine {
  private gl: WebGLRenderingContext | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private items = new Set<WaterItem>();
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private t0 = performance.now();
  private mouse: { x: number; y: number } | null = null;
  failed = false;

  private init(): boolean {
    if (this.gl || this.failed) return !!this.gl;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.failed = true; return false; }
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) { this.failed = true; return false; }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
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
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (const name of ['uTime', 'uInk', 'uWet', 'uScale']) this.u[name] = gl.getUniformLocation(prog, name);
    gl.uniform1i(gl.getUniformLocation(prog, 'uText'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTrail'), 1);
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.failed = true; });
    this.gl = gl;
    this.glCanvas = c;

    this.io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const it = [...this.items].find((x) => x.host === en.target);
        if (it) { it.visible = en.isIntersecting; if (it.visible) this.kick(); }
      }
    }, { rootMargin: '100px' });
    this.ro = new ResizeObserver((entries) => {
      for (const en of entries) {
        const it = [...this.items].find((x) => x.host === en.target);
        if (it) it.dirty = true;
      }
      this.kick();
    });
    window.addEventListener('pointermove', (e) => { this.mouse = { x: e.clientX, y: e.clientY }; this.kick(); }, { passive: true });
    document.addEventListener('pointerleave', () => { this.mouse = null; this.items.forEach((i) => { i.prev = null; }); });
    window.addEventListener('scroll', () => { if (this.mouse) this.kick(); }, { passive: true });
    document.fonts?.ready.then(() => { this.items.forEach((i) => { i.dirty = true; }); this.kick(); });
    return true;
  }

  register(host: HTMLElement, textEl: HTMLElement, canvas: HTMLCanvasElement, text: string, opts: { monochrome?: boolean } = {}): WaterItem | null {
    if (!this.init()) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gl = this.gl!;
    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };
    const trail = document.createElement('canvas');
    const item: WaterItem = {
      host, textEl, canvas, ctx, text,
      glyphs: document.createElement('canvas'),
      trail,
      tctx: trail.getContext('2d')!,
      textTex: makeTex(),
      trailTex: makeTex(),
      visible: false,
      dirty: true,
      lastActive: 0,
      prev: null,
      ink: [0.925, 0.922, 0.894],
      wet: opts.monochrome ? null : [0.56, 0.83, 0.91],
    };
    this.items.add(item);
    this.io!.observe(host);
    this.ro!.observe(host);
    return item;
  }

  unregister(item: WaterItem) {
    this.items.delete(item);
    this.io?.unobserve(item.host);
    this.ro?.unobserve(item.host);
    this.gl?.deleteTexture(item.textTex);
    this.gl?.deleteTexture(item.trailTex);
    delete item.host.dataset.live;
  }

  /** Lay the words out exactly where the browser put them (wrapping included). */
  private paintGlyphs(it: WaterItem) {
    const r = it.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    it.canvas.width = w; it.canvas.height = h;
    it.glyphs.width = w; it.glyphs.height = h;
    it.trail.width = Math.max(1, Math.round(r.width * TRAIL_SCALE));
    it.trail.height = Math.max(1, Math.round(r.height * TRAIL_SCALE));
    it.tctx.fillStyle = 'rgb(128,128,0)';
    it.tctx.fillRect(0, 0, it.trail.width, it.trail.height);

    const cs = getComputedStyle(it.textEl);
    const g = it.glyphs.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const ls = parseFloat(cs.letterSpacing);
    if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = Number.isNaN(ls) ? '0px' : `${ls}px`;
    g.fillStyle = '#fff';
    g.textBaseline = 'alphabetic';
    const m = g.measureText('Hg');
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;

    const node = it.textEl.firstChild;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent ?? '';
      const range = document.createRange();
      const re = /\S+/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(content))) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rects = range.getClientRects();
        if (!rects.length) continue;
        // A word broken across lines (rare) is drawn at its first box.
        const wr = rects[0];
        const x = wr.left - r.left;
        const y = wr.top - r.top + (wr.height - (asc + desc)) / 2 + asc;
        g.fillText(applyTransform(match[0], cs.textTransform), x, y);
      }
      range.detach?.();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    it.ink = parseColor(getComputedStyle(it.host).color);

    const gl = this.gl!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, it.textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, it.glyphs);
    it.dirty = false;
    it.host.dataset.live = 'true';
    return true;
  }

  private stroke(it: WaterItem, now: number) {
    const tctx = it.tctx;
    tctx.fillStyle = 'rgba(128,128,0,0.045)';
    tctx.fillRect(0, 0, it.trail.width, it.trail.height);
    if (!this.mouse) return;
    const r = it.canvas.getBoundingClientRect();
    const margin = 120;
    const inside = this.mouse.x > r.left - margin && this.mouse.x < r.right + margin && this.mouse.y > r.top - margin && this.mouse.y < r.bottom + margin;
    const lx = (this.mouse.x - r.left) * TRAIL_SCALE;
    const ly = (this.mouse.y - r.top) * TRAIL_SCALE;
    if (inside && it.prev) {
      const dx = lx - it.prev.x;
      const dy = ly - it.prev.y;
      const speed = Math.hypot(dx, dy);
      if (speed > 0.15) {
        it.lastActive = now;
        const nx = Math.max(-1, Math.min(1, dx / 6));
        const ny = Math.max(-1, Math.min(1, -dy / 6));
        const steps = Math.min(24, Math.ceil(speed / 2));
        const rad = Math.max(8, Math.min(26, 8 + speed * 1.5));
        const R = Math.round(128 + nx * 127), G = Math.round(128 + ny * 127);
        for (let s = 1; s <= steps; s++) {
          const px = it.prev.x + (dx * s) / steps;
          const py = it.prev.y + (dy * s) / steps;
          const grad = tctx.createRadialGradient(px, py, 0, px, py, rad);
          grad.addColorStop(0, `rgba(${R},${G},255,0.5)`);
          grad.addColorStop(1, `rgba(${R},${G},255,0)`);
          tctx.fillStyle = grad;
          tctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        }
      }
    }
    it.prev = inside ? { x: lx, y: ly } : null;
  }

  private draw(it: WaterItem, now: number) {
    const gl = this.gl!;
    const glc = this.glCanvas!;
    const w = it.canvas.width, h = it.canvas.height;
    if (glc.width < w || glc.height < h) { glc.width = Math.max(glc.width, w); glc.height = Math.max(glc.height, h); }
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, it.textTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, it.trailTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, it.trail);
    gl.uniform1f(this.u.uTime, (now - this.t0) / 1000);
    gl.uniform3f(this.u.uInk, it.ink[0], it.ink[1], it.ink[2]);
    // Monochrome texts get wet in their own ink (keeps blend modes honest).
    const wet = it.wet ?? it.ink;
    gl.uniform3f(this.u.uWet, wet[0], wet[1], wet[2]);
    // Small text gets proportionally gentler displacement.
    gl.uniform1f(this.u.uScale, Math.min(1, Math.max(0.35, it.canvas.height / 160)));
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    it.ctx.clearRect(0, 0, w, h);
    it.ctx.drawImage(glc, 0, glc.height - h, w, h, 0, 0, w, h);
  }

  kick() {
    if (!this.raf && !this.failed) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (!this.gl) return;
    let busy = false;
    for (const it of this.items) {
      if (!it.visible) continue;
      if (it.dirty) {
        if (!this.paintGlyphs(it)) continue;
        this.draw(it, now);
      }
      const settling = now - it.lastActive < SETTLE_MS;
      this.stroke(it, now);
      if (settling || now - it.lastActive < SETTLE_MS) {
        // Ink follows the host's colour (hover states) while the water moves.
        it.ink = parseColor(getComputedStyle(it.host).color);
        this.draw(it, now);
        busy = true;
      }
    }
    if (busy) this.raf = requestAnimationFrame(this.loop);
  };
}

let engine: WaterTextEngine | null = null;
export function waterText(): WaterTextEngine {
  if (!engine) engine = new WaterTextEngine();
  return engine;
}
