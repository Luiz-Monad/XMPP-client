
import BaseCollection from './baseCollection';
import ContactRequest, { ContactRequestType } from './contactRequest';


module.exports = BaseCollection.extend({
    type: 'contactRequests',
    model: ContactRequest
});
