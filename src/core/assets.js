const images = new Map();
const audio = new Map();
let anchors = {};

function loadImage(name, source) {
  const spec = typeof source === 'string' ? { path: source } : source;
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images.set(name, image); resolve(); };
    image.onerror = () => reject(new Error(`Missing required image: ${name} (${spec.path})`));
    image.src = spec.path;
  });
}

async function loadAudio(name, path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('audio missing');
    audio.set(name, await response.arrayBuffer());
  } catch {
    audio.set(name, null);
  }
}

export async function load(manifest, onProgress = () => {}) {
  const jobs = [
    ...Object.entries(manifest.images || {}).map(([name, source]) => () => loadImage(name, source)),
    ...Object.entries(manifest.audio || {}).map(([name, path]) => () => loadAudio(name, path)),
  ];
  let done = 0;
  await Promise.all(jobs.map(async (job) => {
    await job();
    done += 1;
    onProgress(jobs.length ? done / jobs.length : 1);
  }));
  try {
    const response = await fetch(manifest.anchors || 'assets/anchors.json');
    if (response.ok) anchors = await response.json();
  } catch {
    anchors = {};
  }
  if (!jobs.length) onProgress(1);
}

export function img(name) {
  if (!images.has(name)) throw new Error(`Image not loaded: ${name}`);
  return images.get(name);
}

export function buf(name) { return audio.get(name) || null; }
export function anchor(name) { return anchors[name] || { x: 0.5, y: 1 }; }
