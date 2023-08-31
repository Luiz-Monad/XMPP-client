
import BaseCollection from './baseCollection';
import Call from './call';

const Calls = BaseCollection.extend({
    type: 'calls',
    model: Call
});

export default Calls;
export type CallsType = InstanceType<typeof Calls>;
