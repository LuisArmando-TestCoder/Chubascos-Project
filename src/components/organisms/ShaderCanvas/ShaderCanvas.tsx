'use client';
import { useEffect, useRef } from 'react';
import styles from './ShaderCanvas.module.scss';

interface ShaderCanvasProps {
  glslCode: string;
}

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

function buildFragSource(userCode: string): string {
  return `
    precision mediump float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    ${userCode}
    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;
}

export default function ShaderCanvas({ glslCode }: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, buildFragSource(glslCode));
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(fs));
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iResLoc = gl.getUniformLocation(program, 'iResolution');
    const iMouseLoc = gl.getUniformLocation(program, 'iMouse');

    let mouse = { x: 0, y: 0 };
    const handleMouse = (e: MouseEvent) => {
      mouse = { x: e.clientX, y: canvas.height - e.clientY };
    };
    canvas.addEventListener('mousemove', handleMouse);

    const start = performance.now();

    function resize() {
      if (!canvas || !gl) return;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function render() {
      if (!gl) return;
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(iTimeLoc, t);
      gl.uniform2f(iResLoc, canvas!.width, canvas!.height);
      gl.uniform2f(iMouseLoc, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    }
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', handleMouse);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [glslCode]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
