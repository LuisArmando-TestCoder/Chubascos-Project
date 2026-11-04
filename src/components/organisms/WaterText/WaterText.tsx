'use client';
/**
 * WaterText: words that wash away under the pointer like ink in a puddle.
 *
 * The real text stays in the DOM (readable, selectable, indexable). Once
 * WebGL is ready it turns transparent and a canvas on top draws it from a
 * texture. A low-res "trail" texture records where the pointer moved
 * relative to the text (rect is re-read every frame, so scrolling under a
 * still mouse also smears it). A shader then displaces, blurs and dissolves
 * the glyphs along that trail; as the trail evaporates the words re-form.
 */
import { useEffect, useRef, type ElementType } from 'react';
import styles from './WaterText.module.scss';

interface WaterTextProps {
  text: string;
  as?: ElementType;
  className?: string;
}

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

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec4 tr = texture2D(uTrail, vUv);
  vec2 vel = (tr.rg - 0.5) * 2.0;
  float k = tr.b;

  // Fluid displacement: pushed along the stroke, curled by turbulence.
  float n1 = noise(vUv * vec2(9.0, 3.0) + uTime * 0.35);
  float n2 = noise(vUv * vec2(7.0, 2.5) - uTime * 0.27 + 4.1);
  vec2 swirl = vec2(n1 - 0.5, n2 - 0.5);
  vec2 disp = (-vel * 0.09 + swirl * 0.07) * k;

  // Wet glyphs bleed: several taps along the displacement.
  float a = 0.0;
  for (int i = 0; i < 6; i++) {
    float f = float(i) / 5.0;
    a += texture2D(uText, vUv + disp * (0.4 + f) + swirl * k * 0.012 * f).a;
  }
  a /= 6.0;

  // Dissolve where the water is strongest, with a ragged, organic edge.
  float erase = smoothstep(0.18, 0.9, k + (n1 - 0.5) * 0.45);
  a *= 1.0 - erase * 0.94;

  vec3 col = mix(uInk, uWet, clamp(k * 1.4, 0.0, 1.0));
  // A thin bright meniscus where text meets water.
  col += vec3(0.85, 0.92, 1.0) * smoothstep(0.05, 0.25, k) * (1.0 - smoothstep(0.25, 0.6, k)) * 0.35;
  gl_FragColor = vec4(col * a, a);
}
`;

export function WaterText({ text, as: Tag = 'p', className = '' }: WaterTextProps) {
  const hostRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const span = textRef.current;
    const canvas = canvasRef.current;
    if (!host || !span || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    gl.uniform1i(gl.getUniformLocation(prog, 'uText'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTrail'), 1);
    gl.uniform3f(gl.getUniformLocation(prog, 'uInk'), 0.925, 0.922, 0.894); // $paper
    gl.uniform3f(gl.getUniformLocation(prog, 'uWet'), 0.56, 0.83, 0.91);    // $puddle

    const makeTex = (unit: number) => {
      const t = gl.createTexture();
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };
    const textTex = makeTex(gl.TEXTURE0);
    const trailTex = makeTex(gl.TEXTURE1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const textCanvas = document.createElement('canvas');
    const tctx = textCanvas.getContext('2d')!;
    const trail = document.createElement('canvas');
    const trctx = trail.getContext('2d')!;
    const TRAIL_SCALE = 0.25;

    // ── Text → texture (re-drawn on resize and when fonts finish loading) ──
    const paintText = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w; canvas.height = h;
      textCanvas.width = w; textCanvas.height = h;
      trail.width = Math.max(1, Math.round(r.width * TRAIL_SCALE));
      trail.height = Math.max(1, Math.round(r.height * TRAIL_SCALE));
      trctx.fillStyle = 'rgb(128,128,0)';
      trctx.fillRect(0, 0, trail.width, trail.height);

      const cs = getComputedStyle(span);
      tctx.clearRect(0, 0, w, h);
      tctx.scale(dpr, dpr);
      tctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ls = parseFloat(cs.letterSpacing);
      if ('letterSpacing' in tctx && !Number.isNaN(ls)) (tctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls}px`;
      tctx.fillStyle = '#fff';
      tctx.textBaseline = 'alphabetic';
      const m = tctx.measureText(text);
      const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
      const sr = span.getBoundingClientRect();
      const x = sr.left - r.left;
      const y = sr.top - r.top + (sr.height - (asc + desc)) / 2 + asc;
      tctx.fillText(text, x, y);
      tctx.setTransform(1, 0, 0, 1, 0, 0);

      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      host.dataset.live = 'true';
      wake();
    };

    // ── Pointer trail in the text's own coordinates (scroll-aware) ──────
    let mouse: { x: number; y: number } | null = null;
    let prev: { x: number; y: number } | null = null;
    let lastActive = 0;
    const onMove = (e: PointerEvent) => { mouse = { x: e.clientX, y: e.clientY }; wake(); };
    const onLeave = () => { mouse = null; prev = null; };
    const onScroll = () => { if (mouse) wake(); };

    let raf = 0;
    let visible = false;
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = 0;
      // Evaporate: drift the trail back to neutral (no velocity, no water).
      trctx.globalCompositeOperation = 'source-over';
      trctx.fillStyle = 'rgba(128,128,0,0.045)';
      trctx.fillRect(0, 0, trail.width, trail.height);

      if (mouse) {
        const r = canvas.getBoundingClientRect();
        const lx = (mouse.x - r.left) * TRAIL_SCALE;
        const ly = (mouse.y - r.top) * TRAIL_SCALE;
        if (prev) {
          const dx = lx - prev.x;
          const dy = ly - prev.y;
          const speed = Math.hypot(dx, dy);
          if (speed > 0.15) {
            lastActive = now;
            const nx = Math.max(-1, Math.min(1, dx / 6));
            const ny = Math.max(-1, Math.min(1, -dy / 6)); // texture y is up
            const steps = Math.ceil(speed / 2);
            const rad = Math.max(10, Math.min(28, 10 + speed * 1.5)) ;
            for (let s = 1; s <= steps; s++) {
              const px = prev.x + (dx * s) / steps;
              const py = prev.y + (dy * s) / steps;
              const g = trctx.createRadialGradient(px, py, 0, px, py, rad);
              const R = Math.round(128 + nx * 127), G = Math.round(128 + ny * 127);
              g.addColorStop(0, `rgba(${R},${G},255,0.5)`);
              g.addColorStop(1, `rgba(${R},${G},255,0)`);
              trctx.fillStyle = g;
              trctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
            }
          }
        }
        prev = { x: lx, y: ly };
      }

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, trailTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trail);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Keep running while the water is still settling (~4 s after the last stroke).
      if (visible && now - lastActive < 4000) raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { lastActive = performance.now(); wake(); }
    });
    io.observe(host);
    const ro = new ResizeObserver(() => paintText());
    ro.observe(host);
    document.fonts?.ready.then(paintText);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      delete host.dataset.live;
    };
  }, [text]);

  return (
    <Tag ref={hostRef} className={`${styles.host} ${className}`}>
      <span ref={textRef} className={styles.text}>{text}</span>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </Tag>
  );
}
