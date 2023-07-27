export function debounce<Params extends any[]>(
  func: (...args: Params) => any,
  timeout: number = 300
): (...args: Params) => void {
  let timer: NodeJS.Timeout;
  return (...args: Params) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

export function throttle<Params extends any[]>(
  func: (...args: Params) => any,
  wait: number = 300
): (...args: Params) => void {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;
  return function (...args: Params) {
    if (!inThrottle) {
      func(...args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          func(...args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
}
