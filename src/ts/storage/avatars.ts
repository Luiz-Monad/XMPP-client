import Storage from './index'

type AvatarId = string; //sha1 hash

export type Avatar = {
    id: AvatarId;
    type: string;
    uri: string;
}

type Cb = ((err: string | Event | null, res?: Avatar) => void) | null;

class AvatarStorage {
    private storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    };
    setup(db: IDBDatabase) {
        if (db.objectStoreNames.contains('avatars')) {
            db.deleteObjectStore('avatars');
        }
        db.createObjectStore('avatars', {
            keyPath: 'id'
        });
    };
    transaction(mode: IDBTransactionMode) {
        const trans = this.storage.db.transaction('avatars', mode);
        return trans.objectStore('avatars');
    };
    add(avatar: Avatar, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').put(avatar);
        request.onsuccess = function () {
            cb!(null, avatar);
        };
        request.onerror = cb;
    };
    get(id?: AvatarId, cb?: Cb) {
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
    remove(id: AvatarId, cb?: Cb) {
        cb = cb || function () { };
        const request = this.transaction('readwrite').delete(id);
        request.onsuccess = function (e) {
            cb!(null, request.result);
        };
        request.onerror = cb;
    };
};

export default AvatarStorage;
