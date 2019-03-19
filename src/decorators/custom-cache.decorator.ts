
import { from, Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { ICache, ICacheParams } from "../interfaces";

export type CacheAbleMethod<TI extends any[], TO extends Observable<any>> = (...arg: TI) => TO;

export function CustomCache<
  TI extends any[],
  TO extends any,
  >({
    getKey,
    store,
    expired = 0,
  }: {
    getKey: (...args: TI) => string,
  } & ICacheParams) {
  return (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<CacheAbleMethod<TI, Observable<TO>>>,
  ): TypedPropertyDescriptor<CacheAbleMethod<TI, Observable<TO>>> => {
    return {
      value(...args: TI) {
        const key = getKey(...args);
        return from(store.getItem<ICache<TO>>(key))
          .pipe(
            switchMap((item) => {
              if (item) {
                if (item.e > (new Date()).getTime() || item.e === 0) {
                  return of(item.v);
                }
              }
              return (descriptor.value.apply(this, args) as Observable<TO>)
                .pipe(
                  switchMap((v) => {
                    return from(store.setItem<ICache<TO>>(key, {
                      v,
                      e: expired,
                    }));
                  }),
                  map((newItem) => {
                    return newItem.v;
                  }),
                );
            }),
          );
      },
    };
  };
}
