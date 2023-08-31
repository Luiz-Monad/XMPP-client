
import Storage from './index'
import { LegacyEntityCaps } from 'stanza/protocol';

type DiscoId = string;

export type Disco = {
    ver: DiscoId;
    caps: LegacyEntityCaps[];
}

type Cb = ((err: string | Event | null, res?: Disco) => void) | null;

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
    add(disco: LegacyEntityCaps[], cb?: Cb) {
        cb = cb || function () { };
        const data = {
            ver: '1',
            caps: disco,
        };
        const request = this.transaction('readwrite').put(data);
        request.onsuccess = function () {
            cb!(null, data);
        };
        request.onerror = cb;
    };
    get(cb?: Cb) {
        cb = cb || function () { };
        const ver = '1';
        const request = this.transaction('readonly').get(ver);
        request.onsuccess = function (e) {
            const res = request.result;
            if (res === undefined) {
                return cb!('not-found');
            }
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
};

export default DiscoStorage;
