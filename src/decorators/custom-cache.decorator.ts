
import { Observable } from "rxjs";
import { ICacheParams } from "../interfaces";

export function CustomCache<
  TI extends any[],
  >({
    getKey,
    store,
    expire = 0,
  }: {
    getKey: (...args: TI) => string,
  } & ICacheParams) {
  return <TO>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: TI) => Observable<TO>>,
  ) => {
    return {
      value(...args: TI): Observable<TO> {
        const key = getKey(...args);
        return store.get<TO>(key, descriptor.value.apply(this, args) as Observable<TO>, expire);
      },
    };
  };
}
