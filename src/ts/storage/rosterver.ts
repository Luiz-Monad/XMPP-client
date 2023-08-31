import Storage from './index'

type RosterVerId = string;

type RosterVer = {
    jid: RosterVerId;
    ver: string;
}

type Cb = ((err: string | Event | null, res?: RosterVer) => void) | null;

class RosterVerStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('rosterver')) {
            db.deleteObjectStore('rosterver');
        }
        db.createObjectStore('rosterver', {
            keyPath: 'jid'
        });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('rosterver', mode);
        return trans.objectStore('rosterver');
    };
    set(jid: RosterVerId, ver: string, cb?: Cb) {
        cb = cb || function () { };
        const data = {
            jid: jid,
            ver: ver
        };
        const request = this.transaction('readwrite').put(data);
        request.onsuccess = function () {
            cb!(null, data);
        };
        request.onerror = cb;
    };
    get(jid?: RosterVerId, cb?: Cb) {
        cb = cb || function () { };
        if (!jid) {
            return cb!('not-found');
        }
        const request = this.transaction('readonly').get(jid);
        request.onsuccess = function (e) {
            const res = request.result;
            if (res === undefined) {
                return cb!('not-found');
            }
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
    remove(jid: RosterVerId, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').delete(jid);
        request.onsuccess = function (e) {
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
};

export default RosterVerStorage;
