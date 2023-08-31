import { JID } from '../models/jid';
import { Delay } from '../models/message';
import Storage from './index';

type ArchiveId = string;

type Archive = {
    archivedId: ArchiveId;
    owner?: string;
    to?: JID;
    from?: JID;
    created?: Date;
    body?: string;
    type: string;
    delay?: Delay;
    edited?: boolean;
    acked?: boolean;
}

type Cb = ((err: string | Event | null, res?: Archive) => void) | null;
type CbArr = ((err: string | Event | null, res?: Archive[]) => void) | null;

class ArchiveStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('archive')) {
            db.deleteObjectStore('archive');
        }
        const store = db.createObjectStore('archive', {
            keyPath: 'archivedId'
        });
        store.createIndex('owner', 'owner', { unique: false });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('archive', mode);
        return trans.objectStore('archive');
    };
    add(archive: Archive, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').put(archive);
        request.onsuccess = function () {
            cb!(null, archive);
        };
        request.onerror = cb;
    };
    get(id?: ArchiveId, cb?: Cb) {
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
            request.result.acked = true;
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
    getAll(owner: unknown, cb?: CbArr) {
        cb = cb || function () { };
        const results: Archive[] = [];

        const store = this.transaction('readonly');
        const request = store.index('owner').openCursor(IDBKeyRange.only(owner));
        request.onsuccess = function (e) {
            const cursor = request.result;
            if (cursor) {
                cursor.value.acked = true;
                results.push(cursor.value as Archive);
                cursor.continue();
            } else {
                cb!(null, results);
            }
        };
        request.onerror = cb;
    };

};

export default ArchiveStorage;
