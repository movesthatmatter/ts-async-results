import { Result, Ok, Err } from 'ts-results';
import { traceAsyncErrors } from './util';

const resolutionError = 'ResolutionError';
type ResolutionError = typeof resolutionError;

export type AsyncResultErrors = ResolutionError;

export class AsyncResultWrapper<T, E> {
  public readonly isAsync = true;

  public readonly result: Promise<Result<T, E>>;

  constructor(
    result:
      | Result<T, E>
      | AsyncResult<T, E>
      | Promise<Result<T, E>>
      // | Promise<AsyncResult<T, E>> // TODO: This could be a good use case too but it breaks other code for now
      | (() => Result<T, E>)
      | (() => AsyncResult<T, E>)
      | (() => Promise<Result<T, E>>)
      | (() => Promise<AsyncResult<T, E>>)
  ) {
    this.result = Promise.resolve(
      typeof result === 'function' ? result() : result
    )
      // Resolve it if it's an AsyncResult
      .then((r) => (AsyncResult.isAsyncResult(r) ? r.resolve() : r));
  }

  resolve(): Promise<Result<T, E>> {
    return this.result;
  }

  async resolveUnwrap(): Promise<T> {
    const r = await this.resolve();

    if (r.ok) {
      return r.val;
    }

    throw r.val;
  }

  async resolveUnwrapOr<F>(fallback: F): Promise<T | F> {
    try {
      const r = await this.resolveUnwrap();

      return r;
    } catch {
      return fallback;
    }
  }

  map<T2>(mapper: (val: T) => T2): AsyncResultWrapper<T2, E> {
    const mapped: Promise<Result<T2, E>> = this.result.then((r) =>
      r.ok ? new Ok(mapper(r.val)) : r
    );

    return new AsyncResultWrapper(traceAsyncErrors(() => mapped));
  }

  mapErr<E2>(mapper: (val: E) => E2): AsyncResultWrapper<T, E2> {
    const mapped: Promise<Result<T, E2>> = this.result.then((r) =>
      r.ok ? r : new Err(mapper(r.val))
    );

    return new AsyncResultWrapper(traceAsyncErrors(() => mapped));
  }

  flatMap<T2, E2>(
    mapper: (val: T) => Result<T2, E2> | AsyncResultWrapper<T2, E | E2>
  ): AsyncResultWrapper<T2, E | E2> {
    const mapped: Promise<Result<T2, E | E2>> = this.result.then((r) => {
      if (!r.ok) {
        return r;
      }

      const newRes = mapper(r.val);

      if (AsyncResult.isAsyncResult(newRes)) {
        return newRes.result;
      }

      return newRes;
    });

    return new AsyncResultWrapper(traceAsyncErrors(() => mapped));
  }

  flatMapErr<T2, E2>(
    mapper: (val: E) => Result<T2, E2> | AsyncResultWrapper<T2, E2>
  ): AsyncResultWrapper<T | T2, E2> {
    const mapped: Promise<Result<T | T2, E2>> = this.result.then((r) => {
      if (r.ok) {
        return r;
      }

      const newRes = mapper(r.val);

      if (AsyncResult.isAsyncResult(newRes)) {
        return newRes.result;
      }

      return newRes;
    });

    return new AsyncResultWrapper(traceAsyncErrors(() => mapped));
  }
}

export class AsyncOk<T> extends AsyncResultWrapper<T, never> {
  static readonly EMPTY = new AsyncOk<void>(undefined);

  constructor(resolver: T | Promise<T>) {
    super(Promise.resolve(resolver).then((val) => new Ok(val)));
  }
}

export class AsyncErr<E> extends AsyncResultWrapper<never, E> {
  static readonly EMPTY = new AsyncErr<void>(undefined);

  constructor(resolver: E | Promise<E>) {
    super(Promise.resolve(resolver).then((val) => new Err(val)));
  }
}

export type AsyncResult<T, E> = AsyncResultWrapper<T, E>;

export type AsyncResultOkType<T extends AsyncResult<any, any>> =
  T extends AsyncResult<infer U, any> ? U : never;
export type AsyncResultErrType<T extends AsyncResult<any, any>> =
  T extends AsyncResult<any, infer U> ? U : never;

export type AsyncResultOkTypes<T extends AsyncResult<any, any>[]> = {
  [key in keyof T]: T[key] extends AsyncResult<infer U, any> ? U : never;
};
export type AsyncResultErrTypes<T extends AsyncResult<any, any>[]> = {
  [key in keyof T]: T[key] extends AsyncResult<any, infer U> ? U : never;
};

export namespace AsyncResult {
  /**
   * Parse a set of `Result`s, returning an array of all `Ok` values.
   * Short circuits with the first `Err` found, if any
   */
  export function all<T extends AsyncResult<any, any>[]>(
    ...results: T
  ): AsyncResult<AsyncResultOkTypes<T>, AsyncResultErrTypes<T>[number]> {
    const resolver = Promise.all<Result<any, any>>(
      results.map((r) => r.resolve())
    ).then((results) => Result.all(...results));

    return new AsyncResultWrapper(resolver) as AsyncResult<
      AsyncResultOkTypes<T>,
      AsyncResultErrTypes<T>[number]
    >;
  }

  export function toAsyncResult<T, E = unknown>(
    result:
      | Result<T, E>
      | Promise<Result<T, E>>
      | AsyncResult<T, E>
      | (() => Promise<Result<T, E>>)
      | (() => Result<T, E>)
      | (() => AsyncResult<T, E>)
      | (() => Promise<AsyncResult<T, E>>)
  ) {
    return new AsyncResultWrapper<T, E>(result);
  }

  export function passThrough<T>(fn: (item: T) => unknown) {
    return (item: T) => {
      fn(item);
      return item;
    };
  }

  function isObject(item: unknown): item is Object {
    return typeof item === 'object' && !Array.isArray(item) && item !== null;
  }

  // Use this to get inherited keys as well
  const keyInObject = <X extends {}, Y extends PropertyKey>(
    obj: X,
    prop: Y
  ): obj is X & Record<Y, unknown> => prop in obj;

  export function isAsyncResult<T, E>(t: unknown): t is AsyncResult<T, E> {
    return isObject(t) && keyInObject(t, 'isAsync') && t.isAsync === true;
  }
}
