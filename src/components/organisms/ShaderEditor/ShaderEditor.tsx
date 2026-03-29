'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import styles from './ShaderEditor.module.scss';

// ─── Default shader: charco de lluvia (fitting for Chubascos) ────────────────
export const DEFAULT_SHADER = `// ── helpers ────────────────────────────────────────────────────
float cbrt(float n) {
  return pow(abs(n), 1. / 3.);               // cube root (always positive)
}

float erraticWave(float n) {
  return (                                   // blend of cube-root-sine ...
    cbrt(sin(n))                             //   slow organic curve
  + pow(cos(n + iTime / 3.), 3.)             //   ... and time-shifted cosine
  );
}

vec3 erraticPattern(float x, float y, vec2 uv) {
  float stretch = 2.;

  float dance = erraticWave(              // nested self-similar dance
    erraticWave(uv.y + uv.x)             //   quadrant +/+
  + erraticWave(uv.y - uv.x)             //   quadrant -/+
  + erraticWave(-uv.y + uv.x)            //   quadrant +/-
  + erraticWave(-uv.y - uv.x)            //   quadrant -/-
  );

  return (erraticWave(x) + erraticWave(y)) * stretch   // base amplitude
    * (1. - vec3(
        dance * (sin(iTime / 20. + .5) + 1.),           // R — very slow drift
        dance * (sin(iTime / 4.  + .25) + .5),          // G — medium pulse
        dance * (sin(iTime / 4.  + 1. ) + .25) + dance  // B — offset + bias
    ));
}

// ── main ────────────────────────────────────────────────────────
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / iResolution.xy - .5; // center coords
  uv.x *= iResolution.x / iResolution.y;         // correct aspect ratio

  vec3 base = 0.5 + 0.5 * cos(               // cyclic color palette
    iTime + uv.xyx + vec3(0., 2., 4.)         //   hue offset per channel
  );

  float zoom = 15.;                           // how zoomed-out the pattern is

  vec3 rgb =                                 // 4-fold symmetry sum
    1. - erraticPattern( uv.x,  uv.y, uv * zoom)
       + erraticPattern(-uv.x,  uv.y, uv * zoom)
       + erraticPattern( uv.x, -uv.y, uv * zoom)
       + erraticPattern(-uv.x, -uv.y, uv * zoom);

  float glow = 1. / distance(uv, vec2(0.));  // radial glow from center

  fragColor = vec4(base * rgb * glow, 1.0);  // final color
}`;

// ─── Documentation entries ───────────────────────────────────────
const DOCS = [
  { name: 'iTime', type: 'float', desc: 'Segundos transcurridos desde el inicio' },
  { name: 'iResolution', type: 'vec2', desc: 'Tamaño del canvas en pixels (x, y)' },
  { name: 'iMouse', type: 'vec2', desc: 'Posición del puntero en pixels (x, y)' },
];

interface ShaderEditorProps {
  initialCode?: string;
  onSave: (code: string) => void;
  onClose: () => void;
  onCodeChange?: (code: string) => void;
}

export function ShaderEditor({ initialCode = DEFAULT_SHADER, onSave, onClose, onCodeChange }: ShaderEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent with debounce so it can render the background preview
  useEffect(() => {
    if (!onCodeChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCodeChange(code), 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, onCodeChange]);

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
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.title}>Editor de shader</span>
        <div className={styles.actions}>
          <button
            className={styles.docsToggle}
            onClick={() => setDocsOpen((v) => !v)}
            aria-expanded={docsOpen}
          >
            {docsOpen ? 'Ocultar docs' : 'Ver uniforms'}
          </button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>Guardar</Button>
        </div>
      </div>

      {/* Documentation panel */}
      {docsOpen && (
        <div className={styles.docs}>
          <p className={styles.docsTitle}>Uniforms disponibles</p>
          <table className={styles.docsTable}>
            <tbody>
              {DOCS.map((d) => (
                <tr key={d.name}>
                  <td><code className={styles.docsCode}>{d.name}</code></td>
                  <td><span className={styles.docsType}>{d.type}</span></td>
                  <td><span className={styles.docsDesc}>{d.desc}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.docsEntry}>
            Punto de entrada: <code className={styles.docsCode}>void mainImage(out vec4 fragColor, in vec2 fragCoord)</code>
          </p>
        </div>
      )}

      {/* Code editor — full width, no side panel */}
      <div className={styles.codePane}>
        <textarea
          className={styles.textarea}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="Código GLSL del shader"
        />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.chars}>{code.length.toLocaleString()} / 50,000</p>
      </div>
    </div>
  );
}
