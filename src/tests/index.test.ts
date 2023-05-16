import { Err, Ok } from 'ts-results';
import { AsyncOk, AsyncErr, AsyncResultWrapper, AsyncResult } from '../index';
import { delay, isExactType } from './util';

describe('map', () => {
  test('runs on OkResult with primitives', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith(2);
  });

  test('runs on OkResult with complex types', async () => {
    const res = new AsyncResultWrapper(new Ok([2, 3, 5]));

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number[]>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith([2, 3, 5]);
  });

  test('does NOT run on ErrResult', async () => {
    const res = new AsyncResultWrapper(new Err([2, 3, 5]));

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, never>(true);
      spy(v);
    });

    await delay();
    expect(spy).not.toHaveBeenCalledWith([2, 3, 5]);
  });

  test('multiple chained maps run correctly', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();

    res
      .map((v) => v + 2)
      .map((v) => v * 10)
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith(40);
  });
});

describe('mapErr', () => {
  test('runs on ErrResult', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const spy = jest.fn();

    res.mapErr((e) => {
      isExactType<typeof e, string>(true);
      spy(e);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith('SimpleError');
  });

  test('does NOT run on OkResult', async () => {
    const res = new AsyncResultWrapper(new Ok([2, 3, 5]));

    const spy = jest.fn();

    res.mapErr((e) => {
      isExactType<typeof e, never>(true);
      spy(e);
    });

    await delay();
    expect(spy).not.toHaveBeenCalled();
  });

  test('runs with multiple mapErr chained', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const spy = jest.fn();

    res
      .mapErr((e) => e + 1)
      .mapErr((e) => e + 2)
      .mapErr((e) => e + 3)
      .mapErr((e) => {
        isExactType<typeof e, string>(true);
        spy(e);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith('SimpleError123');
  });
});

describe('flatMap', () => {
  test('runs on OkResult with primitives returning other OkResult', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();

    res
      .flatMap((v) => new Ok(v + 2))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith(4);
  });

  test('runs on OkResult returning an ErrResult', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();
    const errorSpy = jest.fn();

    res
      .flatMap((v) => new Err('SimpleError'))
      .map((v) => {
        isExactType<typeof v, never>(true);
        spy(v);
      })
      .mapErr((e) => {
        isExactType<typeof e, string>(true);
        errorSpy(e);
      });

    await delay();
    expect(spy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('SimpleError');
  });

  test('runs correctly with multiple flatmaps chained', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();
    const errorSpy = jest.fn();

    res
      .flatMap((v) => new Ok(v + 2))
      .flatMap((v) => new Ok(v * 10))
      .flatMap((v) => new Ok(v * 12))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      })
      .mapErr((e) => {
        errorSpy(e);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith(480);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('can return an AsyncResultWrapper of Ok', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();

    res
      .flatMap((v) => new AsyncResultWrapper(new Ok(v + 2)))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith(4);
  });

  test('can return an AsyncResultWrapper of Err', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spy = jest.fn();
    const spyErr = jest.fn();

    res
      .flatMap((v) => new AsyncResultWrapper(new Err('SimpleError')))
      .map((v) => {
        isExactType<typeof v, never>(true);
        spy(v);
      })
      .mapErr((e) => {
        // isExactType<typeof e, string>(true);
        spyErr(e);
      });

    await delay();
    expect(spy).not.toHaveBeenCalled();
    expect(spyErr).toHaveBeenCalledWith('SimpleError');
  });
});

