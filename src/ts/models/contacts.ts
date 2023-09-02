
import BaseCollection from './baseCollection';
import Contact, { ContactType } from './contact';

const Contacts = BaseCollection.extend({
    type: 'contacts',
    model: Contact,
    comparator: function (model1: ContactType, model2: ContactType) {
        const show1 = model1.show;
        const show2 = model2.show;

        const name1 = model1.displayName?.toLowerCase();
        const name2 = model2.displayName?.toLowerCase();

        if (show1 === show2) {

            if (name1 === name2) {
                return 0;
            }
            if (name1 && name2 && name1 < name2) {
                return -1;
            }
            return 1;
        } else {
            if (show1 === 'offline') {
                return 1;
            }
            if (show2 === 'offline') {
                return -1;
            }

            if (name1 === name2) {
                return 0;
            }
            if (name1 && name2 && name1 < name2) {
                return -1;
            }

            return 1;
        }
    },
    initialize: function (model: unknown, options: unknown) {
        this.bind('change', this.sort, this);
    },
});

export default Contacts;
export type ContactsType = InstanceType<typeof Contacts>;
