
import HumanModel from 'human-model';
import getUserMedia from 'getusermedia';
import { PresenceShow } from 'stanza/Constants';
import { Presence } from 'stanza/protocol';
import crypto from 'crypto';
import resample from 'resampler';
import Contacts from './contacts';
import Calls from './calls';
import Contact, { ContactType } from './contact';
import MUCs from './mucs';
import ContactRequests from './contactRequests';
import fetchAvatar, { VCardSource, VCardType } from '../helpers/fetchAvatar';
import { fire, rail } from '../helpers/railway';
import { JID } from './jid';

const Me = HumanModel.define({
    initialize: function (opts?: { avatarID?: string }) {
        const self = this;
        this.setAvatar(opts ? opts.avatarID : null);

        this.bind('change:jid', this.load, this);
        this.bind('change:hasFocus', function () {
            self.setActiveContact(self._activeContact);
        }, this);
        this.calls.bind('add remove reset', this.updateActiveCalls, this);
        this.bind('change:avatarID', this.save, this);
        this.bind('change:status', this.save, this);
        this.bind('change:rosterVer', this.save, this);
        this.bind('change:soundEnabled', this.save, this);
        this.contacts.bind('change:unreadCount', this.updateUnreadCount, this);
        this.mucs.bind('change:unreadHlCount', this.updateUnreadCount, this);
        app.state.bind('change:active', this.updateIdlePresence, this);
        app.state.bind('change:deviceIDReady', this.registerDevice, this);
    },
    props: {
        jid: [JID, true],
        status: 'string',
        show: 'string',
        avatarID: 'string',
        rosterVer: 'string',
        nick: 'string'
    },
    session: {
        avatar: 'string',
        connected: ['bool', false, false],
        shouldAskForAlertsPermission: ['bool', false, false],
        hasFocus: ['bool', false, false],
        _activeContact: 'string',
        stream: MediaStream,
        soundEnabled: ['bool', false, true],
    },
    collections: {
        contacts: Contacts,
        contactRequests: ContactRequests,
        mucs: MUCs,
        calls: Calls,
    },
    derived: {
        displayName: {
            deps: ['nick', 'jid'],
            fn: function () {
                return this.nick || this.jid.bare;
            }
        },
        streamUrl: {
            deps: ['stream'],
            fn: function () {
                if (!this.stream) return '';
                return URL.createObjectURL(this.stream as any);
            }
        },
        organization: {
            deps: ['orga'],
            fn: function () {
                return app.serverConfig().name || 'Kaiwa';
            }
        },
        soundEnabledClass: {
            deps: ['soundEnabled'],
            fn: function () {
                return this.soundEnabled ? 'primary' : 'secondary';
            }
        },
        isAdmin: {
            deps: ['jid'],
            fn: function () {
                return this.jid.local === SERVER_CONFIG.admin ? 'meIsAdmin' : '';
            }
        },
    },
    setActiveContact: function (jid?: string) {
        const prev = this.getContact(this._activeContact);
        if (prev) {
            prev.activeContact = false;
        }
        const curr = this.getContact(jid);
        if (curr) {
            curr.activeContact = true;
            curr.unreadCount = 0;
            if ('unreadHlCount' in curr)
                curr.unreadHlCount = 0;
            this._activeContact = curr.id;
        }
    },
    getName: function (jid?: string) {
        return this.displayName;
    },
    getNickname: function (jid?: string) {
        return this.displayName !== this.nick ? this.nick : '';
    },
    getAvatar: function (jid?: string) {
        return this.avatar;
    },
    setAvatar: function (id?: string | null, type?: VCardType, source?: VCardSource) {
        const self = this;
        fire(async () => {
            const [err, avatar] = await rail(fetchAvatar('', id, type, source));
            if (err) console.warn(err);
            self.avatarID = avatar?.id;
            self.avatar = avatar?.uri;
        });
    },
    publishAvatar: function (data?: string) {
        if (!data) data = this.avatar;
        if (!data || data.indexOf('https://') !== -1) return;

        const sdata = data;
        const self = this;
        fire(async () => {
            const data = await new Promise<string>((ok, err) => resample(sdata, 80, 80, ok));
            const b64 = data.split(',');
            const b64Type = b64[0];
            const b64Data = Buffer.from(b64[1], 'base64');
            const id = crypto.createHash('sha1').update(b64Data).digest('hex');
            await app.storage.avatars.add({ id: id, type: b64Type, uri: data });
            await client.publishAvatar(id, b64Data);
            await client.useAvatars([{
                id: id,
                width: 80,
                height: 80,
                mediaType: 'image/png',
                bytes: b64Data.length
            }]);
        });
    },
    setSoundNotification: function (enable: boolean) {
        this.soundEnabled = enable;
    },
    getContact: function (jid?: string | JID, alt?: string) {
        let _jid: JID | undefined | null = null
        let _alt: JID | undefined | null = null

        if (typeof jid === 'string') {
            if (SERVER_CONFIG.domain && jid.indexOf('@') === -1) jid += '@' + SERVER_CONFIG.domain;
            _jid = JID.parse(jid);
        } else
            _jid = jid;
        if (typeof alt === 'string')
            _alt = JID.parse(alt);
        else
            _alt = alt;

        if (this.isMe(_jid)) {
            _jid = _alt || _jid;
        }

        if (!_jid) return;

        return this.contacts.get(_jid.bare) ||
            this.mucs.get(_jid.bare) ||
            this.calls.findWhere({ contact: { jid: _jid } });
    },
    setContact: function (data: Partial<ContactType>, create?: boolean) {
        let contact = this.getContact(data.jid);

        if (contact) {
            contact.set(data);
            contact.save();
        } else if (create) {
            contact = new Contact(data);
            contact.inRoster = true;
            contact.owner = this.jid.bare;
            contact.save();
            this.contacts.add(contact);
        }
    },
    removeContact: function (jid: string) {
        const self = this;
        fire(async () => {
            const [err] = await rail(client.removeRosterItem(jid));
            if (err) console.warn(err);
            const contact = self.getContact(jid);
            if (!contact) return;
            self.contacts.remove(contact.jid);
            await app.storage.roster.remove(contact.storageId);
        });
    },
    load: function () {
        if (!this.jid.bare) return;

        const self = this;
        fire(async () => {

            const [err, profile] = await rail(app.storage.profiles.get(self.jid.bare));
            if (err) console.warn(err);
            if (!err) {
                self.nick = self.jid.local;
                self.status = profile?.status;
                self.avatarID = profile?.avatarID;
                self.soundEnabled = profile?.soundEnabled;
            }
            self.save();
            const contacts = await app.storage.roster.getAll(self.jid.bare);

            contacts.forEach((ncontact) => {
                const contact = new Contact(ncontact);
                contact.owner = self.jid.bare;
                contact.inRoster = true;
                if (contact.jid.indexOf('@' + SERVER_CONFIG.domain) > -1)
                    contact.persistent = true;
                contact.save();
                self.contacts.add(contact);
            });

        });
        fire(async () => {
            this.mucs.once('loaded', function () {
                self.contacts.trigger('loaded');
            });
        });
    },
    isMe: function (jid?: string | JID | null) {
        if (typeof jid === 'string') {
            jid = JID.parse(jid);
        }
        return jid && (jid.bare === this.jid.bare);
    },
    updateJid: function (newJid: JID) {
        if (this.jid.domain && this.isMe(newJid)) {
            this.jid.full = newJid.full;
            this.jid.resource = newJid.resource;
            this.jid.unescapedFull = newJid.unescapedFull;
            this.jid.prepped = newJid.prepped;
        } else {
            this.jid = newJid;
            this.nick = this.jid.local;
        }
    },
    updateIdlePresence: function () {
        const update: Presence = {
            status: this.status,
            show: this.show as PresenceShow,
            legacyCapabilities: Object.values(client.disco.caps),
        };

        if (!app.state.active) {
            update.idleSince = app.state.idleSince;
        }

        client.sendPresence(update);
    },
    updateUnreadCount: function () {
        const sum = function (a: number, b: number) {
            return a + b;
        };

        let pmCount = this.contacts.pluck('unreadCount')
            .reduce(sum);
        pmCount = pmCount ? pmCount + ' • ' : '';

        let hlCount = this.mucs.pluck('unreadHlCount')
            .reduce(sum);
        hlCount = hlCount ? 'H' + hlCount + ' • ' : '';

        app.state.badge = pmCount + hlCount;
    },
    updateActiveCalls: function () {
        app.state.hasActiveCall = !!this.calls.length;
    },
    save: function () {
        const self = this;
        fire(async () => {
            const data = {
                jid: this.jid.bare,
                avatarID: this.avatarID,
                status: this.status,
                rosterVer: this.rosterVer,
                soundEnabled: this.soundEnabled
            };
            await app.storage.profiles.set(data);
        });
    },
    cameraOn: function () {
        const self = this;
        getUserMedia(function (err, stream) {
            if (err) {
                console.error(err);
            } else {
                self.stream = stream;
            }
        });
    },
    cameraOff: function () {
        if (this.stream) {
            const tracks = this.stream.getTracks();
            tracks.forEach(track => track.stop());
            delete this.stream;
        }
    },
    registerDevice: function () {
        const deviceID = app.state.deviceID;
        if (!!deviceID && deviceID !== undefined && deviceID !== 'undefined') {
            client.otalkRegister(deviceID, function () {
                client.registerPushService('push@push.otalk.im/prod', () => { });
            });
        }
    },
});

export default Me;
export type MeType = InstanceType<typeof Me>;
