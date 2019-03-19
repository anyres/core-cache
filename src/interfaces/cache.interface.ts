export interface ICache<T> {
  v: T;
  e: number;
}

export interface ICacheStore {
  getItem<T>(key: string): Promise<T>;

  setItem<T>(key: string, value: T): Promise<T>;
}
