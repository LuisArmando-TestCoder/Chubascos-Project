'use client';
import React, { useEffect, useRef } from 'react';
import styles from './Hero.module.scss';

interface ShaderCanvasProps {
  shader: string;
  iChannel0?: string;
  iChannel1?: string;
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  shader,
  iChannel0,
  iChannel1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;
    glRef.current = gl;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
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
    `;

    const compileShader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    programRef.current = program;

    const positionLocation = gl.getAttribLocation(program, 'position');
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResLoc = gl.getUniformLocation(program, 'iResolution');
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iMouseLoc = gl.getUniformLocation(program, 'iMouse');

    // Trail Canvas for Channel 1
    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = canvas.width;
    trailCanvas.height = canvas.height;
    const trailCtx = trailCanvas.getContext('2d');
    const trailTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const render = () => {
      if (!gl || !program) return;
      const time = (Date.now() - startTimeRef.current) / 1000;

      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.1;

      if (trailCtx) {
        trailCtx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailCtx.beginPath();
        trailCtx.arc(mouseRef.current.x, canvas.height - mouseRef.current.y, 100, 0, Math.PI * 2);
        trailCtx.fillStyle = 'white';
        trailCtx.fill();

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, trailTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
      }

      gl.useProgram(program);
      gl.uniform3f(iResLoc, canvas.width, canvas.height, 1.0);
      gl.uniform1f(iTimeLoc, time);
      gl.uniform4f(iMouseLoc, mouseRef.current.x, mouseRef.current.y, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current.x = e.clientX - rect.left;
      targetMouseRef.current.y = rect.height - (e.clientY - rect.top);
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [shader]);

  return (
    <div className={styles.canvasContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
