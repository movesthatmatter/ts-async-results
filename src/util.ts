export const traceAsyncErrors = async <T>(fn: () => Promise<T>) => {
  var startStack = new Error().stack || '';
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      error.stack =
        error.stack + '\n' + startStack.substring(startStack.indexOf('\n') + 1);
    }
    throw error;
  }
};
