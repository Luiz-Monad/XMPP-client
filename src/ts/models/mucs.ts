
import async from 'async';
import BaseCollection from './baseCollection';
import MUC, { MUCType } from './muc';


export default class MUCs extends BaseCollection<MUCType> {
    type = 'mucs';
    model = MUC;
    comparator = (model1: MUCType, model2: MUCType) => {
        var name1 = model1.displayName.toLowerCase();
        var name2 = model2.displayName.toLowerCase();
        if (name1 === name2) {
            return 0;
        }
        if (name1 < name2) {
            return -1;
        }
        return 1;
    };
    initialize(model, options) {
        this.bind('change', this.sort, this);
    };
    fetch() {
        var self = this;
        app.whenConnected(function () {
            client.getBookmarks(function (err, res) {
                if (err) return;

                var mucs = res.privateStorage.bookmarks.conferences || [];
                mucs.forEach(function (muc) {
                    self.add(muc);
                    if (muc.autoJoin) {
                        self.get(muc.jid).join();
                    }
                });

                self.trigger('loaded');
            });
        });
    };
    save(cb) {
        var self = this;
        app.whenConnected(function () {
            var models = [];
            self.models.forEach(function (model) {
                models.push({
                    name: model.name,
                    jid: model.jid,
                    nick: model.nick,
                    autoJoin: model.autoJoin
                });
            });
            client.setBookmarks({ conferences: models }, cb);
        });
    };
};
