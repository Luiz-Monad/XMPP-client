
import _ from 'underscore';
import LocalMedia from 'localmedia';
import Contact from '../models/contact';
import Resource from '../models/resource';
import Message, { idLookup } from '../models/message';
import Call from '../models/call';
import StanzaIO, { AgentEvents } from 'stanza';
import { JID } from '../models/jid';
import { App } from '../app';
import { fire, rail } from './railway';

function createLogger(name: string) {
    return {
        info: function (str: string) {
            console.info(`${name}: ${str}`);
        },
        warn: function (str: string) {
            console.warn(`${name}: ${str}`);
        },
        error: function (str: string) {
            console.error(`${name}: ${str}`);
        },
        debug: function (str: string) {
            console.debug(`${name}: ${str}`);
        }
    };
}

const log = createLogger('Otalk');
const ioLogIn = createLogger('<< in');
const ioLogOut = createLogger('>> out');

declare module 'stanza' {

    export interface Agent {
        call(jid: string): void;
        acceptCall(sid: string): void;
        declineCall(sid: string): void;
        endCall(sid: string, reason: 'decline' | 'cancel' | 'success'): void;
    }

}

const discoCapsSave = async (disco: AgentEvents['iq:get:disco']) => {
    const jid = disco.from;
    const caps = disco.disco;

    log.info('Checking storage for caps');

    const contact = me.getContact(jid);
    const resource = contact ? contact.resources.get(jid) : null;

    const existing = await app.storage.disco.get();
    if (existing) {
        log.info('Already found info from' + jid);
        if (resource) resource.discoInfo = { features: existing.features };
        return
    }

    log.info('getting info from ' + jid);

    const result = await client.getDiscoInfo(jid, caps.node);
    if (!result?.features) {
        log.info('Couldnt get info from ' + jid);
        return;
    }

    await app.storage.disco.add(result.features);
    if (resource) resource.discoInfo = { features: result.features };
};


