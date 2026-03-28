'use client';
import React, { useEffect, useRef } from 'react';
import styles from './Hero.module.scss';

interface ShaderCanvasProps {
  shader: string;
  iChannel2?: string; // Background image URL
  iChannel3?: string; // New foreground overlay image URL
}

function dropEase(t: number): number {
  return 1 - Math.pow(1 - t, 2.5);
}

interface Droplet {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  shader,
  iChannel2 = 'https://images.pexels.com/photos/2422569/pexels-photo-2422569.jpeg',
  iChannel3 = 'https://images.pexels.com/photos/10384062/pexels-photo-10384062.jpeg',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isInViewRef = useRef<boolean>(true);
  const startTimeRef = useRef<number>(Date.now());

  // Mouse tracking
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const brushRadiusRef = useRef<number>(50);

  // Trail morph (iChannel1) - persistent accumulation
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const trailTextureRef = useRef<WebGLTexture | null>(null);

  // Droplets (iChannel0)
  const dropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dropTextureRef = useRef<WebGLTexture | null>(null);
  const dropletsRef = useRef<Droplet[]>([]);
  const nextDropTimeRef = useRef<number>(Date.now() + Math.random() * 600);

  // Background image (iChannel2)
  const imageTextureRef = useRef<WebGLTexture | null>(null);

  // Overlay image (iChannel3)
  const overlayTextureRef = useRef<WebGLTexture | null>(null);
  const overlayFadeRef = useRef<number>(0.0); // 0 to 1 fade
  const overlayLoadedRef = useRef<boolean>(false);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<{
    iRes: WebGLUniformLocation | null;
    iTime: WebGLUniformLocation | null;
    iMouse: WebGLUniformLocation | null;
    iChannel0: WebGLUniformLocation | null;
    iChannel1: WebGLUniformLocation | null;
    iChannel2: WebGLUniformLocation | null;
    iChannel3: WebGLUniformLocation | null;
    overlayFade: WebGLUniformLocation | null;
  }>({ iRes: null, iTime: null, iMouse: null, iChannel0: null, iChannel1: null, iChannel2: null, iChannel3: null, overlayFade: null });

  const spawnDrop = (width: number, height: number) => {
    dropletsRef.current.push({
      x: Math.random() * width,
      y: Math.random() * height,
      startTime: Date.now(),
      duration: 800 + Math.random() * 1200,
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

    // Hidden canvases
    const trailCanvas = document.createElement('canvas');
    trailCanvasRef.current = trailCanvas;
    trailCtxRef.current = trailCanvas.getContext('2d', { willReadFrequently: true });

    const dropCanvas = document.createElement('canvas');
    dropCanvasRef.current = dropCanvas;
    dropCtxRef.current = dropCanvas.getContext('2d', { willReadFrequently: true });

    // Textures
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
    imageTextureRef.current = makeTexture(gl.TEXTURE2);
    overlayTextureRef.current = makeTexture(gl.TEXTURE3);

    // Load iChannel2 image
    if (iChannel2) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, imageTextureRef.current);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      };
      img.src = iChannel2;
    }

