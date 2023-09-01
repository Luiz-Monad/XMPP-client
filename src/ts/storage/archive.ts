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
    add(archive: Archive) {
        return new Promise<Archive>((ok, err) => {
            const request = this.transaction('readwrite').put(archive);
            request.onsuccess = function () {
                ok(archive);
            };
            request.onerror = err;
        });
    };
    get(id?: ArchiveId) {
        return new Promise<Archive>((ok, err) => {
            if (!id) {
                return err('not-found');
            }
            const request = this.transaction('readonly').get(id);
            request.onsuccess = function (e) {
                const res = request.result;
                if (res === undefined) {
                    return err('not-found');
                }
                request.result.acked = true;
                ok(request.result);
            };
            request.onerror = err;
        });
    };
    getAll(owner: unknown) {
        return new Promise<Archive[]>((ok, err) => {
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
                    ok(results);
                }
            };
            request.onerror = err;
        });
    };

};

export default ArchiveStorage;
