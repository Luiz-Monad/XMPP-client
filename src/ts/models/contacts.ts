
import async from 'async';
import BaseCollection from './baseCollection';
import Contact, { ContactType } from './contact';


export default class Contacts extends BaseCollection<ContactType> {
    type = 'contacts';
    model = Contact;
    comparator = (model1: ContactType, model2: ContactType) => {
        var show1 = model1.show;
        var show2 = model2.show;

        var name1 = model1.displayName.toLowerCase();
        var name2 = model2.displayName.toLowerCase();

        if (show1 === show2) {

            if (name1 === name2) {
                return 0;
            }
            if (name1 < name2) {
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
            if (name1 < name2) {
                return -1;
            }

            return 1;
        }
    };
    initialize(model: ContactType[], options: unknown) {
        this.bind('change', this.sort, this);
    };
};
