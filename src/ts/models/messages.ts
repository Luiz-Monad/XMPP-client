
import BaseCollection from './baseCollection';
import Message from './message';

const Messages = BaseCollection.extend({
    type: 'messages',
    model: Message,
    comparator: 'created',
});

export default Messages;
export type MessagesType = InstanceType<typeof Messages>;
