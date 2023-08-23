
import AvatarStorage from './avatars';
import RosterStorage from './roster';
import DiscoStorage from './disco';
import ArchiveStorage from './archive';
import ProfileStorage from './profile';

class Storage {
    private db = null;
    private init = [];
    private avatars = new AvatarStorage(this);
    private roster = new RosterStorage(this);
    private disco = new DiscoStorage(this);
    private archive = new ArchiveStorage(this);
    private profiles = new ProfileStorage(this);
    constructor() {
    };
    private version = 3;
    open(cb) {
        cb = cb || function () {};

        var self = this;
        var request = indexedDB.open('datastorage', this.version);
        request.onsuccess = function (e) {
            self.db = e.target.result;
            cb(null, false, self.db);
        };
        request.onupgradeneeded = function (e) {
            var db = e.target.result;
            self.avatars.setup(db);
            self.roster.setup(db);
            self.disco.setup(db);
            self.archive.setup(db);
            self.profiles.setup(db);
        };
        request.onerror = function (e) {
            cb(e);
        }
    };
};


export default Storage;
