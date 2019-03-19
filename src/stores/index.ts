export * from "./memory.store";
import { from, Observable, of, pipe, timer } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { ICache, ICacheStore } from "../interfaces";

export class CacheStore {
  constructor(
    private readonly cacheStore: ICacheStore,
  ) {
    timer(0, 3000)
      .pipe(
        switchMap(() => {
          const now = (new Date()).getTime();
          return from(cacheStore.iterate<ICache<any>, any>((value, key, iterationNumber) => {
            if (value.e !== 0 && value.e < now) {
              cacheStore.removeItem(key).then();
            }
          }));
        }),
      ).subscribe();
  }
  public get<T>(
    key: string,
    source: Observable<T> = null,
    expire: number = 0,
  ): Observable<T> {
    return from(this.cacheStore.getItem<ICache<T>>(key))
      .pipe(
        switchMap((item) => {
          if (item) {
            if (item.e === 0) {
              return of(item.v);
            } else if (item.e > (new Date()).getTime()) {
              return of(item.v);
            }
          }
          if (source === null) {
            return of(null);
          } else {
            return this.set(key, source, expire);
          }
        }),
      );
  }

  public set<T>(
    key: string,
    data: T | Observable<T>,
    expire: number = 0,
  ): Observable<T> {
    let v$: Observable<T>;
    if (data instanceof Observable) {
      v$ = data;
    } else {
      v$ = of(data);
    }
    return v$.pipe(
      switchMap((v) => {
        return from(this.cacheStore.setItem<ICache<T>>(key, {
          v,
          e: expire === 0 ? 0 : expire * 1000 + (new Date()).getTime(),
        }));
      }),
      map((item) => item.v),
    );
  }
}
