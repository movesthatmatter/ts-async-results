# ts-async-results
An Async implementation of the awesome [ts-results](https://github.com/vultix/ts-results).

For an intro into the Result's API check out the above link or Rust's own [Result API](https://doc.rust-lang.org/std/result/).

This library only addresses the Async component of the Result.

## LOOKING FOR CONTRIBUTORS

## Contents

- [ts-async-results](#ts-async-results)
  - [LOOKING FOR CONTRIBUTORS](#looking-for-contributors)
  - [Contents](#contents)
  - [Installation](#installation)
  - [Usage](#usage)
      - [Creation](#creation)
      - [Wrap other Result or Async Result](#wrap-other-result-or-async-result)
      - [Map and MapErr](#map-and-maperr)
      - [Flatmap](#flatmap)
      - [FlatMapErr](#flatmaperr)
      - [Expect](#expect)
      - [Empty](#empty)
      - [Resolve](#resolve)
      - [Unwrap](#unwrap)
      - [UnwrapOr](#unwrapor)
      - [ResolveUnwrap](#resolveunwrap)
      - [ResolveUnwrapOr](#resolveunwrapor)
      - [Combining Results](#combining-results)
        - [AsyncResult.all](#asyncresultall)
        - [AsyncResult.any](#asyncresultany)

## Installation
```bash
$ npm install ts-async-results
```
or
```bash
$ yarn add ts-async-results
```

## Usage
```typescript
import { AsyncResultWrapper, AsyncErr, AsyncOk } from 'ts-async-results';
```

#### Creation
```typescript
let okAsyncResult: AsyncResult<number, Error> = new AsyncOk(10);
let okResult2 = AsyncOk<number, Error>(10); // Exact same as above

let errorResult: AsyncResult<number, Error> = new AsyncOk(new Error('bad number!'));
let errorResult2 = new AsyncOk<number, Error>(new Error('bad number!')); // Exact same as above

```

#### Wrap other Result or Async Result
```typescript

// From Result
new AsyncResultWrapper(new Ok(10));

// From Result Function
new AsyncResultWrapper(() => new Ok(10));

// From Result Async Function
let okFromResultAsyncFn = new AsyncResultWrapper(async () => {
    await delay(1);

    return new Ok(10)
});

// From Async
new AsyncResultWrapper(new AsyncOk(10));

// From Async Result Function
new AsyncResultWrapper(() => new AsyncOk(10));

// From Async Result Async Function :)
new AsyncResultWrapper(async () => {
    await delay(1);

    return new AsyncOk(10)
});

// Works in the same way with AsyncErr or the alias AsyncReult.toAsyncResult()
```

#### Map and MapErr
```typescript
const httpAsyncResult = new AsyncResultWrapper(async () => {
    try {
      const { data } = await http.get('/api');

      return new Ok(data)
    } catch (e) {
      return new Err('BadRequest');
    }
  });

httpAsyncResult
    .map((myData) => {
        // do stuff with the data
    })
    .mapErr((err) => {
        console.error(err);
    });
```

#### Flatmap
```typescript
const getResourceAsyncResult = () => new AsyncResultWrapper(async () => {
    try {
      const { data } = await http.get('/api');

      return new Ok(data)
    } catch (e) {
      return new Err('BadRequest');
    }
  });

const postResourceAndAnotherAsyncResult = (id: string) => new AsyncResultWrapper(async () => {
    try {
      const { data } = await http.post('/api', { id });

      return new Ok(data)
    } catch (e) {
      return new Err('BadRequest');
    }
  });


getResourceAsyncResult()
    .flatMap((myData) => {
        // do some more async stuff with the data and return another AsyncResult
        return postResourceAndAnotherAsyncResult(myData.id);
    })
    .map((myData) => {
        // do stuff with the data
    })
    .mapErr((err) => {
        console.error(err);
    });
```

#### FlatMapErr

```typescript

const getResourceAsyncResultWithRetry = () => new AsyncResultWrapper(async () => {
    try {
        const { data } = await http.get('/api');

        return new Ok(data)
    } catch (e) {
        return new Err('BadRequest');
    }
  })
  .flatMapErr((err) => {
        // you can intercept an Err path and transform it into a (potential) Ok path

        if (err === 'CONNECTION_FAILED') {
            const retryAttemptAsyncResult = getResourceAsyncResult();


            // If the attempt failed due to a network error automatically retry
            // NOTE: Don't use this code in production as it's veeeery inefficient!
            //       It's only meant for demonstration purposes.
            return retryAttemptAsyncResult;
        }
        else {
            // We always return back an AsyncResult
            return new AsyncErr(err);
        }
    });

getResourceAsyncResultWithRetry()
    .map((myData) => {
        // do stuff with the data
    })
    .mapErr((err) => {
        console.error(err);
    });
```

#### Expect

To use `Expect` we make use of the fact that an AsyncResult resolves to a simple Result.

```typescript
let goodAsyncResult = new AsyncOk(1);
let badAsyncResult = new AsyncErr("something went wrong");

let goodResult = (await goodAsyncResult.resolve());
let badResult = (await goodAsyncResult.resolve());

goodResult.expect('goodResult should be a number'); // 1
badResult.expect('badResult should be a number'); // throws Error("badResult should be a number - Error: something went wrong")
```

#### Empty
```typescript
function checkIsValid(isValid: boolean): AsyncResult<void, Error> {
    if (isValid) {
        return AsyncOk.EMPTY;
    } else {
        return new AsyncErr("Not valid");
    }
}
```

#### Resolve

Calling `myAsyncResult.resolve()` transforms it into a Promise<Result<T, E>>

**Ok Path**

```typescript
let asyncResult = new AsyncOk(1);

let result = (await goodAsyncResult.resolve());

console.log(result.val); // 1
```

**Error Path**

*Note: Calling `resolve()` does NOT throw when the value is an Error. See [ResolveUnwrap](#resolveUnwrap) if you need that behavior*

```typescript
let asyncResult = new AsyncErr('SimpleErr');

let result = (await goodAsyncResult.resolve());

console.log(result.val); // SimpleErr
```

#### Unwrap

To use `Unwrap` we make use of the fact that an AsyncResult resolves to a simple Result.

```typescript
let goodAsyncResult = new AsyncOk(1);
let badAsyncResult = new AsyncErr("something went wrong");

let goodResult = (await goodAsyncResult.resolve());
let badResult = (await goodAsyncResult.resolve());

goodResult.unwrap(); // 1
badResult.unwrap(); // throws Error("something went wrong")
```

#### UnwrapOr

To use `UnwrapOr` we make use of the fact that an AsyncResult resolves to a simple Result.

```typescript
let goodAsyncResult = new AsyncOk(1);
let badAsyncResult = new AsyncErr("something went wrong");

let goodResult = (await goodAsyncResult.resolve());
let badResult = (await goodAsyncResult.resolve());

let goodResult = Ok(1);
let badResult = Err(new Error("something went wrong"));

goodResult.unwrapOr(5); // 1
badResult.unwrapOr(5); // 5
```

#### ResolveUnwrap

Combines [Resolve](#resolve) and [Unwrap](#unwrap) functionalities.

```typescript
let goodAsyncResult = new AsyncOk(1);
console.log(await goodAsyncResult.resolveUnwrap()); // 1

let badAsyncResult = new AsyncErr("something went wrong");
console.log(await badAsyncResult.resolveUnwrap()); // throws Error("something went wrong")
```

#### ResolveUnwrapOr

Similar to "ResolveUnwrap" but provides a fallback for the Error path. The Ok path remains unaffected!

```typescript
let goodAsyncResult = new AsyncOk(1);
console.log(await goodAsyncResult.resolveUnwrapor(5)); // 1

let badAsyncResult = new AsyncErr("something went wrong");
console.log(await badAsyncResult.resolveUnwrapOr(5)); // 5
```


#### Combining Results
`ts-async-results` has one helper function for operating over n `Result` objects.

##### AsyncResult.all
Either returns all of the `Ok` values, or the first `Err` value

**Ok Path**
```typescript

const allResult = AsyncResult.all(
    new AsyncOk(2),
    new AsyncOk('a string'),
);

(await allResult.resolve()).unwrap()) // [2, 'a string'];
```

**Err Path**
```typescript

const allResult = AsyncResult.all(
    new AsyncOk(2),
    new AsyncErr('AnError'),
);

(await allResult.resolve()).unwrap()) // AnError
```


##### AsyncResult.any

*TBD*
