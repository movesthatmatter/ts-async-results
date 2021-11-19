# ts-async-results
An Async implementation of the awesome [ts-results](https://github.com/vultix/ts-results).

For an intro into the Result's API check out the above link or Rust's own [Result API](https://doc.rust-lang.org/std/result/).

This library only addresses the Async component of the Result.

## LOOKING FOR CONTRIBUTORS

## Contents

* [Installation](#installation)
* [Usage](#usage)
    * [Creation](#creation)
    * [Map, MapErr](#map-and-maperr)
    * [Unwrap](#unwrap)
    * [Expect](#expect)
    * [UnwrapOr](#unwrapor)
    * [Empty](#empty)
    * [Combining Results](#combining-results)
        * [Result.all](#result-all)
        * [Result.any](#result-any)

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
