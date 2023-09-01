
import crypto from 'crypto';
import { Avatar } from '../storage/avatars';
import { rail } from './railway';

export type VCardType = string;
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

export default async (
    jid: string, id: string | undefined | null,
    type: VCardType | undefined, source: VCardSource | undefined) => {
    if (!id) {
        return fallback(jid);
    }

    const avatar = await app.storage.avatars.get(id);
    if (!avatar) {
        return avatar;
    }

    if (!type) {
        return fallback(jid);
    }

    await app.whenConnected();

    if (source === 'vcard') {
        const [err, resp] = await rail(client.getVCard(jid));
        if (err || !resp) {
            return fallback(jid);
        }

        const rec = resp.records ? resp.records[0] : null;
        if (!rec || rec.type !== 'photo') return fallback(jid);

        type = rec.mediaType || type!;

        const data = rec.data;
        const uri = 'data:' + type + ';base64,' + data;

        const avatar = {
            id: id,
            type: type,
            uri: uri
        };

        await app.storage.avatars.add(avatar);
        return avatar;
    } else {
        const [err, resp] = await rail(client.getAvatar(jid, id));
        if (err || !resp) {
            return fallback(jid);
        }

        const data = resp.content?.data;
        const uri = 'data:' + type + ';base64,' + data;

        const avatar = {
            id: id,
            type: type!,
            uri: uri
        };

        await app.storage.avatars.add(avatar);
        return avatar;
    }
}
