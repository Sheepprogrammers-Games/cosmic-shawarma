const zones = [];
let logicalPoint = (x, y) => ({ x, y });
let activeDrag = null;

export function beginFrame() { zones.length = 0; }

export function zone(id, rect, z, onTap) {
  zones.push({ id, type: 'rect', shape: rect, z, onTap });
}

export function circleZone(id, circle, z, onTap) {
  zones.push({ id, type: 'circle', shape: circle, z, onTap });
}

export function dragZone(id, rect, z, handlers = {}) {
  zones.push({ id, type: 'rect', shape: rect, z, drag: handlers });
}

function hit(item, point) {
  const s = item.shape;
  if (item.type === 'circle') return (point.x - s.x) ** 2 + (point.y - s.y) ** 2 <= s.r ** 2;
  return point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h;
}

function dispatch(clientX, clientY, event) {
  const point = logicalPoint(clientX, clientY);
  const ordered = [...zones].sort((a, b) => b.z - a.z);
  const target = ordered.find((item) => hit(item, point));
  if (target) target.onTap(point, event);
}

export function bindPointer(canvas, toLogical) {
  logicalPoint = toLogical;
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const point = logicalPoint(event.clientX, event.clientY);
    const target = [...zones].sort((a, b) => b.z - a.z).find((item) => hit(item, point));
    if (target?.drag) {
      activeDrag = target.drag;
      canvas.style.cursor = 'grabbing';
      activeDrag.onStart?.(point, event);
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    dispatch(event.clientX, event.clientY, event);
  }, { passive: false });
  canvas.addEventListener('pointermove', (event) => {
    if (!activeDrag) {
      const point = logicalPoint(event.clientX, event.clientY);
      const target = [...zones].sort((a, b) => b.z - a.z).find((item) => hit(item, point));
      canvas.style.cursor = target ? (target.drag ? 'grab' : 'pointer') : 'default';
      return;
    }
    event.preventDefault();
    activeDrag.onMove?.(logicalPoint(event.clientX, event.clientY), event);
  }, { passive: false });
  const finishDrag = (event) => {
    if (!activeDrag) return;
    event.preventDefault();
    const drag = activeDrag;
    activeDrag = null;
    canvas.style.cursor = 'default';
    drag.onEnd?.(logicalPoint(event.clientX, event.clientY), event);
    canvas.releasePointerCapture?.(event.pointerId);
  };
  canvas.addEventListener('pointerup', finishDrag, { passive: false });
  canvas.addEventListener('pointercancel', finishDrag, { passive: false });
}

export const inputTest = { dispatch, zones };
