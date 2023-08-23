
import BaseCollection from './baseCollection';
import Call, { CallType } from './call';


export default class Calls extends BaseCollection<CallType> {
    type = 'calls';
    model = Call;
};
