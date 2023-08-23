
// SCHEMA
//    jid: string
//    name: string
//    avatarID: string
//    status: string
//    rosterVer: string

class ProfileStorage {
    private storage: any;
    constructor(storage: any) {
        this.storage = storage;
    };
    setup(db) {
        if (db.objectStoreNames.contains('profiles')) {
            db.deleteObjectStore('profiles');
        }
        var store = db.createObjectStore('profiles', {
            keyPath: 'jid'
        });
    };
    transaction(mode) {
        var trans = this.storage.db.transaction('profiles', mode);
        return trans.objectStore('profiles');
    };
    set(profile, cb) {
        cb = cb || function () {};
        var request = this.transaction('readwrite').put(profile);
        request.onsuccess = function () {
            cb(false, profile);
        };
        request.onerror = cb;
    };
    get(id, cb) {
        cb = cb || function () {};
        if (!id) {
            return cb('not-found');
        }
        var request = this.transaction('readonly').get(id);
        request.onsuccess = function (e) {
            var res = request.result;
            if (res === undefined) {
                return cb('not-found');
            }
            cb(false, request.result);
        };
        request.onerror = cb;
    };
    remove(id, cb) {
        cb = cb || function () {};
        var request = this.transaction('readwrite')['delete'](id);
        request.onsuccess = function (e) {
            cb(false, request.result);
        };
        request.onerror = cb;
    };
};


export default ProfileStorage;
