
import BaseCollection from './baseCollection';
import Call, { CallType } from './call';


module.exports = BaseCollection.extend({
    type: 'calls',
    model: Call
});
