import { AnyresCRUD, IResCreate, IResGet, IResQuery, IResQueryResult, IResUpdate } from "@anyres/core";
import { ICacheParams } from "../interfaces";

export function Cache({ store, expire = 0 }: ICacheParams) {
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
      public get(id: number | string) {
        const key = `${target.prototype.path}/${id}`;
        return store.get<TG>(key, super.get(id), expire);
      }
    };
  };
}
