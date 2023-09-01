
import Storage from './index'

type DiscoId = string;

export type Disco = {
    ver: DiscoId;
    features: string[];
}

class DiscoStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('disco')) {
            db.deleteObjectStore('disco');
        }
        db.createObjectStore('disco', {
            keyPath: 'ver'
        });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('disco', mode);
        return trans.objectStore('disco');
    };
    add(disco: string[]) {
        return new Promise<Disco>((ok, err) => {
            const data = {
                ver: '1',
                features: disco,
            };
            const request = this.transaction('readwrite').put(data);
            request.onsuccess = function () {
                ok(data);
            };
            request.onerror = err;
        });
    };
    get() {
        return new Promise<Disco>((ok, err) => {
            const ver = '1';
            const request = this.transaction('readonly').get(ver);
            request.onsuccess = function (e) {
                const res = request.result;
                if (res === undefined) {
                    return err('not-found');
                }
                ok(request.result);
            };
            request.onerror = err;
        });
    };
};

export default DiscoStorage;
