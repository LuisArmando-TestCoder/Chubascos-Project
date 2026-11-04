/**
 * WebGPU "stable fluids" (Stam 1999) on storage buffers.
 *
 * Pipeline per frame:
 *   splat → curl → vorticity → divergence → pressure (Jacobi) → project
 *   → advect velocity → advect dye → render
 *
 * The sim grid is deliberately coarse (≤ ~200 cells on the long side) and
 * rendered at half resolution: water is soft, and the budget belongs to
 * the poems. The loop sleeps when nothing has disturbed the surface.
 */
import type { FluidRenderer, FluidSplatPx } from './types';
import { TONE_RGB } from './types';

// WebGPU enums, inlined so we need no type package at runtime or build time.
const BUF = { COPY_SRC: 4, COPY_DST: 8, UNIFORM: 64, STORAGE: 128 } as const;
const STAGE = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 } as const;

const MAX_SPLATS = 32;
const SPLAT_STRIDE = 48; // bytes, see struct S
const UNIFORM_SIZE = 64;

const COMMON_WGSL = /* wgsl */ `
struct U {
  size: vec2<u32>,
  dt: f32,
  velDiss: f32,
  dyeDiss: f32,
  curlStrength: f32,
  splatCount: u32,
  pDecay: f32,
  force: vec2<f32>,
  texel: vec2<f32>,
  time: f32,
  p0: f32, p1: f32, p2: f32,
};
fn idxOf(x: i32, y: i32) -> u32 {
  let W = i32(u.size.x);
  let H = i32(u.size.y);
  return u32(clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1));
}
`;

const SIM_WGSL = /* wgsl */ `
@group(0) @binding(0) var<uniform> u: U;
struct S { pos: vec2<f32>, vel: vec2<f32>, color: vec4<f32>, radius: f32, q0: f32, q1: f32, q2: f32 };
@group(0) @binding(1) var<storage, read> velIn: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> velOut: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> dyeIn: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> dyeOut: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> pIn: array<f32>;
@group(0) @binding(6) var<storage, read_write> pOut: array<f32>;
@group(0) @binding(7) var<storage, read_write> aux: array<f32>;
@group(0) @binding(8) var<storage, read> splats: array<S>;
${COMMON_WGSL}

fn inb(id: vec3<u32>) -> bool { return id.x < u.size.x && id.y < u.size.y; }
fn cellPos(id: vec3<u32>) -> vec2<f32> { return vec2<f32>(f32(id.x) + 0.5, f32(id.y) + 0.5); }

fn sampleVel(p: vec2<f32>) -> vec2<f32> {
  let q = p - 0.5; let i = floor(q); let f = q - i;
  let x = i32(i.x); let y = i32(i.y);
  return mix(mix(velIn[idxOf(x, y)], velIn[idxOf(x + 1, y)], f.x),
             mix(velIn[idxOf(x, y + 1)], velIn[idxOf(x + 1, y + 1)], f.x), f.y);
}
fn sampleDye(p: vec2<f32>) -> vec4<f32> {
  let q = p - 0.5; let i = floor(q); let f = q - i;
  let x = i32(i.x); let y = i32(i.y);
  return mix(mix(dyeIn[idxOf(x, y)], dyeIn[idxOf(x + 1, y)], f.x),
             mix(dyeIn[idxOf(x, y + 1)], dyeIn[idxOf(x + 1, y + 1)], f.x), f.y);
}

@compute @workgroup_size(8, 8)
fn splat(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let i = id.y * u.size.x + id.x;
  let p = cellPos(id);
  var v = velIn[i] + u.force * u.dt;
  var d = dyeIn[i];
  for (var k = 0u; k < u.splatCount; k++) {
    let s = splats[k];
    let r = p - s.pos;
    let g = exp(-dot(r, r) / max(s.radius * s.radius, 0.0001));
    v += s.vel * g;
    d += s.color * g;
  }
  velOut[i] = v;
  dyeOut[i] = min(d, vec4<f32>(2.5));
}

@compute @workgroup_size(8, 8)
fn curl(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let x = i32(id.x); let y = i32(id.y);
  let L = velIn[idxOf(x - 1, y)].y; let R = velIn[idxOf(x + 1, y)].y;
  let B = velIn[idxOf(x, y - 1)].x; let T = velIn[idxOf(x, y + 1)].x;
  aux[id.y * u.size.x + id.x] = 0.5 * ((R - L) - (T - B));
}

@compute @workgroup_size(8, 8)
fn vorticity(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let x = i32(id.x); let y = i32(id.y);
  let i = id.y * u.size.x + id.x;
  let L = abs(aux[idxOf(x - 1, y)]); let R = abs(aux[idxOf(x + 1, y)]);
  let B = abs(aux[idxOf(x, y - 1)]); let T = abs(aux[idxOf(x, y + 1)]);
  var n = 0.5 * vec2<f32>(R - L, T - B);
  n = n / (length(n) + 0.00001);
  let f = u.curlStrength * aux[i] * vec2<f32>(n.y, -n.x);
  velOut[i] = velIn[i] + f * u.dt;
}

@compute @workgroup_size(8, 8)
fn divergence(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let x = i32(id.x); let y = i32(id.y);
  let W = i32(u.size.x); let H = i32(u.size.y);
  let i = id.y * u.size.x + id.x;
  let C = velIn[i];
  var l = velIn[idxOf(x - 1, y)].x; var r = velIn[idxOf(x + 1, y)].x;
  var b = velIn[idxOf(x, y - 1)].y; var t = velIn[idxOf(x, y + 1)].y;
  if (x == 0) { l = -C.x; }
  if (x == W - 1) { r = -C.x; }
  if (y == 0) { b = -C.y; }
  if (y == H - 1) { t = -C.y; }
  aux[i] = 0.5 * (r - l + t - b);
}

@compute @workgroup_size(8, 8)
fn pdecay(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let i = id.y * u.size.x + id.x;
  pOut[i] = pIn[i] * u.pDecay;
}

@compute @workgroup_size(8, 8)
fn jacobi(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let x = i32(id.x); let y = i32(id.y);
  let i = id.y * u.size.x + id.x;
  pOut[i] = (pIn[idxOf(x - 1, y)] + pIn[idxOf(x + 1, y)] + pIn[idxOf(x, y - 1)] + pIn[idxOf(x, y + 1)] - aux[i]) * 0.25;
}

@compute @workgroup_size(8, 8)
fn project(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let x = i32(id.x); let y = i32(id.y);
  let i = id.y * u.size.x + id.x;
  let g = vec2<f32>(pIn[idxOf(x + 1, y)] - pIn[idxOf(x - 1, y)], pIn[idxOf(x, y + 1)] - pIn[idxOf(x, y - 1)]);
  velOut[i] = velIn[i] - 0.5 * g;
}

@compute @workgroup_size(8, 8)
fn advectVel(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let i = id.y * u.size.x + id.x;
  let back = cellPos(id) - u.dt * velIn[i];
  velOut[i] = sampleVel(back) * u.velDiss;
}

@compute @workgroup_size(8, 8)
fn advectDye(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!inb(id)) { return; }
  let i = id.y * u.size.x + id.x;
  let back = cellPos(id) - u.dt * velIn[i];
  dyeOut[i] = sampleDye(back) * u.dyeDiss;
}
`;

