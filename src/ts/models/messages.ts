
import BaseCollection from './baseCollection';
import Message, { MessageType } from './message';


export default class Messages extends BaseCollection<MessageType> {
    type = 'messages';
    model = Message;
    comparator = 'created';
};