describe('flatMapErr', () => {
  test('runs on ErrResult returning an OkResult', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const spy = jest.fn();

    res
      .flatMapErr((v) => new Ok(2))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(spy).toHaveBeenCalledWith(2);
  });

  test('runs on ErrResult returning an OkResult and doesnt call map before', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const beforeSpy = jest.fn();
    const spy = jest.fn();

    res
      .map((v) => {
        beforeSpy(v);
        return v;
      })
      .flatMapErr((v) => new Ok(2))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(beforeSpy).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(2);
  });

  test('gets called with the error', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const spy = jest.fn();

    res.flatMapErr(spy);

    await delay();
    expect(spy).toHaveBeenCalledWith('SimpleError');
  });

  test('gets called with the previous error in a mix', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const spy = jest.fn();

    res
      .flatMapErr((e) => new Ok(`${e}1`))
      .flatMap((v) => new Err(v))
      .flatMapErr((e) => new Ok(`${e}2`))
      .flatMap((v) => new Err(v))
      .mapErr(spy);

    await delay();
    expect(spy).toHaveBeenCalledWith('SimpleError12');
  });

  test('combination of flatMap returning AsyncErr and flatMapErr returnign AsyncOk', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const mapErrSpy = jest.fn();
    const spy = jest.fn();

    res
      .flatMap(() => new Err('FirstError'))
      .mapErr((e) => {
        mapErrSpy(e);
        return e;
      })
      .flatMapErr((v) => new Ok(3))
      .map((v) => {
        isExactType<typeof v, number>(true);
        spy(v);
      });

    await delay();
    expect(mapErrSpy).toHaveBeenCalledWith('FirstError');
    expect(spy).toHaveBeenCalledWith(3);
  });
});

