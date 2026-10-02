// Plush Squad toy worker: background removal (ormbg, Apache-2.0) + "who is it?" (MobileCLIP S0) — runs fully on device.
import { pipeline, env, AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '../vendor/tjs/transformers.min.js';

const here = new URL(self.location.href);
const LOCAL = here.searchParams.has('local');
env.allowLocalModels = LOCAL;
env.allowRemoteModels = !LOCAL;
if (LOCAL) env.localModelPath = new URL('../models/', here).href;
env.backends.onnx.wasm.wasmPaths = new URL('../vendor/tjs/', here).href;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

const CLIP = 'Xenova/mobileclip_s0';
const VISION_DTYPE = here.searchParams.get('vdt') || 'fp32';
let seg = null, proc = null, vis = null, emb = null, loading = null;

function progress(p) {
  if (p.status === 'progress' && p.total) postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
}
async function load() {
  if (loading) return loading;
  loading = (async () => {
    postMessage({ type: 'stage', stage: 'download' });
    emb = await (await fetch(new URL('../assets/arch_emb.json', here))).json();
    seg = await pipeline('background-removal', 'onnx-community/ormbg-ONNX', { dtype: 'q8', device: 'wasm', progress_callback: progress });
    proc = await AutoProcessor.from_pretrained(CLIP);
    vis = await CLIPVisionModelWithProjection.from_pretrained(CLIP, { dtype: VISION_DTYPE, device: 'wasm', progress_callback: progress });
  })();
  try { await loading; } catch (e) { loading = null; throw e; }
}
const norm = v => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return v.map(x => x / n); };

self.onmessage = async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === 'warmup') { await load(); postMessage({ type: 'ready' }); return; }
    if (msg.type !== 'process') return;
    await load();
    postMessage({ type: 'stage', stage: 'cutout' });
    const { w, h } = msg;
    const src = new RawImage(new Uint8ClampedArray(msg.rgba), w, h, 4);
    let out = await seg(src.rgb());
    out = Array.isArray(out) ? out[0] : out;
    const rgba = out.data; // RGBA with alpha mask, same size as input
    // crop + composite on white for classification
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      if (rgba[(y * w + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    let scores = [];
    if (x1 > x0 && y1 > y0) {
      postMessage({ type: 'stage', stage: 'classify' });
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, side = Math.max(cw, ch) + 20;
      const rgb = new Uint8ClampedArray(side * side * 3).fill(255);
      const ox = Math.floor((side - cw) / 2), oy = Math.floor((side - ch) / 2);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const si = ((y + y0) * w + (x + x0)) * 4, a = rgba[si + 3] / 255, di = ((y + oy) * side + (x + ox)) * 3;
        rgb[di] = rgba[si] * a + 255 * (1 - a); rgb[di + 1] = rgba[si + 1] * a + 255 * (1 - a); rgb[di + 2] = rgba[si + 2] * a + 255 * (1 - a);
      }
      const img = new RawImage(rgb, side, side, 3);
      const { image_embeds } = await vis(await proc(img));
      const v = norm(Array.from(image_embeds.data));
      const ids = Object.keys(emb).filter(k => k !== 'mystery');
      const logits = ids.map(k => 100 * emb[k].reduce((s, x, j) => s + x * v[j], 0));
      const mx = Math.max(...logits); const ex = logits.map(l => Math.exp(l - mx)); const Z = ex.reduce((a, b) => a + b, 0);
      scores = ids.map((k, i) => [k, ex[i] / Z]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }
    const buf = new Uint8ClampedArray(rgba).buffer;
    postMessage({ type: 'done', rgba: buf, w, h, scores }, [buf]);
  } catch (e) {
    postMessage({ type: 'error', message: String(e && e.message || e) });
  }
};
