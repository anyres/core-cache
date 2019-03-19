export interface ICache<T> {
  v: T;
  e: number;
}

export interface ICacheStore {
  getItem<T>(key: string): Promise<T>;

  setItem<T>(key: string, value: T): Promise<T>;

  removeItem(key: string): Promise<void>;

  clear(): Promise<void>;

  length(): Promise<number>;

  keys(): Promise<string[]>;

  iterate<T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U): Promise<U>;
}