describe('Resolve', () => {
  test('works with OkResult and sync resolver', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const r = await res.resolve();

    expect(r.ok).toBe(true);

    if (r.ok) {
      isExactType<typeof r, Ok<number>>(true);
    } else {
      throw 'This should never occur!';
    }
  });

  test('works with ErrResult and sync resolver', async () => {
    const res = new AsyncResultWrapper(new Err('SimpleError'));

    const r = await res.resolve();

    expect(r.ok).toBe(false);

    if (!r.ok) {
      isExactType<typeof r, Err<string>>(true);
    } else {
      throw 'This should never occur!';
    }
  });

  test('works with a long chain of maps, mapErr and flatMap', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const spyErr = jest.fn();

    const r = await res
      .map((v) => v + 2)
      .map((v) => v + 10)
      .flatMap((v) => new Ok(v + 6))
      .flatMap((v) => new AsyncResultWrapper(new Ok(v * 2)))
      .mapErr(spyErr)
      .resolve();

    expect(r.ok).toBe(true);
    expect(r.val).toBe(40);
    expect(spyErr).not.toHaveBeenCalled();

    if (r.ok) {
      isExactType<typeof r, Ok<number>>(true);
    } else {
      throw 'This should never occur!';
    }
  });

  // Not sure how to solve this, maybe it's unsolvable at runtime,
  //  but only at compile time – if the promise isn't of type Promise<Result<T, E>> it fails
  test.skip('fails with resolution error on AsyncOk', async () => {
    const res = new AsyncOk(Promise.reject('any error'));

    const spy = jest.fn();
    const spyErr = jest.fn();

    await res.map(spy).mapErr(spyErr).resolve();

    expect(spyErr).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  test.skip('fails with resolution error on AsyncErr', async () => {
    const res = new AsyncErr(Promise.reject('any error'));

    const spy = jest.fn();
    const spyErr = jest.fn();

    await res.map(spy).mapErr(spyErr).resolve();

    expect(spyErr).toHaveBeenCalledWith('ResolutionError');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('AsyncOk', () => {
  test('works from primitives', async () => {
    const res = new AsyncOk(2);

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith(2);
  });

  test('works from complex types', async () => {
    const res = new AsyncOk([2, 3]);

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number[]>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith([2, 3]);
  });

  test('works from Promises', async () => {
    const res = new AsyncOk(Promise.resolve([2, 3]));

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number[]>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith([2, 3]);
  });
});

describe('AsyncErr', () => {
  test('works from String Errors', async () => {
    const res = new AsyncErr('SimpleError');

    const spy = jest.fn();

    res.mapErr((e) => {
      isExactType<typeof e, string>(true);
      spy(e);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith('SimpleError');
  });

  test('it adds the default Resolution Error', async () => {
    const res = new AsyncErr<'SimpleError' | 'AnotherError'>(
      Math.random() < 1 ? 'SimpleError' : 'AnotherError'
    );

    res.mapErr((e) => {
      // isExactType<typeof e, 'SimpleError' | 'AnotherError' | 'ResolutionError'>(true);
    });
  });
});

describe('AsyncResultWrapper', () => {
  test('works with Promises primitives', async () => {
    const res = new AsyncResultWrapper(Promise.resolve(new Ok(4)));

    const spy = jest.fn();

    res.map((v) => {
      isExactType<typeof v, number>(true);
      spy(v);
    });

    await delay();
    expect(spy).toHaveBeenCalledWith(4);
  });
});

describe('AsyncResult.all', () => {
  test('it works with multiple ok results', async () => {
    const allResult = AsyncResult.all(new AsyncOk(2), new AsyncOk('a string'));

    const spy = jest.fn();

    await allResult.map(spy).resolve();

    expect(spy).toHaveBeenCalledWith([2, 'a string']);
  });

  test('When there is an error it just return an AsyncErr with the error', async () => {
    const allResult = AsyncResult.all(
      new AsyncOk(2),
      new AsyncOk('a string'),
      new AsyncErr('SimpleError')
    );

    const spyErr = jest.fn();
    const spy = jest.fn();

    await allResult.mapErr(spyErr).map(spy).resolve();

    expect(spy).not.toHaveBeenCalled();
    expect(spyErr).toHaveBeenCalledWith('SimpleError');
  });
});

describe('ResolveUnwrap', () => {
  test('works with OkResult and sync resolver', async () => {
    const res = new AsyncResultWrapper(new Ok(2));

    const val = await res.resolveUnwrap();

    expect(val).toBe(2);
    isExactType<typeof val, number>(true);
  });

  test('works with OkResult and async resolver', async () => {
    const res = new AsyncResultWrapper(
      Promise.resolve(new Ok({ from: 'a promise' }))
    );

    const val = await res.resolveUnwrap();

    expect(val).toEqual({ from: 'a promise' });
    isExactType<typeof val, { from: string }>(true);
  });

  test('works with ErrResult and sync resolver', async () => {
    try {
      const res = new AsyncResultWrapper(new Err('SimpleError'));
      await res.resolveUnwrap();
    } catch (actual) {
      expect(actual).toBe('SimpleError');
    }
  });

  test('works with ErrResult and async resolver', async () => {
    try {
      const res = new AsyncResultWrapper(
        Promise.resolve(new Err('AsyncError'))
      );
      await res.resolveUnwrap();
    } catch (actual) {
      expect(actual).toBe('AsyncError');
    }
  });
});

describe('UnwrapOr', () => {
  test('Ok Path', async () => {
    const res = new AsyncResultWrapper(Promise.resolve(new Ok('All Good')));
    const val = await res.resolveUnwrapOr(5);

    expect(val).toBe('All Good');
  });

  test('Err Path', async () => {
    const res = new AsyncResultWrapper(Promise.resolve(new Err('AsyncError')));
    const val = await res.resolveUnwrapOr(5);

    expect(val).toBe(5);
  });
});

describe('Wrapper', () => {
  test('Works with AsyncResult.AsyncOk', async () => {
    const res = new AsyncResultWrapper(new AsyncOk(2));
    const actual = await res.resolve();

    expect(actual.ok).toBe(true);
    expect(actual.val).toEqual(2);
  });

  test('Works with AsyncResult.AsyncErr', async () => {
    const res = new AsyncResultWrapper(new AsyncErr('test-error'));
    const actual = await res.resolve();

    expect(actual.ok).toBe(false);
    expect(actual.val).toEqual('test-error');
  });
});

describe('AsyncResult.toAsyncResult', () => {
  test('Works with AsyncResult.AsyncOk', async () => {
    const res = AsyncResult.toAsyncResult(new AsyncOk(2));
    const actual = await res.resolve();

    expect(actual.ok).toBe(true);
    expect(actual.val).toEqual(2);
  });

  test('Works with AsyncResult.AsyncErr', async () => {
    const res = AsyncResult.toAsyncResult(new AsyncErr('test-error'));
    const actual = await res.resolve();

    expect(actual.ok).toBe(false);
    expect(actual.val).toEqual('test-error');
  });
});
