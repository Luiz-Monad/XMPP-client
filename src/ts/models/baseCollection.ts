
// our base collection
import Backbone from 'backbone';
import { JID } from './jid';

type ValidDefinitionBase = {
    type?: string;
    model?: new (...args: any[]) => any;
    comparator?: string | ((from: any, to: any) => number)
}

type ValidDefinition<T extends ValidDefinitionBase> =
    ValidDefinitionBase & {
        [K in (Exclude<keyof T, keyof ValidDefinitionBase>)]: T[K];
    }

type ValidModel<T> =
    new (...args: any[]) => T;

type ModelType<T extends ValidDefinitionBase> =
    T['model'] extends ValidModel<Backbone.Model> ? InstanceType<T['model']> :
    Backbone.Model;

export interface BackboneCollectionConstructor<
    BaseProps = {},
    BaseStaticProps = {},
    Model extends Backbone.Model<any> = Backbone.Model<any>,
> {

    new(models?: Model[] | Array<Record<string, any>>, options?: any):
        Backbone.Collection<Model> & BaseProps & BaseStaticProps;

    extend<
        Props extends ValidDefinition<Props> = {},
        StaticProps = {},
        NewCollection = Backbone.Collection<ModelType<Props>>,
    >
        (
            protoProps:
                Props & ThisType<NewCollection &
                    BaseProps & Props & BaseStaticProps & StaticProps>,
            staticProps?:
                StaticProps & ThisType<NewCollection &
                    BaseProps & Props & BaseStaticProps & StaticProps>
        ):
        BackboneCollectionConstructor<
            BaseProps & Props,
            BaseStaticProps & StaticProps,
            ModelType<Props>>;
}

const BackboneCollection: BackboneCollectionConstructor = Backbone.Collection;

const BaseCollection = BackboneCollection.extend({

    // from human-model.
    parent: null as ({
        jid?: JID | null
    } | null),

    // ###next
    // returns next item when given an item in the collection
    next: function <T extends Backbone.ObjectHash = any>
        (item: Backbone.Model<T>, filter: (arg0: Backbone.Model<T>) => any, start: Backbone.Model<T>): Backbone.Model<T> {
        let i = this.indexOf(item);
        let newItem;

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
    },

    // ###prev
    // returns previous item when given an item in the collection
    prev: function <T extends Backbone.ObjectHash = any>
        (item: Backbone.Model<T>, filter: (arg0: Backbone.Model<T>) => any, start: Backbone.Model<T>): Backbone.Model<T> {
        let i = this.indexOf(item);
        let newItem;
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
    },
});

export default BaseCollection;
export type BaseCollectionType = InstanceType<typeof BaseCollection>;
