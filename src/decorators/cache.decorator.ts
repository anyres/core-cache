import { AnyresCRUD, IResCreate, IResGet, IResQuery, IResQueryResult, IResUpdate } from "@anyres/core";
import { from, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { ICache, ICacheParams } from "../interfaces";

export function Cache({ store, expired = 0 }: ICacheParams) {
  return <
    TQ extends IResQuery,
    TQR extends IResQueryResult,
    TG extends IResGet,
    TC extends IResCreate,
    TU extends IResUpdate,
    T extends {
      new(...args: any[]): AnyresCRUD<TQ, TQR, TG, TC, TU>,
    }
  >(target: T) => {
    return class CacheAnyresCRUD extends target {
      public store = store;
      public get(id: number | string) {
        const key = `${target.prototype.path}/${id}`;
        return from(this.store.getItem<ICache<TG>>(key))
          .pipe(
            switchMap((item) => {
              if (item) {
                if (item.e > (new Date()).getTime() || item.e === 0) {
                  return of(item.v);
                }
              }
              return super.get(id)
                .pipe(
                  switchMap((v) => {
                    return from(this.store.setItem<ICache<TG>>(key, {
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
      }
    };
  };
}
