
import _ from 'underscore';

import HumanModel from '../helpers/human-model';

// break definition recursion
class Contact {
    jid: string = '';
    onCall: boolean = false;
}

const Call = HumanModel.define({
    type: 'call',
    initialize: function (attrs: unknown) {
        if (!this.contact) return;
        this.contact.onCall = true;
        // temporary, this won't stay here
        app.navigate('/chat/' + encodeURIComponent(this.contact.jid));
    },
    session: {
        contact: Contact,
        sid: 'string',
        state: ['string', true, 'inactive'],
        multiUser: ['boolean', true, false]
    },
    accept: function () {
        if (this.sid) {
            client.acceptCall(this.sid);
        }
    },
    end: function (reasonForEnding?: 'decline' | 'cancel' | 'success') {
        const reason = reasonForEnding || 'success';
        if (this.contact) {
            this.contact.onCall = false;
        }
        if (this.sid) {
            client.endCall(this.sid, reason);
        }
        this.collection.remove(this);
    },
});

export default Call;
export type CallType = InstanceType<typeof Call>;
