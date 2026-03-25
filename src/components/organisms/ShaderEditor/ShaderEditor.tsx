'use client';
import { useState, useCallback } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import styles from './ShaderEditor.module.scss';

const DEFAULT_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float t = iTime * 0.3;
  vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(col * 0.15, 0.6);
}`;

interface ShaderEditorProps {
  initialCode?: string;
  onSave: (code: string) => void;
  onClose: () => void;
}

export function ShaderEditor({ initialCode = DEFAULT_SHADER, onSave, onClose }: ShaderEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    if (code.length > 50000) {
      setError('El shader es demasiado largo (máx 50,000 caracteres).');
      return;
    }
    setError(null);
    onSave(code);
  }, [code, onSave]);

  return (
    <div className={styles.editor}>
      <div className={styles.topBar}>
        <span className={styles.title}>Editar shader</span>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>Guardar shader</Button>
        </div>
      </div>
      <div className={styles.hint}>
        Uniforms disponibles: <code>iTime</code>, <code>iResolution</code>, <code>iMouse</code>
        — usar <code>mainImage(out vec4 fragColor, in vec2 fragCoord)</code>
      </div>
      <textarea
        className={styles.textarea}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        aria-label="Código GLSL del shader"
        rows={20}
      />
      {error && <p className={styles.error} role="alert">{error}</p>}
      <p className={styles.chars}>{code.length.toLocaleString()} / 50,000</p>
    </div>
  );
}
