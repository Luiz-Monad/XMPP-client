import Storage from './index'

type ProfileId = string;

export type Profile = {
    jid: ProfileId;
    name?: string;
    avatarID?: string;
    status?: string;
    rosterVer?: string;
    soundEnabled?: boolean;
}

type Cb = ((err: string | Event | null, res?: Profile) => void) | null;

class ProfileStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('profiles')) {
            db.deleteObjectStore('profiles');
        }
        db.createObjectStore('profiles', {
            keyPath: 'jid'
        });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('profiles', mode);
        return trans.objectStore('profiles');
    };
    set(profile: Profile, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').put(profile);
        request.onsuccess = function () {
            cb!(null, profile);
        };
        request.onerror = cb;
    };
    get(id?: ProfileId, cb?: Cb) {
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
    remove(id: ProfileId, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').delete(id);
        request.onsuccess = function (e) {
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
};

export default ProfileStorage;
