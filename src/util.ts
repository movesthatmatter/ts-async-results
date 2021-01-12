import { IsExact } from 'conditional-type-checks';

export function isExactType<A, B>(x: IsExact<A, B>) {}

export const delay = (ms: number = 10) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const traceAsyncErrors = async <T>(fn: () => Promise<T>) => {
  var startStack = new Error().stack || '';
  try {
    return await fn();
  } catch (error) {
    error.stack = error.stack + "\n" +
      startStack.substring(startStack.indexOf("\n") + 1);
    throw error;
  }
}
