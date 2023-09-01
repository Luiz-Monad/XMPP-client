import Storage from './index'

type RosterId = string;

export type Roster = {
    storageId: RosterId;
    jid: string;
    name?: string;
    subscription?: string;
    groups?: string[];
    owner?: string;
    RosterID?: string;
}

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
    add(contact: Roster) {
        return new Promise<Roster>((ok, err) => {
            const request = this.transaction('readwrite').put(contact);
            request.onsuccess = () => {
                ok(contact);
            };
            request.onerror = err;
        })
    };
    get(id?: RosterId) {
        return new Promise<Roster>((ok, err) => {
            if (!id) {
                return err('not-found');
            }
            const request = this.transaction('readonly').get(id);
            request.onsuccess = () => {
                const res = request.result;
                if (res === undefined) {
                    return err('not-found');
                }
                ok(request.result);
            };
            request.onerror = err;
        });
    };
    getAll(owner: unknown) {
        return new Promise<Roster[]>((ok, err) => {
            const results: Roster[] = [];

            const store = this.transaction('readonly');
            const request = store.index('owner').openCursor(IDBKeyRange.only(owner));
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    results.push(cursor.value as Roster);
                    cursor.continue();
                } else {
                    ok(results);
                }
            };
            request.onerror = err;
        });
    };
    remove(id: RosterId) {
        return new Promise<RosterId>((ok, err) => {
            const request = this.transaction('readwrite').delete(id);
            request.onsuccess = () => {
                ok(id);
            };
            request.onerror = err;
        });
    };
    clear() {
        return new Promise<void>((ok, err) => {
            const request = this.transaction('readwrite').clear();
            request.onsuccess = () => {
                ok()
            };
            request.onerror = err;
        });
    };
};

export default RosterStorage;
