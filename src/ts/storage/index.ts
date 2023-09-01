
import AvatarStorage from './avatars';
import RosterStorage from './roster';
import DiscoStorage from './disco';
import ArchiveStorage from './archive';
import ProfileStorage from './profile';

class Storage {
    private _db: IDBDatabase | null = null;
    readonly avatars = new AvatarStorage(this);
    readonly roster = new RosterStorage(this);
    readonly disco = new DiscoStorage(this);
    readonly archive = new ArchiveStorage(this);
    readonly profiles = new ProfileStorage(this);
    private version = 3;
    open() {
        return new Promise<IDBDatabase>((ok, err) => {
            const self = this;
            const request = indexedDB.open('datastorage', this.version);
            request.onsuccess = () => {
                self._db = request.result;
                ok(self._db);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                self.avatars.setup(db);
                self.roster.setup(db);
                self.disco.setup(db);
                self.archive.setup(db);
                self.profiles.setup(db);
            };
            request.onerror = () => {
                err(request.error);
            }
        });
    }
    get db(): IDBDatabase {
        if (!this._db) throw new Error('invalid state: not open')
        return this._db;
    }
};

export default Storage;
