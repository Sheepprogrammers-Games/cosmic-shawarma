// 成品投递的命中判定。成品只能拖到等待中的顾客身上，
// 判定范围覆盖顾客露在吧台之上的头与肩，不含吧台后面看不到的部分。
export const DROP_ZONE = { halfWidth: 92, top: 180, bottom: 430 };
export const EVENT_DROP_HALF = 86;

export function findDropTarget(queue, point) {
  // 从队尾往前找，后入场的顾客站在上层，优先接收。
  return [...queue].reverse().find((customer) => customer.state === 'WAITING'
    && Math.abs(point.x - customer.x) <= DROP_ZONE.halfWidth
    && point.y >= DROP_ZONE.top
    && point.y <= DROP_ZONE.bottom) || null;
}

export function isWormDropTarget(active, point) {
  if (!active || active.resolved || active.def.id !== 'worm') return false;
  return Math.abs(point.x - active.x) <= EVENT_DROP_HALF
    && Math.abs(point.y - active.y) <= EVENT_DROP_HALF;
}

// 按下与松手落在同一处时视为点击而非拖拽，用来给出“需要拖动”的提示。
export function isTapNotDrag(start, end, tolerance = 12) {
  if (!start || !end) return false;
  return Math.abs(start.x - end.x) <= tolerance && Math.abs(start.y - end.y) <= tolerance;
}
