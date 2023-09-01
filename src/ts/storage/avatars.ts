import Storage from './index'

type AvatarId = string; //sha1 hash

export type Avatar = {
    id: AvatarId;
    type: string;
    uri: string;
}

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
    add(avatar: Avatar) {
        return new Promise<Avatar>((ok, err) => {
            const request = this.transaction('readwrite').put(avatar);
            request.onsuccess = () => {
                ok(avatar);
            };
            request.onerror = err;
        });
    };
    get(id?: AvatarId) {
        return new Promise<Avatar>((ok, err) => {
            if (!id) {
                return err('not-found');
            }
            const request = this.transaction('readonly').get(id);
            request.onsuccess = () => {
                const res = request.result;
                if (res === undefined) {
                    return err('not-found');
                }
                ok(res);
            };
            request.onerror = err;
        });
    };
    remove(id: AvatarId) {
        return new Promise<AvatarId>((ok, err) => {
            const request = this.transaction('readwrite').delete(id);
            request.onsuccess = () => {
                ok(id);
            };
            request.onerror = err;
        });
    };
};

export default AvatarStorage;
