
import _ from 'underscore';
import async from 'async';
import bows from 'bows';
import Contact from '../models/contact';
import Resource from '../models/resource';
import Message, { idLookup } from '../models/message';
import Call from '../models/call';
import StanzaIO, { AgentEvents } from 'stanza';
import unpromisify from './unpromisify';
import { JID } from '../models/jid';
import { App } from '../app';

const log = bows('Otalk');
const ioLogIn = bows('<< in');
const ioLogOut = bows('>> out');

declare module 'stanza' {

    export interface Agent {
        call(jid: string): void;
        acceptCall(sid: string): void;
        declineCall(sid: string): void;
        endCall(sid: string, reason: 'decline' | 'cancel' | 'success'): void;
    }

}

const discoCapsQueue = async.queue(function (pres: AgentEvents['disco:caps'], cb: () => void) {
    const jid = pres.jid;
    const caps = pres.caps;

    log.info('Checking storage for caps');

    const contact = me.getContact(jid);
    const resource = contact ? contact.resources.get(jid) : null;

    app.storage.disco.get(function (err, existing) {
        if (existing) {
            log.info('Already found info for ' + caps.ver);
            if (resource) resource.discoInfo = existing;
            return cb();
        }
        log.info('getting info for ' + caps.ver + ' from ' + jid);
        unpromisify(client.getDiscoInfo)(jid, caps.node + '#' + caps.ver, function (err, result) {
            if (err || !result.discoInfo.features) {
                log.info('Couldnt get info for ' + caps.ver);
                return cb();
            }
            if (client.verifyVerString(result.discoInfo, caps.hash, caps.ver)) {
                log.info('Saving info for ' + caps.ver);
                app.storage.disco.add(caps, function () {
                    if (resource) resource.discoInfo = data;
                    cb();
                });
            } else {
                log.info('Couldnt verify info for ' + caps.ver + ' from ' + jid);
                cb();
            }
        });
    });
});