    // Load iChannel3 image (Overlay)
    if (iChannel3) {
      const img3 = new Image();
      img3.crossOrigin = 'anonymous';
      img3.onload = () => {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img3);
        overlayLoadedRef.current = true;
      };
      img3.src = iChannel3;
    }

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
      uniform sampler2D iChannel2;
      uniform sampler2D iChannel3;
      uniform float overlayFade;
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

    const posLoc = gl.getAttribLocation(prog, 'position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      iRes: gl.getUniformLocation(prog, 'iResolution'),
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iMouse: gl.getUniformLocation(prog, 'iMouse'),
      iChannel0: gl.getUniformLocation(prog, 'iChannel0'),
      iChannel1: gl.getUniformLocation(prog, 'iChannel1'),
      iChannel2: gl.getUniformLocation(prog, 'iChannel2'),
      iChannel3: gl.getUniformLocation(prog, 'iChannel3'),
      overlayFade: gl.getUniformLocation(prog, 'overlayFade'),
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      sizeAll(parent.clientWidth, parent.clientHeight, gl, canvas);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      if (!gl || !programRef.current || !isInViewRef.current) {
        if (!isInViewRef.current) {
          animationFrameIdRef.current = requestAnimationFrame(render);
        }
        return;
      }
      const now = Date.now();
      const time = (now - startTimeRef.current) / 1000;
      const unif = uniformsRef.current;

      // Fade in overlay image if loaded
      if (overlayLoadedRef.current && overlayFadeRef.current < 1.0) {
        overlayFadeRef.current = Math.min(1.0, overlayFadeRef.current + dt * 0.001); // 1-second fade
      }

      // Smooth mouse
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.15;

      const dx = mouseRef.current.x - lastMouseRef.current.x;
      const dy = mouseRef.current.y - lastMouseRef.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      
      // Target radius expands significantly on movement (speed), contracts to a base value
      const targetRadius = Math.min(260, 50 + speed * 4);
      // Brush size smoothly scales
      brushRadiusRef.current += (targetRadius - brushRadiusRef.current) * 0.1;

      // --- iChannel1: Mouse trail morph (shrinking ripple via fade out) ---
      const tCtx = trailCtxRef.current;
      const tCanvas = trailCanvasRef.current;
      if (tCtx && tCanvas) {
        // Fade out previous trail (creates the decay effect natively)
        tCtx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);

        // Only draw if there's meaningful movement or we're settling
        if (speed > 0.5 || brushRadiusRef.current > 51) {
          const drawY = tCanvas.height - mouseRef.current.y; // Flip Y for WebGL
          const radius = brushRadiusRef.current;

          // Draw the single continuous brush
          const grad = tCtx.createRadialGradient(
            mouseRef.current.x, drawY, 0,
            mouseRef.current.x, drawY, radius
          );
          
          // Outer edge drops sharply to create the defined ripple wave
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.18)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          tCtx.beginPath();
          tCtx.arc(mouseRef.current.x, drawY, radius, 0, Math.PI * 2);
          tCtx.fillStyle = grad;
          tCtx.fill();
        }

        lastMouseRef.current = { x: mouseRef.current.x, y: mouseRef.current.y };

        // Upload canvas to texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, trailTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tCanvas);
      }

      // --- iChannel0: Raindrop ripples ---
      const dCtx = dropCtxRef.current;
      const dCanvas = dropCanvasRef.current;
      if (dCtx && dCanvas) {
        if (now >= nextDropTimeRef.current) {
          spawnDrop(dCanvas.width, dCanvas.height);
          nextDropTimeRef.current = now + 200 + Math.random() * 800;
        }

        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        dropletsRef.current = dropletsRef.current.filter(d => now - d.startTime < d.duration);

        for (const drop of dropletsRef.current) {
          const elapsed = (now - drop.startTime) / drop.duration;
          const easedT = dropEase(elapsed);
          const innerRadius = easedT * drop.maxRadius * 0.55;
          const outerRadius = easedT * drop.maxRadius;
          const opacityIn = Math.min(elapsed * 12, 1);
          const opacityOut = Math.pow(1 - elapsed, 1.9);
          const opacity = opacityIn * opacityOut * 0.85;

          if (opacity < 0.005 || outerRadius < 1) continue;

          const grad = dCtx.createRadialGradient(drop.x, drop.y, innerRadius, drop.x, drop.y, outerRadius);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.15, `rgba(255,255,255,${opacity.toFixed(3)})`);
          grad.addColorStop(0.65, `rgba(210,230,255,${(opacity * 0.5).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(200,220,255,0)');

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
      gl.uniform1i(unif.iChannel2, 2);
      gl.uniform1i(unif.iChannel3, 3);
      gl.uniform1f(unif.overlayFade, overlayFadeRef.current);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isInViewRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current.x = e.clientX - rect.left;
      targetMouseRef.current.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMove);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [shader, iChannel2]);

  return (
    <div className={styles.canvasContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
