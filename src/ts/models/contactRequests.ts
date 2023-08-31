
import BaseCollection from './baseCollection';
import ContactRequest from './contactRequest';

const ContactRequests = BaseCollection.extend({
    type: 'contactRequests',
    model: ContactRequest
});

export default ContactRequests;
export type ContactRequestsType = InstanceType<typeof ContactRequests>;