export default function (client: StanzaIO.Agent, app: App) {

    client.on('*', function (name, data) {
        if (name === 'raw:incoming') {
            ioLogIn.debug(data.toString());
        } else if (name === 'raw:outgoing') {
            ioLogOut.debug(data.toString());
        }
    });

    client.on('credentials:update', function (creds) {
        client.config.credentials = creds;
        if (!client.config.saveCredentials) {
            delete localStorage.config;
            return;
        }

        if (SERVER_CONFIG.securePasswordStorage) {
            if (creds.clientKey && creds.serverKey) {
                delete creds.password;
                delete creds.saltedPassword;
            } else if (creds.saltedPassword) {
                delete creds.password;
            }
        } else {
            creds = {
                password: creds.password
            };
        }

        localStorage.config = JSON.stringify({
            jid: client.config.jid.bare,
            server: client.config.server,
            wsURL: client.config.wsURL,
            transports: client.config.transports,
            saveCredentials: client.config.saveCredentials,
            credentials: creds
        });
    });

    client.on('disconnected', function (err) {
        app.state.connected = false;
        if (err) {
            console.error(err);
        }
        if (!app.state.hasConnected) {
            app.whenDisconnected();
        }
    });

    client.on('auth:failed', function () {
        log.warn('auth failed');
        localStorage.authFailed = true;
        app.whenDisconnected();
    });

    client.on('stream:management:resumed', function () {
        app.state.connected = true;
    });

    client.on('session:started', function (jid) {
        if (!jid) return;
        me.updateJid(JID.parse(jid));

        app.state.connected = true;
        window.readyForDeviceID = true;

        unpromisify(client.getRoster)(function (err, resp) {
            if (resp && resp.items && resp.items.length) {
                app.storage.roster.clear(function () {
                    me.contacts.reset();
                    me.rosterVer = resp.version;

                    resp.items.forEach(function (item) {
                        me.setContact(item, true);
                    });
                });
            }

            const caps = client.updateCaps();
            if (caps) {
                app.storage.disco.add(caps, function () {
                    client.sendPresence({
                        status: me.status,
                        legacyCapabilities: Object.values(client.disco.caps),
                    });
                    client.enableCarbons();
                });
            }

            me.mucs.fetch();
        });

        const keepalive = SERVER_CONFIG.keepalive;
        if (keepalive) {
            client.enableKeepAlive(keepalive);
        }
    });

    client.on('roster:update', function (iq) {
        const items = iq.roster.items;

        me.rosterVer = iq.roster.version;

        items?.forEach(function (item) {
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

    client.on('subscribe', function (pres) {
        me.contactRequests.add({
            jid: pres.from
        });
    });

    client.on('available', function (pres) {
        const contact = me.getContact(pres.from);
        if (contact) {
            delete pres.id;
            pres.show = pres.show || '';
            pres.status = pres.status || '';
            pres.priority = pres.priority || 0;


            const resource = contact.resources.get(pres.from);
            if (resource) {
                pres.from = pres.from.full;
                // Explicitly set idleSince to null to clear
                // the model's value.
                if (!pres.idleSince) {
                    pres.idleSince = null;
                }
                resource.set(pres);
            } else {
                resource = new Resource(pres);
                resource.id = pres.from.full;
                contact.resources.add(resource);

                if (!pres.caps) {
                    resource.fetchDisco();
                }
                resource.fetchTimezone();
            }

            const muc = pres.muc || {};
            if (muc.codes && muc.codes.indexOf('110') >= 0) {
                contact.joined = true;
            }
        }
    });

    client.on('unavailable', function (pres) {
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

            const muc = pres.muc || {};
            if (muc.type === 'info' && muc.codes && muc.codes.indexOf('110') >= 0) {
                contact.joined = false;
            }
        }
    });

    client.on('avatar', function (info) {
        let contact = me.getContact(info.jid);
        if (!contact) {
            if (me.isMe(info.jid)) {
                contact = me;
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

        if (contact.type === 'muc') {
            const resource = contact.resources.get(info.jid.full);
            if (resource) {
                resource.setAvatar(id, type, info.source);
            }
        }

        if (contact.setAvatar) {
            contact.setAvatar(id, type, info.source);
        }
    });

    client.on('chatState', function (info) {
        const contact = me.getContact(info.from);
        if (contact) {
            const resource = contact.resources.get(info.from.full);
            if (resource) {
                resource.chatState = info.chatState;
                if (info.chatState === 'gone') {
                    contact.lockedResource = undefined;
                } else {
                    contact.lockedResource = info.from.full;
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

    client.on('chat', function (msg) {
        const mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (contact && !msg.replace) {
            const message = new Message(msg);
            message.mid = mid;

            if (msg.archived) {
                msg.archived.forEach(function (archived) {
                    if (me.isMe(archived.by)) {
                        message.archivedId = archived.id;
                    }
                });
            }

            if (msg.carbon)
                msg.delay.stamp = new Date(Date.now() + app.timeInterval);

            message.acked = true;
            const localTime = new Date(Date.now() + app.timeInterval);
            const notify = Math.round((localTime - message.created) / 1000) < 5;
            contact.addMessage(message, notify);
            if (msg.from.bare == contact.jid.bare) {
                contact.lockedResource = msg.from.full;
            }
        }
    });

    client.on('groupchat', function (msg) {
        msg.mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (contact && !msg.replace) {
            const message = new Message(msg);
            message.acked = true;
            const localTime = new Date(Date.now() + app.timeInterval);
            const notify = Math.round((localTime - message.created) / 1000) < 5;
            contact.addMessage(message, notify);
        }
    });

    client.on('muc:subject', function (msg) {
        const contact = me.getContact(msg.from, msg.to);
        if (contact) {
            contact.subject = msg.subject === 'true' ? '' : msg.subject;
        }
    });

    client.on('replace', function (msg) {
        const mid = msg.id;
        delete msg.id;

        const contact = me.getContact(msg.from, msg.to);
        if (!contact) return;

        const original = idLookup(msg.from, msg.replace);
        original.mid = mid;

        if (!original) return;

        original.correct(msg);
    });

    client.on('receipt', function (msg) {
        const contact = me.getContact(msg.from, msg.to);
        if (!contact) return;

        const original = idLookup(msg.to, msg.receipt);

        if (!original) return;

        original.receiptReceived = true;
    });

    client.on('message:sent', function (msg) {
        if (msg.carbon) {
            msg.delay.stamp = new Date(Date.now() + app.timeInterval);

            client.emit('message', msg);
        }
    });

    client.on('disco:caps', function (pres) {
        log.info('Caps from ' + pres.jid);
        discoCapsQueue.push(pres);
    });

    client.on('stanza:acked', function (stanza) {
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

    client.on('jingle:incoming', function (session) {
        session.addStream(localMedia.localStream);
        session.accept();

        let contact = me.getContact(session.peerID);
        if (!contact) {
            contact = new Contact({ jid: JID.parse(session.peerID).bare });
            contact.resources.add({ id: session.peerID });
            me.contacts.add(contact);
        }

        const call = new Call({
            contact: contact,
            state: 'incoming',
            jingleSession: session
        });
        contact.jingleCall = call;
        contact.callState = 'incoming';
        me.calls.add(call);
        // FIXME: send directed presence if not on roster
    });

    client.on('jingle:outgoing', function (session) {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        const call = new Call({
            contact: contact,
            state: 'outgoing',
            jingleSession: session
        });
        contact.jingleCall = call;
        me.calls.add(call);
    });

    client.on('jingle:terminated', function (session) {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = '';
        contact.jingleCall = null;
        contact.onCall = false;
        if (me.calls.length == 1) { // this is the last call
            client.stopLocalMedia();
        }
    });

    client.on('jingle:accepted', function (session) {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = 'activeCall';
        contact.onCall = true;
    });

    client.on('jingle:localstream:added', function (stream) {
        me.stream = stream;
    });

    client.on('jingle:localstream:removed', function () {
        me.stream = null;
    });

    client.on('jingle:remotestream:added', function (session) {
        const contact = me.getContact(session.peer);
        if (!contact) {
            contact.resources.add({ id: session.peer });
            me.contacts.add(contact);
        }
        contact.stream = session.streams[0];
    });

    client.on('jingle:remotestream:removed', function (session) {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.stream = null;
    });

    client.on('jingle:ringing', function (session) {
        const contact = me.getContact(session.peerID);
        if (!contact) return;
        contact.callState = 'ringing';
    });

    localMedia.start();
};
