
import crypto from 'crypto';
import unpromisify from './unpromisify';
import { VCardTempRecord } from 'stanza/protocol';
import { Avatar } from '../storage/avatars';


export type VCardType = VCardTempRecord['type'];
export type VCardSource = 'vcard' | 'pubsub';

function fallback(jid: string): Partial<Avatar> {
    if (!SERVER_CONFIG.gravatar) {
        return {
            // TODO something nicer than a gray pixel?
            uri: 'data:image/gif;base64,R0lGODdhAQABAIABAJmZmf///ywAAAAAAQABAAACAkQBADs='
        };
    }

    const gID = crypto.createHash('md5').update(jid).digest('hex');
    return {
        uri: 'https://gravatar.com/avatar/' + gID + '?s=80&d=mm'
    };
};

export default function (
    jid: string, id: string | undefined | null,
    type: VCardType | undefined, source: VCardSource | undefined,
    cb: (res?: Partial<Avatar>) => void) {
    if (!id) {
        return cb(fallback(jid));
    }

    app.storage.avatars.get(id, function (err, avatar) {
        if (!err) {
            return cb(avatar);
        }

        if (!type) {
            return cb(fallback(jid));
        }

        app.whenConnected(function () {
            if (source === 'vcard') {
                unpromisify(client.getVCard)(jid, function (err, resp) {
                    if (err) {
                        return cb(fallback(jid));
                    }

                    const rec = resp.records ? resp.records[0] : null;
                    if (!rec || rec.type !== 'photo') return cb(fallback(jid));

                    type = rec.type || type || 'photo';

                    const data = rec.data;
                    const uri = 'data:' + type + ';base64,' + data;

                    avatar = {
                        id: id,
                        type: type,
                        uri: uri
                    };

                    app.storage.avatars.add(avatar);
                    return cb(avatar);
                });
            } else {
                unpromisify(client.getAvatar)(jid, id, function (err, resp) {
                    if (err) {
                        return;
                    }

                    const data = resp.content?.data;
                    const uri = 'data:' + type + ';base64,' + data;

                    avatar = {
                        id: id,
                        type: type ?? 'pubsub',
                        uri: uri
                    };

                    app.storage.avatars.add(avatar);
                    return cb(avatar);
                });
            }
        });
    });
};
