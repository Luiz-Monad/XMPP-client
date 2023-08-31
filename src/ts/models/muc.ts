
import _ from 'underscore';
import htmlify from '../helpers/htmlify';
import HumanModel from 'human-model';
import Resources from './resources';
import Messages from './messages';
import Message, { MessageType, idLookup } from './message';
import unpromisify from '../helpers/unpromisify';
import { JID } from './jid';
import { DataForm } from 'stanza/protocol';

const MUC = HumanModel.define({
    initialize: function (attrs: { jid: JID }) {
        if (attrs.jid) {
            this.id = attrs.jid.full;
        }
        const self = this;
        this.resources.bind('add remove reset', function () {
            self.membersCount = self.resources.length;
        });
    },
    type: 'muc',
    props: {
        id: ['string', true],
        name: 'string',
        autoJoin: ['bool', false, false],
        nick: 'string',
        avatar: 'string',
        jid: 'string',
    },
    session: {
        subject: 'string',
        activeContact: ['bool', false, false],
        lastInteraction: 'date',
        lastSentMessage: Message,
        unreadCount: ['number', false, 0],
        unreadHlCount: ['number', false, 0],
        persistent: ['bool', false, false],
        joined: ['bool', true, false],
        membersCount: ['number', false, 0],
    },
    derived: {
        displayName: {
            deps: ['name', 'jid'],
            fn: function () {
                let disp = this.name;
                if (!disp) disp = this.jid ?? '';
                return disp.split('@')[0];
            }
        },
        displayUnreadCount: {
            deps: ['unreadCount'],
            fn: function () {
                if (this.unreadCount && this.unreadCount > 0) {
                    if (this.unreadCount < 100)
                        return this.unreadCount.toString();
                    else
                        return '99+'
                }
                return '';
            }
        },
        displaySubject: {
            deps: ['subject'],
            fn: function () {
                return htmlify.toHTML(this.subject ?? '');
            }
        },
        hasUnread: {
            deps: ['unreadCount'],
            fn: function () {
                return this.unreadCount && this.unreadCount > 0;
            }
        },
    },
    collections: {
        resources: Resources,
        messages: Messages,
    },
    getName: function (jid?: string) {
        const nickname = (jid ?? '').split('/')[1];
        let name = nickname;
        const xmppContact = me.getContact(nickname);
        if (xmppContact) {
            name = xmppContact.displayName;
        }
        return name !== '' ? name : nickname;
    },
    getNickname: function (jid?: string) {
        const nickname = (jid ?? '').split('/')[1];
        return nickname !== this.getName(jid) ? nickname : '';
    },
    getAvatar: function (jid?: string) {
        const resource = this.resources.get(jid ?? '');
        if (resource && resource.avatar) {
            return resource.avatar;
        }
        return SERVER_CONFIG.gravatar ?
            'https://www.gravatar.com/avatar/00000000000000000000000000000000?s=80&d=mm' :
            'data:image/gif;base64,R0lGODdhAQABAIABAJmZmf///ywAAAAAAQABAAACAkQBADs='
    },
    addMessage: function (message: MessageType, notify: boolean) {
        message.owner = me.jid.bare;

        const self = this;

        const mentions = [];
        let toMe = false;
        if (message.body && self.nick && message.body.toLowerCase().indexOf(self.nick) >= 0) {
            mentions.push(self.nick);
            toMe = true;
        }
        if (message.body && message.body.toLowerCase().indexOf('all: ') >= 0) {
            mentions.push('all:');
        }
        message.mentions = mentions;

        const mine = message.from?.resource === this.nick;

        if (mine) {
            message._mucMine = true;
        }

        if (notify && (!this.activeContact || (this.activeContact && !app.state.focused)) && !mine) {
            this.unreadCount!++;
            if (toMe) {
                this.unreadHlCount! += 1;
                app.notifications.create(this.displayName, {
                    body: message.body,
                    icon: this.avatar,
                    tag: this.id,
                    onclick: _.bind(app.navigate, app, '/groupchat/' + encodeURIComponent(this.jid ?? ''))
                });
                if (me.soundEnabled)
                    app.soundManager.play('threetone-alert');
            }
            else {
                if (me.soundEnabled)
                    app.soundManager.play('ding');
            }
        }

        message.acked = true;

        if (mine) {
            this.lastSentMessage = message;
        }

        const existing = message.from && idLookup(message.from.full, message.mid);
        if (existing) {
            existing.set(message);
            existing.save();
        } else {
            this.messages.add(message);
            message.save();
        }

        const newInteraction = new Date(message.created!);
        if (!this.lastInteraction || this.lastInteraction < newInteraction) {
            this.lastInteraction = newInteraction;
        }
    },
    join: function (manual?: boolean) {
        if (!this.jid) {
            this.jid = me.jid.bare;
        }
        if (!this.nick) {
            this.nick = me.jid.local ?? me.jid.full;
        }
        this.messages.reset();
        this.resources.reset();

        client.joinRoom(this.jid, this.nick, {
            muc: {
                type: 'join',
                history: {
                    maxStanzas: 50
                },
            }
        });

        if (manual) {
            const form: DataForm = {
                fields: [
                    {
                        type: 'hidden',
                        name: 'FORM_TYPE',
                        value: 'http://jabber.org/protocol/muc#roomconfig'
                    },
                    {
                        type: 'boolean',
                        name: 'muc#roomconfig_changesubject',
                        value: true
                    },
                    {
                        type: 'boolean',
                        name: 'muc#roomconfig_persistentroom',
                        value: true
                    },
                ]
            };
            unpromisify(client.configureRoom)(this.jid, form, function (err, resp) {
                if (err) return;
            });

            if (SERVER_CONFIG.domain && SERVER_CONFIG.admin) {
                const jid = this.jid;
                unpromisify(client.setRoomAffiliation)(jid, SERVER_CONFIG.admin + '@' + SERVER_CONFIG.domain, 'owner', 'administration', function (err, resp) {
                    if (err) return;
                    client.setRoomAffiliation(jid, me.jid.bare, 'none', 'administration');
                });
            }
        }

        const self = this;
        // After a reconnection
        client.on('muc:join', function (pres) {
            if (self.messages.length) {
                self.fetchHistory(true);
            }
        });
    },
    fetchHistory: function (allInterval?: boolean) {
        const self = this;
        app.whenConnected(function () {
            const filter: {
                to?: string,
                rsm: {
                    max: number,
                    before?: boolean,
                },
                start?: Date,
                end?: Date,
            } = {
                to: self.jid,
                rsm: {
                    max: 40,
                    before: !allInterval
                },
            };

            if (allInterval) {
                const lastMessage = self.messages.last();
                if (lastMessage && lastMessage.created) {
                    filter.start = new Date(lastMessage.created);
                }
            } else {
                const firstMessage = self.messages.first();
                if (firstMessage && firstMessage.created) {
                    filter.end = new Date(firstMessage.created);
                }
            }

            const search = (filter: Parameters<typeof client.searchHistory>[1]) => client.searchHistory(filter);

            unpromisify(search)(filter, function (err, res) {
                if (err) return;

                const results = res.results || [];

                results.forEach(function (result) {
                    const msg = result.item.message ?? {};

                    const mid = msg.id ?? '';
                    delete msg.id;

                    if (!msg.delay) {
                        msg.delay = result.item.delay;
                    }

                    if (msg.replace && msg.from) {
                        const original = idLookup(msg.from, msg.replace);
                        // Drop the message if editing a previous, but
                        // keep it if it didn't actually change an
                        // existing message.
                        if (original && original.correct(msg)) return;
                    }

                    const message = new Message(msg);
                    message.mid = mid;
                    message.archivedId = result.id;
                    message.acked = true;

                    self.addMessage(message, false);
                });

                if (allInterval) {
                    self.trigger('refresh');
                    if (results.length === 40)
                        self.fetchHistory(true);
                }
            });
        });
    },
    leave: function () {
        this.resources.reset();
        if (!this.jid) return;
        client.leaveRoom(this.jid, this.nick);
    },
});

export default MUC;
export type MUCType = InstanceType<typeof MUC>;
