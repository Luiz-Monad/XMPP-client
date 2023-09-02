
import _ from 'underscore';
import uuid from 'node-uuid';

import templates from 'templates';
import { JID } from './jid';
import HumanModel from '../helpers/human-model';
import htmlify from '../helpers/htmlify';
import { fire } from '../helpers/railway';

export class Delay {
    from?: string;
    stamp?: Date;
    reason?: string;
};

export class URI {
    url?: string;
    href?: string;
    desc?: string;
    source?: string;
}

const ID_CACHE: Record<string, Record<string, MessageType>> = {};

const Message = HumanModel.define({
    initialize: function (attrs: unknown) {
        this._created = new Date(Date.now() + app.timeInterval);
    },
    type: 'message',
    props: {
        mid: 'string',
        owner: 'string',
        to: JID,
        from: JID,
        body: 'string',
        type: ['string', false, 'normal'],
        acked: ['bool', false, false],
        requestReceipt: ['bool', false, false],
        receipt: ['bool', false, false],
        archivedId: 'string',
        oobURIs: ['array', false, [], URI],
    },
    derived: {
        mine: {
            deps: ['from', '_mucMine'],
            fn: function () {
                return this._mucMine || me.isMe(this.from);
            }
        },
        sender: {
            deps: ['from', 'mine'],
            fn: function () {
                if (this.mine) {
                    return me;
                } else {
                    return me.getContact(this.from);
                }
            }
        },
        delayed: {
            deps: ['delay'],
            fn: function () {
                return !!this.delay;
            }
        },
        created: {
            deps: ['delay', '_created', '_edited'],
            fn: function () {
                if (this.delay && this.delay.stamp) {
                    return this.delay.stamp;
                }
                return this._created;
            }
        },
        timestamp: {
            deps: ['created', '_edited'],
            fn: function () {
                if (this._edited && !isNaN(this._edited.valueOf())) {
                    return this._edited;
                }
                return this.created;
            }
        },
        formattedTime: {
            deps: ['created'],
            fn: function () {
                if (this.created) {
                    const month = this.created.getMonth() + 1;
                    const day = this.created.getDate();
                    const hour = this.created.getHours();
                    const minutes = this.created.getMinutes();

                    const m = (hour >= 12) ? 'p' : 'a';
                    const strDay = (day < 10) ? '0' + day : day;
                    const strHour = (hour < 10) ? '0' + hour : hour;
                    const strMin = (minutes < 10) ? '0' + minutes : minutes;

                    return '' + month + '/' + strDay + ' ' + strHour + ':' + strMin + m;
                }
                return undefined;
            }
        },
        pending: {
            deps: ['acked'],
            fn: function () {
                return !this.acked;
            }
        },
        nick: {
            deps: ['mine', 'type'],
            fn: function () {
                if (this.type === 'groupchat') {
                    return this.from?.resource;
                }
                if (this.mine) {
                    return 'me';
                }
                return me.getContact(this.from?.bare)?.displayName;
            }
        },
        processedBody: {
            deps: ['body', 'meAction', 'mentions'],
            fn: function () {
                let body = this.body ?? '';
                if (this.meAction) {
                    body = body.substr(4);
                }
                body = htmlify.toHTML(body);
                if (!this.mentions) return;
                for (let i = 0; i < this.mentions.length; i++) {
                    const existing = htmlify.toHTML(this.mentions[i]);
                    const parts = body.split(existing);
                    body = parts.join('<span class="mention">' + existing + '</span>');
                }
                return body;
            }
        },
        partialTemplateHtml: {
            deps: ['edited', 'pending', 'body', 'urls'],
            cache: false,
            fn: function () {
                return this.bareMessageTemplate(false);
            }
        },
        templateHtml: {
            deps: ['edited', 'pending', 'body', 'urls'],
            cache: false,
            fn: function () {
                const model = { message: this, messageDate: Date.create(this.timestamp!), firstEl: true };
                if (this.type === 'groupchat') {
                    return templates.includes.mucWrappedMessage(model);
                } else {
                    return templates.includes.wrappedMessage(model);
                }
            }
        },
        classList: {
            cache: false,
            fn: function () {
                const res = [];

                if (this.mine) res.push('mine');
                if (this.pending) res.push('pending');
                if (this.delayed) res.push('delayed');
                if (this.edited) res.push('edited');
                if (this.requestReceipt) res.push('pendingReceipt');
                if (this.receiptReceived) res.push('delivered');
                if (this.meAction) res.push('meAction');

                return res.join(' ');
            }
        },
        meAction: {
            deps: ['body'],
            fn: function () {
                return this.body?.indexOf('/me') === 0;
            }
        },
        urls: {
            deps: ['body', 'oobURIs'],
            fn: function () {
                const self = this;
                const result: URI[] = [];
                const urls = htmlify.collectLinks(this.body ?? '');
                const emptyURIs: (string | undefined)[] = [];
                const oobURIs = _.pluck(this.oobURIs || [], 'url');
                const uniqueURIs = _.unique(emptyURIs.concat(urls).concat(oobURIs));

                uniqueURIs.forEach((url) => {
                    const oidx = oobURIs.indexOf(url);
                    if (oidx >= 0) {
                        result.push({
                            href: url,
                            desc: self.oobURIs ? self.oobURIs[oidx].desc : '',
                            source: 'oob'
                        });
                    } else {
                        result.push({
                            href: url,
                            desc: url,
                            source: 'body'
                        });
                    }
                });

                return result;
            }
        },
    },
    session: {
        _created: 'date',
        _edited: 'date',
        _mucMine: 'bool',
        receiptReceived: ['bool', true, false],
        edited: ['bool', true, false],
        delay: Delay,
        mentions: ['array', false, [], 'string'],
    },
    correct: function (msg: { from?: string | JID; id?: unknown }) {
        const from = (typeof msg?.from === 'string')
            ? JID.parse(msg.from) : msg.from;
        if (this.from?.full !== from) return false;

        delete msg.id;

        this.set({ ...msg, from: from });
        this._edited = new Date(Date.now() + app.timeInterval);
        this.edited = true;

        this.save();

        return true;
    },
    bareMessageTemplate: function (firstEl: any) {
        const model = { message: this, messageDate: Date.create(this.timestamp!), firstEl: firstEl };
        if (this.type === 'groupchat') {
            return templates.includes.mucBareMessage(model);
        } else {
            return templates.includes.bareMessage(model);
        }
    },
    save: function () {
        if (this.mid && this.from) {
            const from = this.type === 'groupchat' ? this.from.full : this.from.bare;
            idStore(from, this.mid, this);
        }

        const self = this;
        fire(async () => {
            const data = {
                archivedId: self.archivedId || uuid.v4(),
                owner: self.owner,
                to: self.to,
                from: self.from,
                created: self.created,
                body: self.body,
                type: self.type,
                delay: self.delay,
                edited: self.edited
            };
            await app.storage.archive.add(data);
        });
    },
    shouldGroupWith: function (previous?: { from?: JID; created?: Date }) {
        let fullOrBare: (jid: JID) => string
        if (this.type === 'groupchat') {
            fullOrBare = jid => jid.full;
        } else {
            fullOrBare = jid => jid.bare;
        }
        return previous && previous.from && previous.created &&
            this.from && this.created &&
            fullOrBare(previous.from) === fullOrBare(this.from) &&
            Math.round((this.created.valueOf() - previous.created.valueOf()) / 1000) <= 300 &&
            previous.created.toLocaleDateString() === this.created.toLocaleDateString();
    }
});

export const idLookup = function (jid: string, mid?: string) {
    const cache = ID_CACHE[jid] || (ID_CACHE[jid] = {});
    return cache[mid!];
};

export const idStore = function (jid: string, mid: string, msg: MessageType) {
    const cache = ID_CACHE[jid] || (ID_CACHE[jid] = {});
    cache[mid] = msg;
};

export default Message;
export type MessageType = InstanceType<typeof Message>;
