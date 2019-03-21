import { CacheStore } from "../cache-store";

export interface ICacheParams {
  store: CacheStore;
  expire?: number;
}
