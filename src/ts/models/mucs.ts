
import BaseCollection from './baseCollection';
import MUC, { MUCType } from './muc';
import unpromisify from '../helpers/unpromisify';
import { MUCBookmark } from 'stanza/protocol';

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
        app.whenConnected(function () {
            unpromisify(client.getBookmarks)(function (err, res) {
                if (err) return;

                const mucs = res || [];
                mucs.forEach(function (muc) {
                    self.add(muc);
                    if (muc.autoJoin) {
                        self.get(muc.jid).join();
                    }
                });

                self.trigger('loaded');
            });
        });
    },
    save: function (cb?: () => void) {
        cb = cb || function () { };
        const self = this;
        app.whenConnected(function () {
            const models: MUCBookmark[] = [];
            self.models.forEach(function (model) {
                models.push({
                    name: model.name,
                    jid: model.jid ?? '',
                    nick: model.nick,
                    autoJoin: model.autoJoin
                });
            });
            unpromisify(client.setBookmarks)(models, cb!);
        });
    },
});

export default MUCs;
export type MUCsType = InstanceType<typeof MUCs>;
