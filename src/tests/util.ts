import { IsExact } from 'conditional-type-checks';

export function isExactType<A, B>(x: IsExact<A, B>) {}

export const delay = (ms: number = 10) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
