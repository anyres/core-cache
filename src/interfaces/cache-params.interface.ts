import { CacheStore } from "../stores";

export interface ICacheParams {
  store: CacheStore;
  expire?: number;
}
