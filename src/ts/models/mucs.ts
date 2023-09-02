
import { MUCBookmark } from 'stanza/protocol';

import BaseCollection from './baseCollection';
import MUC, { MUCType } from './muc';
import { fire } from '../helpers/railway';

const MUCs = BaseCollection.extend({
    type: 'mucs',
    model: MUC,
    comparator: function (model1: MUCType, model2: MUCType) {
        const name1 = model1.displayName.toLowerCase();
        const name2 = model2.displayName.toLowerCase();
        if (name1 === name2) {
            return 0;
        }
        if (name1 < name2) {
            return -1;
        }
        return 1;
    },
    initialize: function (model: unknown, options: unknown) {
        this.bind('change', this.sort, this);
    },
    fetch: function () {
        const self = this;
        fire(async () => {
            await app.whenConnected();
            const res = await client.getBookmarks();

            const mucs = res || [];
            mucs.forEach((muc) => {
                self.add(muc);
                if (muc.autoJoin) {
                    self.get(muc.jid).join();
                }
            });

            self.trigger('loaded');
        });
    },
    save: function () {
        const self = this;
        fire(async () => {
            await app.whenConnected();
            const models: MUCBookmark[] = [];
            self.models.forEach((model) => {
                models.push({
                    name: model.name,
                    jid: model.jid ?? '',
                    nick: model.nick,
                    autoJoin: model.autoJoin
                });
            });
            await client.setBookmarks(models);
        });
    },
});

export default MUCs;
export type MUCsType = InstanceType<typeof MUCs>;
