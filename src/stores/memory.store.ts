import { empty, of } from "rxjs";
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
  public removeItem(key: string) {
    this.store.delete(key);
    return empty().toPromise();
  }
  public clear() {
    this.store.clear();
    return empty().toPromise();
  }
  public length() {
    return of(this.store.size).toPromise();
  }
  public keys() {
    return of(Array.from(this.store.keys())).toPromise();
  }
  public iterate<T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U) {
    const entries = this.store.entries();
    let entry = entries.next();
    let done = entry.done;
    let result: U;
    let iterationNumber = 0;
    while (done === false && result === undefined) {
      const [key, value] = entry.value;
      result = iteratee(value, key, iterationNumber);
      entry = entries.next();
      done = entry.done;
      iterationNumber++;
    }
    return of(result).toPromise();
  }
  public has(key: string) {
    return of(this.store.has(key)).toPromise();
  }
}