const RENDER_WGSL = /* wgsl */ `
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> dye: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> vel: array<vec2<f32>>;
${COMMON_WGSL}

struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VO {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VO;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = vec2<f32>((p[vi].x + 1.0) * 0.5, 1.0 - (p[vi].y + 1.0) * 0.5);
  return o;
}

fn dyeAt(p: vec2<f32>) -> vec4<f32> {
  let q = p - 0.5; let i = floor(q); let f = q - i;
  let x = i32(i.x); let y = i32(i.y);
  return mix(mix(dye[idxOf(x, y)], dye[idxOf(x + 1, y)], f.x),
             mix(dye[idxOf(x, y + 1)], dye[idxOf(x + 1, y + 1)], f.x), f.y);
}
fn lum(c: vec4<f32>) -> f32 { return dot(c.rgb, vec3<f32>(0.3, 0.5, 0.2)); }

@fragment
fn fs(in: VO) -> @location(0) vec4<f32> {
  let p = in.uv * vec2<f32>(u.size);
  let d = dyeAt(p);
  // Height field from dye density → normal → a moonlit specular glint.
  let hx = lum(dyeAt(p + vec2<f32>(1.0, 0.0))) - lum(dyeAt(p - vec2<f32>(1.0, 0.0)));
  let hy = lum(dyeAt(p + vec2<f32>(0.0, 1.0))) - lum(dyeAt(p - vec2<f32>(0.0, 1.0)));
  let n = normalize(vec3<f32>(-hx * 2.2, -hy * 2.2, 1.0));
  let light = normalize(vec3<f32>(-0.4, -0.7, 0.6));
  let spec = pow(max(dot(reflect(-light, n), vec3<f32>(0.0, 0.0, 1.0)), 0.0), 28.0);
  let v = vel[idxOf(i32(p.x), i32(p.y))];
  let shimmer = clamp(length(v) * 0.004, 0.0, 0.35);
  let density = clamp(max(d.r, max(d.g, d.b)), 0.0, 1.0);
  let col = d.rgb * 0.78 + vec3<f32>(0.78, 0.86, 1.0) * (spec * density * 1.4 + shimmer * density);
  let a = clamp(density * 0.62 + spec * density * 0.5, 0.0, 0.82);
  return vec4<f32>(col * a, a);
}
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type GPUAny = any;

export async function createGpuFluid(canvas: HTMLCanvasElement): Promise<FluidRenderer | null> {
  const gpu: GPUAny = (navigator as GPUAny).gpu;
  if (!gpu) return null;
  const adapter: GPUAny = await gpu.requestAdapter({ powerPreference: 'low-power' }).catch(() => null);
  if (!adapter) return null;
  const device: GPUAny = await adapter.requestDevice().catch(() => null);
  if (!device) return null;
  const ctx: GPUAny = canvas.getContext('webgpu');
  if (!ctx) return null;

  const format = gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'premultiplied' });

  let lost = false;
  device.lost?.then(() => { lost = true; });

  // ── Layouts & pipelines ───────────────────────────────────────────────
  const ro = { type: 'read-only-storage' };
  const rw = { type: 'storage' };
  const simLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: STAGE.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: STAGE.COMPUTE, buffer: ro },
      { binding: 2, visibility: STAGE.COMPUTE, buffer: rw },
      { binding: 3, visibility: STAGE.COMPUTE, buffer: ro },
      { binding: 4, visibility: STAGE.COMPUTE, buffer: rw },
      { binding: 5, visibility: STAGE.COMPUTE, buffer: ro },
      { binding: 6, visibility: STAGE.COMPUTE, buffer: rw },
      { binding: 7, visibility: STAGE.COMPUTE, buffer: rw },
      { binding: 8, visibility: STAGE.COMPUTE, buffer: ro },
    ],
  });
  const renderLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: STAGE.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: STAGE.FRAGMENT, buffer: ro },
      { binding: 2, visibility: STAGE.FRAGMENT, buffer: ro },
    ],
  });

  const simModule = device.createShaderModule({ code: SIM_WGSL });
  const renderModule = device.createShaderModule({ code: RENDER_WGSL });
  const simPipeLayout = device.createPipelineLayout({ bindGroupLayouts: [simLayout] });
  const pipe = (entryPoint: string) =>
    device.createComputePipeline({ layout: simPipeLayout, compute: { module: simModule, entryPoint } });

  const P = {
    splat: pipe('splat'),
    curl: pipe('curl'),
    vorticity: pipe('vorticity'),
    divergence: pipe('divergence'),
    pdecay: pipe('pdecay'),
    jacobi: pipe('jacobi'),
    project: pipe('project'),
    advectVel: pipe('advectVel'),
    advectDye: pipe('advectDye'),
  };
  const renderPipe = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: 'vs' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs',
      targets: [{
        format,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });

  // Surface a shader compile failure as "no WebGPU" so we fall back cleanly.
  const info = await simModule.getCompilationInfo?.();
  if (info?.messages?.some((m: GPUAny) => m.type === 'error')) {
    console.warn('[fluid] WGSL error, falling back', info.messages);
    device.destroy?.();
    return null;
  }

  // ── Buffers (recreated on resize) ─────────────────────────────────────
  const uniformBuf = device.createBuffer({ size: UNIFORM_SIZE, usage: BUF.UNIFORM | BUF.COPY_DST });
  const splatBuf = device.createBuffer({ size: SPLAT_STRIDE * MAX_SPLATS, usage: BUF.STORAGE | BUF.COPY_DST });
  const uData = new ArrayBuffer(UNIFORM_SIZE);
  const uF = new Float32Array(uData);
  const uU = new Uint32Array(uData);
  const sData = new Float32Array((SPLAT_STRIDE / 4) * MAX_SPLATS);

  let W = 0, H = 0, cell = 8;
  let B: Record<string, GPUAny> = {};
  let simGroup: GPUAny = null;
  let renderGroup: GPUAny = null;

  const sized = (n: number, bytesPer: number) =>
    device.createBuffer({ size: Math.max(16, n * bytesPer), usage: BUF.STORAGE | BUF.COPY_SRC | BUF.COPY_DST });

  function allocate(cssW: number, cssH: number) {
    Object.values(B).forEach((b) => b.destroy());
    const longSide = Math.max(cssW, cssH);
    const target = cssW < 768 ? 120 : 196;
    cell = Math.max(4, longSide / target);
    W = Math.max(8, Math.ceil(cssW / cell));
    H = Math.max(8, Math.ceil(cssH / cell));
    const n = W * H;
    B = {
      velA: sized(n, 8), velB: sized(n, 8),
      dyeA: sized(n, 16), dyeB: sized(n, 16),
      pA: sized(n, 4), pB: sized(n, 4),
      aux: sized(n, 4),
    };
    simGroup = device.createBindGroup({
      layout: simLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: B.velA } },
        { binding: 2, resource: { buffer: B.velB } },
        { binding: 3, resource: { buffer: B.dyeA } },
        { binding: 4, resource: { buffer: B.dyeB } },
        { binding: 5, resource: { buffer: B.pA } },
        { binding: 6, resource: { buffer: B.pB } },
        { binding: 7, resource: { buffer: B.aux } },
        { binding: 8, resource: { buffer: splatBuf } },
      ],
    });
    renderGroup = device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuf } },
        { binding: 1, resource: { buffer: B.dyeA } },
        { binding: 2, resource: { buffer: B.velA } },
      ],
    });
  }

  // ── Input queues ──────────────────────────────────────────────────────
  const queue: FluidSplatPx[] = [];
  let fx = 0, fy = 0;

  function writeSplats(): number {
    const count = Math.min(queue.length, MAX_SPLATS);
    for (let k = 0; k < count; k++) {
      const s = queue[k];
      const o = k * (SPLAT_STRIDE / 4);
      const rgb = TONE_RGB[s.tone ?? 'rain'];
      const str = (s.strength ?? 0.5) * 0.55;
      sData[o + 0] = s.x / cell;
      sData[o + 1] = s.y / cell;
      sData[o + 2] = s.dx / cell;
      sData[o + 3] = s.dy / cell;
      sData[o + 4] = rgb[0] * str;
      sData[o + 5] = rgb[1] * str;
      sData[o + 6] = rgb[2] * str;
      sData[o + 7] = str;
      sData[o + 8] = Math.max(1.2, (s.radius ?? 16) / cell);
    }
    queue.splice(0, count);
    if (count) device.queue.writeBuffer(splatBuf, 0, sData.buffer, 0, count * SPLAT_STRIDE);
    return count;
  }

  let jacobiIters = 18;
  let time = 0;

  function step(dt: number) {
    if (lost || !simGroup) return;
    time += dt;
    const count = writeSplats();
    uU[0] = W; uU[1] = H;
    uF[2] = dt;
    uF[3] = Math.pow(0.35, dt);   // velocity keeps ~35% after one second
    uF[4] = Math.pow(0.3, dt);    // dye fades like a ripple on a puddle
    uF[5] = 22;                   // vorticity confinement: curls, not mush
    uU[6] = count;
    uF[7] = 0.8;
    uF[8] = fx / cell; uF[9] = fy / cell;
    uF[10] = 1 / W; uF[11] = 1 / H;
    uF[12] = time;
    fx = 0; fy = 0;
    device.queue.writeBuffer(uniformBuf, 0, uData);

    const enc = device.createCommandEncoder();
    const gx = Math.ceil(W / 8), gy = Math.ceil(H / 8);
    const run = (p: GPUAny) => {
      const pass = enc.beginComputePass();
      pass.setPipeline(p);
      pass.setBindGroup(0, simGroup);
      pass.dispatchWorkgroups(gx, gy);
      pass.end();
    };
    const copy = (from: GPUAny, to: GPUAny) => enc.copyBufferToBuffer(from, 0, to, 0, from.size);

    run(P.splat); copy(B.velB, B.velA); copy(B.dyeB, B.dyeA);
    run(P.curl);
    run(P.vorticity); copy(B.velB, B.velA);
    run(P.divergence);
    run(P.pdecay); copy(B.pB, B.pA);
    for (let k = 0; k < jacobiIters; k++) { run(P.jacobi); copy(B.pB, B.pA); }
    run(P.project); copy(B.velB, B.velA);
    run(P.advectVel); copy(B.velB, B.velA);
    run(P.advectDye); copy(B.dyeB, B.dyeA);

    const rp = enc.beginRenderPass({
      colorAttachments: [{
        view: ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    rp.setPipeline(renderPipe);
    rp.setBindGroup(0, renderGroup);
    rp.draw(3);
    rp.end();
    device.queue.submit([enc.finish()]);
  }

  return {
    kind: 'webgpu',
    resize(cssW, cssH, dpr) {
      // Render at half the device resolution: the surface is soft by nature.
      const scale = Math.min(dpr, 2) * 0.5;
      canvas.width = Math.max(1, Math.round(cssW * scale));
      canvas.height = Math.max(1, Math.round(cssH * scale));
      allocate(cssW, cssH);
    },
    splat(s) { if (queue.length < MAX_SPLATS * 4) queue.push(s); },
    force(x, y) { fx += x; fy += y; },
    step(dt) {
      const t0 = performance.now();
      step(dt);
      // Adaptive quality: shed pressure iterations on slow GPUs.
      const cost = performance.now() - t0;
      if (cost > 6 && jacobiIters > 8) jacobiIters--;
      else if (cost < 2 && jacobiIters < 18) jacobiIters++;
    },
    isLost: () => lost,
    destroy() {
      Object.values(B).forEach((b) => b.destroy());
      uniformBuf.destroy();
      splatBuf.destroy();
      ctx.unconfigure?.();
      device.destroy?.();
    },
  };
}
