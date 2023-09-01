
import _ from 'underscore';
import crypto from 'crypto';
import HumanModel from 'human-model';
import Call from './call';
import Resources from './resources';
import Messages from './messages';
import Message, { MessageType, idLookup } from './message';
import fetchAvatar, { VCardSource, VCardType } from '../helpers/fetchAvatar';
import { fire } from '../helpers/railway';

const Contact = HumanModel.define({
    initialize: function (attrs: { jid?: string; avatarID: string }) {
        if (attrs.jid) {
            this.id = attrs.jid;
        }
        this.setAvatar(attrs.avatarID);

        this.resources.bind('add remove reset', this.onResourceListChange, this);
        this.resources.bind('change', this.onResourceChange, this);

        this.bind('change:topResource change:lockedResource change:_forceUpdate', this.summarizeResources, this);

        this.fetchHistory(true);

        const self = this;
        client.on('session:started', function () {
            if (self.messages.length)
                self.fetchHistory(true, true);
        });
    },
    type: 'contact',
    props: {
        id: ['string', true, false],
        avatarID: ['string', false, ''],
        groups: ['array', false, [], 'string'],
        inRoster: ['bool', true, false],
        jid: ['string', true],
        name: ['string', false, ''],
        owner: ['string', true, ''],
        storageId: ['string', true, ''],
        subscription: ['string', false, 'none'],
        joined: 'boolean',
    },
    session: {
        activeContact: ['bool', false, false],
        avatar: 'string',
        avatarSource: 'string',
        lastInteraction: 'date',
        lastHistoryFetch: 'date',
        lastSentMessage: Message,
        lockedResource: 'string',
        offlineStatus: ['string', false, ''],
        topResource: 'string',
        unreadCount: ['number', false, 0],
        _forceUpdate: ['number', false, 0],
        onCall: ['boolean', false, false],
        persistent: ['bool', false, false],
        stream: MediaStream,
        callState: 'string',
        jingleCall: Call,
    },
    derived: {
        streamUrl: {
            deps: ['stream'],
            cache: true,
            fn: function () {
                if (!this.stream) return '';
                return URL.createObjectURL(this.stream as any);
            }
        },
        displayName: {
            deps: ['name', 'jid'],
            fn: function () {
                return this.name || this.jid;
            }
        },
        displayUnreadCount: {
            deps: ['unreadCount'],
            fn: function () {
                if (this.unreadCount && this.unreadCount > 0) {
                    return this.unreadCount.toString();
                }
                return '';
            }
        },
        formattedTZO: {
            deps: ['timezoneOffset'],
            fn: function () {
                if (!this.timezoneOffset) return '';

                const localTime = new Date();
                const localTZO = localTime.getTimezoneOffset();
                const diff = Math.abs(localTZO % (24 * 60) - this.timezoneOffset % (24 * 60));
                const remoteTime = new Date(Date.now() + diff * 60000);


                const day = remoteTime.getDate();
                let hour = remoteTime.getHours();
                const minutes = remoteTime.getMinutes();

                const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

                const dow = days[remoteTime.getDay()];
                const localDow = days[localTime.getDay()];

                const m = (hour >= 12) ? ' PM' : ' AM';

                hour = hour % 12;
                if (hour === 0) {
                    hour = 12;
                }

                const strDay = (day < 10) ? '0' + day : day;
                const strHour = (hour < 10) ? '0' + hour : hour;
                const strMin = (minutes < 10) ? '0' + minutes : minutes;

                if (localDow === dow) {
                    return strHour + ':' + strMin + m;
                } else {
                    return dow + ' ' + strHour + ':' + strMin + m;
                }
            }
        },
        status: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                const resource = this.resources.get(this.lockedResource!) || this.resources.get(this.topResource!) || {};
                return resource.status || '';
            }
        },
        show: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                if (this.resources.length === 0) {
                    return 'offline';
                }
                const resource = this.resources.get(this.lockedResource!) || this.resources.get(this.topResource!) || {};
                return resource.show || 'online';
            }
        },
        timezoneOffset: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                const resource = this.resources.get(this.lockedResource!) || this.resources.get(this.topResource!) || {};
                return resource.timezoneOffset || undefined;
            }
        },
        idleSince: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                const resource = this.resources.get(this.lockedResource!) || this.resources.get(this.topResource!) || {};
                return resource.idleSince || undefined;
            }
        },
        idle: {
            deps: ['idleSince'],
            fn: function () {
                return this.idleSince && !isNaN(this.idleSince.valueOf());
            }
        },
        chatState: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                const states: Record<string, boolean> = {};
                this.resources.models.forEach((resource) => {
                    states[resource.chatState!] = true;
                });

                if (states.composing) return 'composing';
                if (states.paused) return 'paused';
                if (states.active) return 'active';
                if (states.inactive) return 'inactive';
                return 'gone';
            }
        },
        chatStateText: {
            deps: ['topResource', 'lockedResource', '_forceUpdate'],
            fn: function () {
                const chatState = this.chatState;
                if (chatState === 'composing')
                    return this.displayName + ' is composing';
                else if (chatState === 'paused')
                    return this.displayName + ' stopped writing';
                else if (chatState === 'gone')
                    return this.displayName + ' is gone';
                return '';
            }
        },
        supportsReceipts: {
            deps: ['lockedResource', '_forceUpdate'],
            fn: function () {
                if (!this.lockedResource) return false;
                const res = this.resources.get(this.lockedResource);
                return res.supportsReceipts;
            }
        },
        supportsChatStates: {
            deps: ['lockedResource', '_forceUpdate'],
            fn: function () {
                if (!this.lockedResource) return false;
                const res = this.resources.get(this.lockedResource);
                return res && res.supportsChatStates;
            }
        },
        hasUnread: {
            deps: ['unreadCount'],
            fn: function () {
                return this.unreadCount && this.unreadCount > 0;
            }
        },
        jingleResources: {
            deps: ['_forceUpdate'],
            fn: function () {
                return this.resources.filter(function (res) {
                    return res.supportsJingleMedia;
                });
            }
        },
        callable: {
            deps: ['jingleResources'],
            fn: function () {
                return !!this.jingleResources.length;
            }
        },
        callObject: {
            fn: function () {
                return me.calls.where({ contact: this });
            }
        },
    },
    collections: {
        resources: Resources,
        messages: Messages,
    },
    getName: function (jid?: string) {
        return this.displayName;
    },
    getNickname: function (jid?: string) {
        return this.displayName;
    },
    getAvatar: function (jid?: string) {
        return this.avatar;
    },
    call: function () {
        if (this.jingleResources.length) {
            const peer = this.jingleResources[0];
            this.callState = 'starting';
            client.call(peer.id);
        } else {
            console.error('no jingle resources for this user');
        }
    },
    setAvatar: function (id: string, type?: VCardType, source?: VCardSource) {
        const self = this;
        fire(async () => {
            const avatar = await fetchAvatar(self.jid, id, type, source);
            if (source === 'vcard' && self.avatarSource === 'pubsub') return;
            self.avatarID = avatar?.id;
            self.avatar = avatar?.uri;
            self.avatarSource = source;
            self.save();
        });
    },
    onResourceChange: function () {
        this.resources.sort();
        this.topResource = (this.resources.first() || {}).id;
        this._forceUpdate!++;
    },
    onResourceListChange: function () {
        // Manually propagate change events for properties that
        // depend on the resources collection.
        this.resources.sort();

        const res = this.resources.first();
        if (res) {
            this.offlineStatus = '';
            this.topResource = res.id;
        } else {
            this.topResource = undefined;
        }

        this.lockedResource = undefined;
    },
    addMessage: function (message: MessageType, notify: boolean) {
        message.owner = me.jid.bare;

        if (notify && (!this.activeContact || (this.activeContact && !app.state.focused)) && message.from?.bare === this.jid) {
            this.unreadCount!++;
            app.notifications.create(this.displayName, {
                body: message.body,
                icon: this.avatar,
                tag: this.jid,
                onclick: _.bind(app.navigate, app, '/chat/' + encodeURIComponent(this.jid))
            });
            if (me.soundEnabled)
                app.soundManager.play('ding');
        }

        const existing = message.from && idLookup(message.from[message.type === 'groupchat' ? 'full' : 'bare'], message.mid);
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
    fetchHistory: function (onlyLastMessages?: boolean, allInterval?: boolean) {
        const self = this;
        fire(async () => {
            await app.whenConnected();

            const filter: {
                with: string,
                rsm: {
                    max: number,
                    after?: string,
                    before?: boolean | string,
                },
                start?: Date,
                end?: Date,
            } = {
                with: self.jid,
                rsm: {
                    max: !!onlyLastMessages && !allInterval ? 50 : 40,
                },
            };

            if (!!onlyLastMessages) {
                const lastMessage = self.messages.last();
                if (lastMessage && lastMessage.archivedId) {
                    filter.rsm.after = lastMessage.archivedId;
                }
                if (!allInterval) {
                    filter.rsm.before = true;

                    if (self.lastHistoryFetch && !isNaN(self.lastHistoryFetch.valueOf())) {
                        if (self.lastInteraction && self.lastInteraction > self.lastHistoryFetch) {
                            filter.start = self.lastInteraction;
                        } else {
                            filter.start = self.lastHistoryFetch;
                        }
                    } else {
                        filter.end = new Date(Date.now() + app.timeInterval);
                    }
                }
            } else {
                const firstMessage = self.messages.first();
                if (firstMessage && firstMessage.archivedId) {
                    filter.rsm.before = firstMessage.archivedId;
                }
            }

            const res = await client.searchHistory(filter);
            const results = res.results || [];

            self.lastHistoryFetch = new Date(Date.now() + app.timeInterval);

            if (!!onlyLastMessages && !allInterval) results.reverse();
            results.forEach((result) => {
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
                if (results.length === 40) {
                    self.fetchHistory(true, true);
                } else {
                    self.trigger('refresh');
                }
            }
        });
    },
    save: function () {
        if (!this.inRoster) return;

        const self = this;
        fire(async () => {
            const storageId = crypto.createHash('sha1').update(self.owner + '/' + self.id).digest('hex');
            const data = {
                storageId: storageId,
                owner: self.owner,
                jid: self.jid,
                name: self.name,
                groups: self.groups,
                subscription: self.subscription,
                avatarID: self.avatarID
            };
            await app.storage.roster.add(data);
        });
    },
    summarizeResources: function () {
    },
});

export default Contact;
export type ContactType = InstanceType<typeof Contact>;
