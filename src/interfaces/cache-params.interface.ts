import * as localForage from "localforage";
import { ICacheStore } from "./cache.interface";

export interface ICacheParams {
  store: ICacheStore;
  expired?: number;
}
