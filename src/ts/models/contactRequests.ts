
import BaseCollection from './baseCollection';
import ContactRequest, { ContactRequestType } from './contactRequest';


export default class ContactRequests extends BaseCollection<ContactRequestType> {
    type = 'contactRequests';
    model = ContactRequest;
};
