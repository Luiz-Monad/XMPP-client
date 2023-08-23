
// SCHEMA
//    jid: 'string',
//    ver: 'string'

class RosterVerStorage {
    private storage: any;
    constructor(storage: any) {
        this.storage = storage;
    };
    setup(db) {
        if (db.objectStoreNames.contains('rosterver')) {
            db.deleteObjectStore('rosterver');
        }
        db.createObjectStore('rosterver', {
            keyPath: 'jid'
        });
    };
    transaction(mode) {
        var trans = this.storage.db.transaction('rosterver', mode);
        return trans.objectStore('rosterver');
    };
    set(jid, ver, cb) {
        cb = cb || function () {};
        var data = {
            jid: jid,
            ver: ver
        };
        var request = this.transaction('readwrite').put(data);
        request.onsuccess = function () {
            cb(false, data);
        };
        request.onerror = cb;
    };
    get(jid, cb) {
        cb = cb || function () {};
        if (!jid) {
            return cb('not-found');
        }
        var request = this.transaction('readonly').get(jid);
        request.onsuccess = function (e) {
            var res = request.result;
            if (res === undefined) {
                return cb('not-found');
            }
            cb(false, request.result);
        };
        request.onerror = cb;
    };
    remove(jid, cb) {
        cb = cb || function () {};
        var request = this.transaction('readwrite')['delete'](jid);
        request.onsuccess = function (e) {
            cb(false, request.result);
        };
        request.onerror = cb;
    };
};


export default RosterVerStorage;