export default function (client: StanzaIO.Agent, app: App) {
    let localmedia: LocalMedia | null;

    client.on('raw:incoming', function (data) {
        ioLogIn.debug(data.toString());
    });

    client.on('raw:outgoing', function (data) {
        ioLogOut.debug(data.toString());
    });

    client.on('credentials:update', function (creds) {
        client.config.credentials = creds;
        if (!client.config.credentials) {
            delete localStorage.config;
            return;
        }

        if (SERVER_CONFIG.securePasswordStorage) {
            if (creds.username && creds.password) {
                delete creds.username;
                delete creds.password;
            } else if ('saltedPassword' in creds) {
                creds as StanzaIO.SASL.CacheableCredentials;
                delete creds.saltedPassword;
            }
        }

        localStorage.config = JSON.stringify({
            ...JSON.parse(localStorage.config!),
            credentials: creds
        });
    });

    client.on('disconnected', (err) => {
        app.state.connected = false;
        if (err) {
            console.error(err);
        }
        if (!app.state.hasConnected) {
            app.whenDisconnected();
        }
    });

    client.on('auth:failed', () => {
        log.warn('auth failed');
        localStorage.authFailed = true;
        app.whenDisconnected();
    });

    client.on('stream:management:resumed', () => {
        app.state.connected = true;
    });

    client.on('session:started', async (jid) => {
        if (!jid) return;
        me.updateJid(JID.parse(jid));

        app.state.connected = true;

        await Promise.all([
            async () => {
                const resp = await client.getRoster();
                if (resp && resp.items && resp.items.length) {
                    const [err] = await rail(app.storage.roster.clear());
                    if (err) console.warn(err);
                    else {
                        me.contacts.reset();
                        me.rosterVer = resp.version;

                        resp.items.forEach((item) => {
                            me.setContact(item, true);
                        });
                    }
                }

                const caps = client.updateCaps();
                if (caps) {
                    const features = client.getCurrentCaps()?.info?.features ?? [];
                    const [err] = await rail(app.storage.disco.add(features));
                    if (err) console.warn(err);
                    else {
                        client.sendPresence({
                            status: me.status,
                            legacyCapabilities: Object.values(client.disco.caps),
                        });
                        const [err] = await rail(client.enableCarbons());
                        if (err) console.warn(err);
                    }
                }

                await me.mucs.fetch();
            },

            async () => {
                const srv = await client.discoverICEServers();
                console.debug(srv);
            },

            async () => {
                const keepalive = SERVER_CONFIG.keepalive;
                if (keepalive) {
                    client.enableKeepAlive(keepalive);
                }
            },

        ]);
    });

    client.on('roster:update', (iq) => {
        const items = iq.roster.items;

        me.rosterVer = iq.roster.version;

        items?.forEach((item) => {
            const contact = me.getContact(item.jid);

            if (item.subscription === 'remove') {
                if (contact) {
                    me.removeContact(item.jid);
                }
                return;
            }

            me.setContact(item, true);
        });
    });

    client.on('subscribe', (pres) => {
        me.contactRequests.add({
            jid: pres.from
        });
    });

    client.on('available', (presence) => {
        const contact = me.getContact(presence.from);
        if (contact) {
            delete presence.id;
            const pres = {
                ...presence,
                show: presence.show || '',
                status: presence.status || '',
                priority: presence.priority || 0,
            };

            let resource = contact.resources.get(pres.from);
            if (resource) {
                // Explicitly set idleSince to null to clear
                // the model's value.
                if (!pres.idleSince) {
                    resource.set('idleSince', null);
                }
                resource.set(pres);
            } else {
                resource = new Resource(pres);
                resource.id = pres.from;
                contact.resources.add(resource);

                if (!pres.legacyCapabilities) {
                    resource.fetchDisco();
                }
                resource.fetchTimezone();
            }

            const muc = pres.muc!;
            if (muc.type === 'info' && muc.statusCodes && muc.statusCodes.indexOf('110') >= 0) {
                contact.joined = true;
            }
        }
    });

    client.on('unavailable', (pres) => {
        const contact = me.getContact(pres.from);
        if (contact) {
            const resource = contact.resources.get(pres.from);
            if (resource) {
                if (resource.id === contact.lockedResource) {
                    contact.lockedResource = '';
                }

                if (contact.resources.length === 1) {
                    contact.offlineStatus = pres.status;
                }
                contact.resources.remove(resource);
            }

            const muc = pres.muc!;
            if (muc.type === 'info' && muc.statusCodes && muc.statusCodes.indexOf('110') >= 0) {
                contact.joined = false;
            }
        }
    });

    client.on('avatar', (info) => {
        const contact = me.getContact(info.jid)!;
        let setAvatar = contact.setAvatar;
        let ctype = contact.type;
        if (!contact) {
            if (me.isMe(info.jid)) {
                setAvatar = me.setAvatar;
                ctype = 'me';
            } else {
                return;
            }
        }

        let id = '';
        let type = 'image/png';
        if (info.avatars.length > 0) {
            id = info.avatars[0].id;
            type = info.avatars[0].mediaType || 'image/png';
        }

        if (ctype === 'muc') {
            const resource = contact.resources.get(info.jid);
            if (resource) {
                resource.setAvatar(id, type, info.source);
            }
        }

        if (setAvatar) {
            setAvatar(id, type, info.source);
        }
    });

    client.on('chat:state', (info) => {
        let contact = me.getContact(info.from);
        if (contact) {
            const resource = contact.resources.get(info.from);
            if (resource) {
                resource.chatState = info.chatState;
                if (info.chatState === 'gone') {
                    contact.lockedResource = undefined;
                } else {
                    contact.lockedResource = info.from;
                }
            }
        } else if (me.isMe(info.from)) {
            if (info.chatState === 'active' || info.chatState === 'composing') {
                contact = me.getContact(info.to);
                if (contact) {
                    contact.unreadCount = 0;
                }
            }
        }
    });

    client.on('chat', (msg) => {
        const mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (contact && !msg.replace) {
            const message = new Message(msg);
            message.mid = mid;

            if (msg.archive) {
                if (me.isMe(msg.archive.item.message?.from)) {
                    message.archivedId = msg.archive.id;
                }
            }

            if (msg.carbon && msg.delay)
                msg.delay.timestamp = new Date(Date.now() + app.timeInterval);

            message.acked = true;
            const localTime = new Date(Date.now() + app.timeInterval);
            const notify = Math.round((localTime.getMilliseconds() - (message.created?.getMilliseconds() ?? 0)) / 1000) < 5;
            contact.addMessage(message, notify);
            if (msg.from == contact.jid) {
                contact.lockedResource = msg.from;
            }
        }
    });

    client.on('groupchat', (msg) => {
        const mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (contact && !msg.replace) {
            const message = new Message(msg);
            message.mid = mid;
            message.acked = true;
            const localTime = new Date(Date.now() + app.timeInterval);
            const notify = Math.round((localTime.getMilliseconds() - (message.created?.getMilliseconds() ?? 0)) / 1000) < 5;
            contact.addMessage(message, notify);
        }

        if (contact && msg.subject && 'subject' in contact) {
            contact.subject = msg.subject === 'true' ? '' : msg.subject;
        }
    });

    client.on('replace', (msg) => {
        const mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (!contact) return;

        const original = idLookup(msg.from, msg.replace);
        original.mid = mid;

        if (!original) return;

        original.correct(msg);
    });

    client.on('receipt', (msg) => {
        const contact = me.getContact(msg.from, msg.to);
        if (!contact) return;

        const original = idLookup(msg.to, msg.receipt.id);

        if (!original) return;

        original.receiptReceived = true;
    });

    client.on('message:sent', (msg) => {
        if (msg.carbon) {
            if (msg.delay)
                msg.delay.timestamp = new Date(Date.now() + app.timeInterval);

            const m = { ...msg, to: msg.to!, from: msg.from! };
            client.emit('message', m);
        }
    });

    client.on('iq:get:disco', (disco) => {
        log.info('Caps from ' + disco.from);
        discoCapsSave(disco).catch(() => log.error('Saving caps'));
    });

    client.on('stanza:acked', (stanza) => {
        if (stanza.kind === 'message') {
            const contact = me.getContact(stanza.stanza.to, stanza.stanza.from);
            if (contact) {
                const msg = idLookup(me.jid.bare, stanza.stanza.id);
                if (msg) {
                    msg.acked = true;
                }
            }
        }
    });

    client.on('jingle:incoming', (session) => {
        if (!localmedia) {
            localmedia = new LocalMedia();
            localmedia.start({}, (err, stream) => {
                if (err) {
                    session.end('decline');
                }
            });
        }
        if ('addTrack' in session) {
            const media = session as StanzaIO.Jingle.MediaSession;
            for (const stream of localmedia.localStreams) {
                for (const track of stream.getTracks()) {
                    media.addTrack(track, stream);
                }
            }
        }

        let contact = me.getContact(session.peerID);
        if (!contact) {
            contact = new Contact({ jid: JID.parse(session.peerID).bare });
            contact.resources.add({ id: session.peerID });
            me.contacts.add(contact);
        }

        const call = new Call({
            contact: contact,
            state: 'incoming',
            sid: session.sid,
        });
        contact.jingleCall = call;
        contact.callState = 'incoming';
        me.calls.add(call);

        client.sendPresence({ to: session.peerID });
        session.accept();
    });

    client.on('jingle:outgoing', (session) => {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        const call = new Call({
            contact: contact,
            state: 'outgoing',
            sid: session.sid,
        });
        contact.jingleCall = call;
        me.calls.add(call);
    });

    client.on('jingle:terminated', (session) => {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = '';
        contact.set('jingleCall', null);
        contact.onCall = false;
        if (me.calls.length == 1) { // this is the last call
            localmedia?.stop();
            localmedia = null;
        }
    });

    client.on('jingle:accepted', (session) => {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = 'activeCall';
        contact.onCall = true;
    });

    client.jingle.on('peerTrackAdded', (session: MediaSession, track: MediaStreamTrack, stream: MediaStream) => {
        me.stream = stream;
    });

    client.jingle.on('peerTrackRemoved', (session: MediaSession, track: MediaStreamTrack, stream: MediaStream) => {
        me.set('stream', null);
    });

    client.on('jingle:terminated', (session) => {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.set('stream', null);
    });

    client.on('jingle:ringing', (session) => {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = 'ringing';
    });

    client.call = (jid) => {
        fire(async () => {
            if (!localmedia) {
                localmedia = new LocalMedia();
                localmedia.start();
            }
            var sess = client.jingle.createMediaSession(jid);
            for (const stream of localmedia.localStreams) {
                for (const track of stream.getTracks()) {
                    sess.addTrack(track, stream);
                }
            }
            await sess.start();
            // sess.ring();
        });
    };

    client.acceptCall = (sid) => {
        var sess = client.jingle.sessions[sid];
        sess.accept();
    };

    client.declineCall = (sid) => {
        var sess = client.jingle.sessions[sid];
        sess.decline();
    };

    client.endCall = (sid, reason) => {
        var sess = client.jingle.sessions[sid];
        sess.end(reason);
    };

};
