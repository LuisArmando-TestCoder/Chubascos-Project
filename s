'use client';
import React, { useEffect, useRef } from 'react';
import styles from './Hero.module.scss';

interface ShaderCanvasProps {
  shader: string;
}

// Cubic bezier approximation for "drop impact" easing
// Control points: (0,0) -> (0.22,0) -> (0.36,1) -> (1,1)
function easeDropImpact(t: number): number {
  // Approximate cubic bezier via polynomial
  // Fast in, slow expand
  const t2 = t * t;
  const t3 = t2 * t;
  return 3 * t2 - 2 * t3; // smoothstep base
}

// Map eased time to ring expansion with realistic physics
function dropEase(t: number): number {
  // Fast initial expansion, decelerating
  return 1 - Math.pow(1 - t, 2.5);
}

interface Droplet {
  x: number;
  y: number;
  startTime: number;
  duration: number; // ms
  maxRadius: number;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ shader }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Mouse trail morph (iChannel1)
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const trailTextureRef = useRef<WebGLTexture | null>(null);

  // Droplets canvas (iChannel0)
  const dropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dropTextureRef = useRef<WebGLTexture | null>(null);
  const dropletsRef = useRef<Droplet[]>([]);
  const nextDropTimeRef = useRef<number>(Date.now() + Math.random() * 600);

  // WebGL
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<{
    iRes: WebGLUniformLocation | null;
    iTime: WebGLUniformLocation | null;
    iMouse: WebGLUniformLocation | null;
    iChannel0: WebGLUniformLocation | null;
    iChannel1: WebGLUniformLocation | null;
  }>({ iRes: null, iTime: null, iMouse: null, iChannel0: null, iChannel1: null });

  const spawnDrop = (width: number, height: number) => {
    const now = Date.now();
    dropletsRef.current.push({
      x: Math.random() * width,
      y: Math.random() * height,
      startTime: now,
      duration: 800 + Math.random() * 1200, // 0.8s – 2s
      maxRadius: 40 + Math.random() * 80,
    });
  };

  const sizeAll = (width: number, height: number, gl: WebGLRenderingContext, canvas: HTMLCanvasElement) => {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    if (trailCanvasRef.current) {
      trailCanvasRef.current.width = width;
      trailCanvasRef.current.height = height;
    }
    if (dropCanvasRef.current) {
      dropCanvasRef.current.width = width;
      dropCanvasRef.current.height = height;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) return;
    glRef.current = gl;

    // Init hidden canvases
    const trailCanvas = document.createElement('canvas');
    trailCanvasRef.current = trailCanvas;
    trailCtxRef.current = trailCanvas.getContext('2d', { willReadFrequently: true });

    const dropCanvas = document.createElement('canvas');
    dropCanvasRef.current = dropCanvas;
    dropCtxRef.current = dropCanvas.getContext('2d', { willReadFrequently: true });

    // Init textures
    const makeTexture = (unit: number): WebGLTexture | null => {
      const tex = gl.createTexture();
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    };
    dropTextureRef.current = makeTexture(gl.TEXTURE0);
    trailTextureRef.current = makeTexture(gl.TEXTURE1);

    // Compile shaders
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `);

    const fs = compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec3 iResolution;
      uniform float iTime;
      uniform vec4 iMouse;
      uniform sampler2D iChannel0;
      uniform sampler2D iChannel1;
      ${shader}
      void main() {
        vec4 color;
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    programRef.current = prog;

    const pos = gl.getAttribLocation(prog, 'position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      iRes: gl.getUniformLocation(prog, 'iResolution'),
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iMouse: gl.getUniformLocation(prog, 'iMouse'),
      iChannel0: gl.getUniformLocation(prog, 'iChannel0'),
      iChannel1: gl.getUniformLocation(prog, 'iChannel1'),
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      sizeAll(parent.clientWidth, parent.clientHeight, gl, canvas);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      if (!gl || !programRef.current) return;
      const now = Date.now();
      const time = (now - startTimeRef.current) / 1000;
      const unif = uniformsRef.current;

      // Smooth mouse
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.12;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.12;

      // --- TRAIL CANVAS (iChannel1): Mouse morph ---
      const tCtx = trailCtxRef.current;
      const tCanvas = trailCanvasRef.current;
      if (tCtx && tCanvas) {
        tCtx.fillStyle = 'rgba(0,0,0,0.04)';
        tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);

        const r = 250;
        const grad = tCtx.createRadialGradient(
          mouseRef.current.x, mouseRef.current.y, 0,
          mouseRef.current.x, mouseRef.current.y, r
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.28)');
        grad.addColorStop(0.25, 'rgba(255,255,255,0.12)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        tCtx.beginPath();
        tCtx.arc(mouseRef.current.x, mouseRef.current.y, r, 0, Math.PI * 2);
        tCtx.fillStyle = grad;
        tCtx.fill();

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, trailTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tCanvas);
      }

      // --- DROP CANVAS (iChannel0): Raindrop ripples ---
      const dCtx = dropCtxRef.current;
      const dCanvas = dropCanvasRef.current;
      if (dCtx && dCanvas) {
        // Spawn new drops at random intervals
        if (now >= nextDropTimeRef.current) {
          spawnDrop(dCanvas.width, dCanvas.height);
          nextDropTimeRef.current = now + 200 + Math.random() * 800;
        }

        // Clear fully on each frame
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);

        // Remove dead droplets
        dropletsRef.current = dropletsRef.current.filter(d => now - d.startTime < d.duration);

        // Draw each droplet as expanding donut ring
        for (const drop of dropletsRef.current) {
          const elapsed = (now - drop.startTime) / drop.duration; // 0 → 1
          const easedT = dropEase(elapsed);

          const innerRadius = easedT * drop.maxRadius * 0.6;
          const outerRadius = easedT * drop.maxRadius;

          // Opacity: rises quickly, decays smoothly with cubic ease out
          const opacityIn = Math.min(elapsed * 10, 1); // fast in
          const opacityOut = Math.pow(1 - elapsed, 1.8); // smooth out
          const opacity = opacityIn * opacityOut * 0.9;

          if (opacity < 0.005 || outerRadius < 1) continue;

          // Donut: outer grad fades to 0 well before border
          const grad = dCtx.createRadialGradient(
            drop.x, drop.y, innerRadius,
            drop.x, drop.y, outerRadius
          );
          grad.addColorStop(0, `rgba(255,255,255,0)`);
          grad.addColorStop(0.2, `rgba(255,255,255,${opacity.toFixed(3)})`);
          grad.addColorStop(0.6, `rgba(220,235,255,${(opacity * 0.6).toFixed(3)})`);
          grad.addColorStop(1, `rgba(200,220,255,0)`); // Must reach 0 at edge

          dCtx.beginPath();
          dCtx.arc(drop.x, drop.y, outerRadius, 0, Math.PI * 2);
          dCtx.fillStyle = grad;
          dCtx.fill();
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dropTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dCanvas);
      }

      // Render
      gl.useProgram(programRef.current);
      gl.uniform3f(unif.iRes, canvas.width, canvas.height, 1.0);
      gl.uniform1f(unif.iTime, time);
      gl.uniform4f(unif.iMouse, mouseRef.current.x, mouseRef.current.y, 0, 0);
      gl.uniform1i(unif.iChannel0, 0);
      gl.uniform1i(unif.iChannel1, 1);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current.x = e.clientX - rect.left;
      targetMouseRef.current.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMove);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [shader]);

  return (
    <div className={styles.canvasContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
