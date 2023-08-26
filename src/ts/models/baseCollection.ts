
// our base collection
import Backbone, { Model as BModel, ObjectHash } from 'backbone';


export default class BaseCollection<Props extends ObjectHash = any, Model extends BModel<Props> = BModel<Props>> extends Backbone.Collection<Model> {
    // ###next
    // returns next item when given an item in the collection
    next(item: Model, filter?: (_: Model) => boolean, start?: Model): Model {
        var i = this.indexOf(item),
            newItem;

        if (i === -1) {
            i = 0;
        } else if (i + 1 >= this.length) {
            i = 0;
        } else {
            i = i + 1;
        }
        newItem = this.at(i);
        if (filter && newItem !== start) {
            if (!filter(newItem)) {
                return this.next(newItem, filter, start || item);
            }
        }
        return newItem;
    };

    // ###prev
    // returns previous item when given an item in the collection
    prev(item: Model, filter?: (_: Model) => boolean, start?: Model): Model {
        var i = this.indexOf(item),
            newItem;
        if (i === -1) {
            i = 0;
        } else if (i === 0) {
            i = this.length - 1;
        } else {
            i = i - 1;
        }
        newItem = this.at(i);
        if (filter && newItem !== start) {
            if (!filter(newItem)) {
                return this.prev(newItem, filter, start || item);
            }
        }
        return this.at(i);
    };
};
