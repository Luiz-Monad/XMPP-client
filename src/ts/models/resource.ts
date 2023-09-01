
import HumanModel from 'human-model';
import fetchAvatar, { VCardSource, VCardType } from '../helpers/fetchAvatar';
import { fire } from '../helpers/railway';

class DiscoInfo {
    features: string[] = [];
}

const Resource = HumanModel.define({
    initialize: function () { },
    type: 'resource',
    session: {
        id: ['string', true],
        status: 'string',
        show: 'string',
        priority: ['number', false, 0],
        chatState: ['string', false, 'gone'],
        idleSince: 'date',
        discoInfo: DiscoInfo,
        timezoneOffset: 'number',
        avatar: 'string',
        avatarSource: 'string',
        avatarID: ['string', false, ''],
    },
    derived: {
        mucDisplayName: {
            deps: ['id'],
            fn: function () {
                return this.id.split('/')[1] || '';
            }
        },
        idle: {
            deps: ['idleSince'],
            fn: function () {
                return this.idleSince && !isNaN(this.idleSince.valueOf());
            }
        },
        supportsReceipts: {
            deps: ['discoInfo'],
            fn: function () {
                if (!this.discoInfo) return false;
                const features = this.discoInfo.features || [];
                return features.indexOf('urn:xmpp:receipts') >= 0;
            }
        },
        supportsChatStates: {
            deps: ['discoInfo'],
            fn: function () {
                if (!this.discoInfo) return false;
                const features = this.discoInfo.features || [];
                return features.indexOf('http://jabber.org/protocol/chatstate') >= 0;
            }
        },
        supportsJingleMedia: {
            deps: ['discoInfo'],
            fn: function () {
                if (!this.discoInfo) return false;
                const features = this.discoInfo.features || [];
                if (features.indexOf('urn:xmpp:jingle:1') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:apps:rtp:1') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:apps:rtp:audio') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:apps:rtp:video') === -1) {
                    return false;
                }

                return true;
            }
        },
        supportsJingleFiletransfer: {
            deps: ['discoInfo'],
            fn: function () {
                if (!this.discoInfo) return false;
                const features = this.discoInfo.features || [];
                if (features.indexOf('urn:xmpp:jingle:1') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:apps:file-transfer:3') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:transports:ice-udp:1') === -1) {
                    return false;
                }

                if (features.indexOf('urn:xmpp:jingle:transports:dtls-sctp:1') === -1) {
                    return false;
                }

                return true;
            }
        }
    },
    fetchTimezone: function () {
        if (this.timezoneOffset) return;

        const self = this;
        fire(async () => {
            await app.whenConnected();
            const res = await client.getTime(self.id);
            self.timezoneOffset = res.tzo;
        });
    },
    fetchDisco: function () {
        if (this.discoInfo) return;

        const self = this;
        fire(async () => {
            await app.whenConnected();
            const res = await client.getDiscoInfo(self.id);
            self.discoInfo = res;
        });
    },
    setAvatar: function (id?: string, type?: VCardType, source?: VCardSource) {
        const self = this;
        fire(async () => {
            const avatar = await fetchAvatar(self.id, id, type, source);
            if (source === 'vcard' && self.avatarSource === 'pubsub') return;
            self.avatarID = avatar?.id;
            self.avatar = avatar?.uri;
            self.avatarSource = source;
        });
    },
});

export default Resource;
export type ResourceType = InstanceType<typeof Resource>;
