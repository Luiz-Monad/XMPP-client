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
    set(profile: Profile) {
        return new Promise<Profile>((ok, err) => {
            const request = this.transaction('readwrite').put(profile);
            request.onsuccess = () => {
                ok(profile);
            };
            request.onerror = err;
        });
    };
    get(id?: ProfileId) {
        return new Promise<Profile>((ok, err) => {
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
    remove(id: ProfileId) {
        return new Promise<ProfileId>((ok, err) => {
            const request = this.transaction('readwrite').delete(id);
            request.onsuccess = () => {
                ok(id);
            };
            request.onerror = err;
        });
    };
};

export default ProfileStorage;
