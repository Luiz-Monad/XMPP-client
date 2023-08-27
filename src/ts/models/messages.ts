
import BaseCollection from './baseCollection';
import Message, { MessageType } from './message';


module.exports = BaseCollection.extend({
    type: 'messages',
    model: Message,
    comparator: 'created',
});
