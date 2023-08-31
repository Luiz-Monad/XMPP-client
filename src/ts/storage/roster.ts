import Storage from './index'

type RosterId = string;

export type Roster = {
    storageId: RosterId;
    jid: string;
    name?: string;
    subscription?: string;
    groups?: string[];
    owner?: string;
    avatarID?: string;
}

type Cb = ((err: string | Event | null, res?: Roster) => void) | null;
type CbArr = ((err: string | Event | null, res?: Roster[]) => void) | null;

class RosterStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('roster')) {
            db.deleteObjectStore('roster');
        }
        const store = db.createObjectStore('roster', {
            keyPath: 'storageId'
        });
        store.createIndex('owner', 'owner', { unique: false });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('roster', mode);
        return trans.objectStore('roster');
    };
    add(contact?: Roster, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').put(contact);
        request.onsuccess = function () {
            cb!(null, contact);
        };
        request.onerror = cb;
    };
    get(id?: RosterId, cb?: Cb) {
        cb = cb || function () { };
        if (!id) {
            return cb!('not-found');
        }
        const request = this.transaction('readonly').get(id);
        request.onsuccess = function (e) {
            const res = request.result;
            if (res === undefined) {
                return cb!('not-found');
            }
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
    getAll(owner: unknown, cb?: CbArr) {
        cb = cb || function () { };
        const results: Roster[] = [];

        const store = this.transaction('readonly');
        const request = store.index('owner').openCursor(IDBKeyRange.only(owner));
        request.onsuccess = function (e) {
            const cursor = request.result;
            if (cursor) {
                results.push(cursor.value as Roster);
                cursor.continue();
            } else {
                cb!(null, results);
            }
        };
        request.onerror = cb;
    };
    remove(id: RosterId, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').delete(id);
        request.onsuccess = function (e) {
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
    clear(cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').clear();
        request.onsuccess = function () {
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
};

export default RosterStorage;
