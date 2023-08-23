
class DiscoStorage {
    private storage: any;
    constructor(storage: any) {
        this.storage = storage;
    };
    setup(db) {
        if (db.objectStoreNames.contains('disco')) {
            db.deleteObjectStore('disco');
        }
        db.createObjectStore('disco', {
            keyPath: 'ver'
        });
    };
    transaction(mode) {
        var trans = this.storage.db.transaction('disco', mode);
        return trans.objectStore('disco');
    };
    add(ver, disco, cb) {
        cb = cb || function () {};
        var data = {
            ver: ver,
            disco: disco
        };
        var request = this.transaction('readwrite').put(data);
        request.onsuccess = function () {
            cb(false, data);
        };
        request.onerror = cb;
    };
    get(ver, cb) {
        cb = cb || function () {};
        if (!ver) {
            return cb('not-found');
        }
        var request = this.transaction('readonly').get(ver);
        request.onsuccess = function (e) {
            var res = request.result;
            if (res === undefined) {
                return cb('not-found');
            }
            cb(false, res.disco);
        };
        request.onerror = cb;
    };
};


export default DiscoStorage;
