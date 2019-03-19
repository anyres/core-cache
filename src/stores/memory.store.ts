import { of } from "rxjs";
import { ICache, ICacheStore } from "../interfaces";

export class MemoryStore implements ICacheStore {
  private store: Map<string, any> = new Map();
  public getItem<T>(key: string) {
    return of(this.store.get(key) as T).toPromise();
  }
  public setItem<T>(key: string, value: T) {
    this.store.set(key, value);
    return of(value as T).toPromise();
  }
}
