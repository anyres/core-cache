
import { BehaviorSubject, from, Observable, of, pipe, Subscription, timer } from "rxjs";
import { filter, map, switchMap, take, tap } from "rxjs/operators";
import { CacheNotifyTypeEnum, ICache, ICacheNotifyResult, ICacheStore } from "./interfaces";

export class CacheStore {
  public expireSubscription: Subscription;
  public freqTick: number = 3000;
  private readonly notifyBuffer: Map<string, BehaviorSubject<ICacheNotifyResult<any>>> = new Map<
    string,
    BehaviorSubject<ICacheNotifyResult<any>>
  >();
  constructor(
    private readonly cacheStore: ICacheStore,
  ) {
    this.runExpireNotify();
  }
  set freq(value: number) {
    this.freqTick = Math.max(20, value);
    this.abortExpireNotify();
    this.runExpireNotify();
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

    const set$ = v$.pipe(
      take(1),
      switchMap((v) => {
        return from(this.cacheStore.setItem<ICache<T>>(key, {
          v,
          e: expire === 0 ? 0 : expire * 1000 + (new Date()).getTime(),
        }));
      }),
      tap(() => this.runNotify(key, CacheNotifyTypeEnum.Set).then()),
      map((item) => item.v),
    );
    return set$;
  }

  public async has(key: string) {
    if (this.cacheStore.has) {
      return this.cacheStore.has(key);
    } else {
      const v = await this.cacheStore.getItem(key);
      if (v === undefined || v === null) {
        return false;
      } else {
        return true;
      }
    }
  }

  public async remove(key: string) {
    this.runNotify(key, CacheNotifyTypeEnum.Remove).then();
    if (await this.has(key)) {
      await this.cacheStore.removeItem(key);
    }
  }

  public async clear() {
    this.notifyBuffer.forEach((v, k) => this.runNotify(k, CacheNotifyTypeEnum.Remove).then());
    await this.cacheStore.clear();
  }

  public notify<T>(key: string): Observable<ICacheNotifyResult<T>> {
    if (!this.notifyBuffer.has(key)) {
      const change$ = new BehaviorSubject<ICacheNotifyResult<T>>({
        type: CacheNotifyTypeEnum.Init,
        value: null,
      });
      this.notifyBuffer.set(key, change$);
    }
    return this.notifyBuffer.get(key).asObservable();
  }

  public cancelNotify(key: string): void {
    if (!this.notifyBuffer.has(key)) { return; }
    this.notifyBuffer.get(key).unsubscribe();
    this.notifyBuffer.delete(key);
  }

  public hasNotify(key: string): boolean {
    return this.notifyBuffer.has(key);
  }

  public clearNotify(): void {
    this.notifyBuffer.forEach((v) => v.unsubscribe());
    this.notifyBuffer.clear();
  }

  public async destroy() {
    await this.cacheStore.clear();
    this.abortExpireNotify();
    this.clearNotify();
  }

  private runExpireNotify() {
    this.expireSubscription = timer(0, this.freqTick)
      .pipe(
        switchMap(() => {
          const now = (new Date()).getTime();
          return from(this.cacheStore.iterate<ICache<any>, any>((value, key, iterationNumber) => {
            if (value.e !== 0 && value.e < now) {
              this.cacheStore.removeItem(key).then();
              this.runNotify(key, CacheNotifyTypeEnum.Expire).then();
            }
          }));
        }),
      ).subscribe();
  }

  private abortExpireNotify() {
    if (!this.expireSubscription.closed) {
      this.expireSubscription.unsubscribe();
    }
  }

  private async runNotify(key: string, type: CacheNotifyTypeEnum) {
    if (!this.notifyBuffer.has(key)) {
      return;
    }
    this.notifyBuffer.get(key).next({
      type, value: await this.get(key).toPromise(),
    });
  }
}
