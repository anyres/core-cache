import * as localForage from "localforage";
import { of, timer } from "rxjs";
import { filter } from "rxjs/operators";
import { CacheStore } from "../cache-store";
import { CacheNotifyTypeEnum, ICacheStore } from "../interfaces";
import { MemoryStore } from "../stores";

localForage.config({
  driver: [
    localForage.INDEXEDDB,
    localForage.WEBSQL,
    localForage.LOCALSTORAGE,
  ], // Force WebSQL; same as using setDriver()
  name: "myApp",
  version: 1.0,
  size: 4980736, // Size of database, in bytes. WebSQL-only for now.
  storeName: "keyvaluepairs", // Should be alphanumeric, with underscores.
  description: "some description",
});

function memoryStoreFactory() {
  return new MemoryStore();
}
function localForageFactory() {
  return localForage.createInstance({
    storeName: `${Math.random()}`,
  });
}
testFunc("memory", memoryStoreFactory);
testFunc("localForage", localForageFactory);
function testFunc(storeName: string, storeConstructor: () => ICacheStore) {

  describe(`test ${storeName} CacheStore`, () => {
    let store: ICacheStore;
    let cacheStore: CacheStore;
    const KEY = "a";

    beforeEach(() => {
      store = storeConstructor();
      cacheStore = new CacheStore(store);
    });
    afterEach(async () => {
      await cacheStore.destroy();
    });
    describe("set", async () => {
      test("should be set number", async () => {
        await cacheStore.set(KEY, 1).toPromise();

        expect(await cacheStore.get(KEY).toPromise()).toEqual(1);
      });
      test("should be set array", async () => {
        await cacheStore.set(KEY, [1, 2]).toPromise();
        const ret = await cacheStore.get(KEY).toPromise() as number[];
        expect(ret.length).toBe(2);
        expect(ret[0]).toBe(1);
        expect(ret[1]).toBe(2);
      });
      test("should be set Observable", async () => {
        await cacheStore.set(KEY, of(10)).toPromise();
        const res = await cacheStore.get(KEY).toPromise();
        expect(res).toBe(10);
        expect(await cacheStore.get(KEY).toPromise()).toEqual(10);
      });
      test("should be overwirte key", async () => {
        await cacheStore.set(KEY, 1).toPromise();
        expect(await cacheStore.get(KEY).toPromise()).toEqual(1);
        await cacheStore.set(KEY, 2).toPromise();
        expect(await cacheStore.get(KEY).toPromise()).toEqual(2);
      });
    });

    describe("#has", () => {
      test("shoule be return true if key exists", async () => {
        await cacheStore.set(KEY, 10).toPromise();
        expect(await cacheStore.has(KEY)).toBe(true);
      });
      test("shoule be return true if key not exists", async () => {
        expect(await cacheStore.has(KEY)).toBe(false);
      });
    });


    describe("#remove", () => {
      test("shoule be return null because has removed", async () => {
        await cacheStore.set(KEY, 10).toPromise();
        expect(await cacheStore.get(KEY).toPromise()).toEqual(10);
        await cacheStore.remove(KEY);
        expect(await cacheStore.get(KEY).toPromise()).toBeNull();
      });
      test("should be remove invalid key", async () => {
        const key = "test";
        expect(await cacheStore.get(key).toPromise()).toBeNull();
        await cacheStore.remove(key);
        expect(await cacheStore.get(key).toPromise()).toBeNull();
      });
    });


    describe("#clear", () => {
      test("shoule be return null", async () => {
        await cacheStore.set(KEY, 10).toPromise();
        await cacheStore.set(KEY + "1", 100).toPromise();
        expect(await cacheStore.get(KEY).toPromise()).toEqual(10);
        expect(await cacheStore.get(KEY + "1").toPromise()).toEqual(100);
        await cacheStore.clear();
        expect(await cacheStore.get(KEY).toPromise()).toBeNull();
        expect(await cacheStore.get(KEY + "1").toPromise()).toBeNull();
      });
      test("should be notify a remove event", async (done: () => void) => {
        cacheStore
          .notify(KEY)
          .pipe(
            filter((w) => w.type === CacheNotifyTypeEnum.Remove),
          )
          .subscribe((res) => {
            expect(res.type).toBe(CacheNotifyTypeEnum.Remove);
            done();
          });
        cacheStore.freq = 10;
        await cacheStore.set(KEY, 10, 1).toPromise();
        cacheStore.clear();
      });
    });

    describe("#notify", () => {
      test("should notify set", async (done: () => void) => {
        cacheStore
          .notify(KEY)
          .pipe(filter((w) => w.type === CacheNotifyTypeEnum.Set))
          .subscribe((res) => {
            expect(res.type).toBe(CacheNotifyTypeEnum.Set);
            expect(res.value).toBe(1);
            done();
          });
        await cacheStore.set(KEY, 1).toPromise();
      });
      test("should notify remove", async (done: () => void) => {
        cacheStore
          .notify(KEY)
          .pipe(filter((w) => w.type === CacheNotifyTypeEnum.Remove))
          .subscribe((res) => {
            expect(res.type).toBe(CacheNotifyTypeEnum.Remove);
            done();
          });
        await cacheStore.remove(KEY);
      });
      test("should notify expired", async (done: () => void) => {
        cacheStore
          .notify(KEY)
          .pipe(filter((w) => w.type === CacheNotifyTypeEnum.Expire))
          .subscribe((res) => {
            expect(res.type).toBe(CacheNotifyTypeEnum.Expire);
            done();
          });
        cacheStore.freq = 10;
        await cacheStore.set(KEY, 1, 1).toPromise();
      });
      test("should be cancel notify", async () => {
        expect(cacheStore.hasNotify(KEY)).toBe(false);
        cacheStore.notify(KEY).subscribe();
        expect(cacheStore.hasNotify(KEY)).toBe(true);
        cacheStore.cancelNotify(KEY);
        expect(cacheStore.hasNotify(KEY)).toBe(false);
      });
      test("shoulb be call cancel notify when is invalid key", async () => {
        expect(cacheStore.hasNotify(KEY)).toBe(false);
        cacheStore.cancelNotify(KEY);
        expect(cacheStore.hasNotify(KEY)).toBe(false);
      });
      test("should be clear notify", async () => {
        expect(cacheStore.hasNotify(KEY)).toBe(false);
        cacheStore.notify(KEY).subscribe();
        expect(cacheStore.hasNotify(KEY)).toBe(true);
        cacheStore.clearNotify();
        expect(cacheStore.hasNotify(KEY)).toBe(false);
      });
    });

  });

}
