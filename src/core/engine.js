export function createEngine({ canvas, update, render }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const step = 1 / 60;
  let frame = 0;
  let last = 0;
  let accumulator = 0;
  let running = false;
  let now = 0;

  function tick(time) {
    if (!running) return;
    now = time / 1000;
    accumulator += Math.min(0.05, (time - last) / 1000 || step);
    last = time;
    let updates = 0;
    while (accumulator >= step && updates < 3) {
      update(step);
      accumulator -= step;
      updates += 1;
    }
    render(ctx);
    frame = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      accumulator = 0;
    },
    get now() { return now; },
  };
}
