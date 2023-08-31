
import BaseCollection from './baseCollection';
import Resource, { ResourceType } from './resource';

const Resources = BaseCollection.extend({
    type: 'resources',
    model: Resource,
    comparator: function (res1: ResourceType, res2: ResourceType) {
        const name1 = res1.mucDisplayName.toLowerCase(),
            name2 = res2.mucDisplayName.toLowerCase();
        return (name1 > name2) ? 1 :
            (name1 < name2) ? -1 : 0;
    },
    search: function (letters?: string, removeMe?: boolean, addAll?: boolean) {
        if ((letters === '' || letters === null) && !removeMe) return this;
        const collection = new Resources(this.models);
        if (addAll)
            collection.add({ id: this.parent?.jid?.bare + '/all' });

        const pattern = new RegExp('^' + letters + '.*$', 'i');
        const filtered = collection.filter(function (data) {
            const nick = data.get('mucDisplayName');
            if (!nick || nick === me.nick) return false;
            return pattern.test(nick);
        });
        return new Resources(filtered);
    },
});

export default Resources;
export type ResourcesType = InstanceType<typeof Resources>;
