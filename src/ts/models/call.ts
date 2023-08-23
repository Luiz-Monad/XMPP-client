/*global app, me, client*/

import _ from 'underscore';
import HumanModel from 'human-model';
import logger from 'andlog';


const Call = HumanModel.define({
    type: 'call',
    initialize: function (attrs: unknown) {
        this.contact.onCall = true;
        // temporary, this won't stay here
        app.navigate('/chat/' + encodeURIComponent(this.contact.jid));
    },
    session: {
        contact: 'object',
        jingleSession: 'object',
        state: ['string', true, 'inactive'],
        multiUser: ['boolean', true, false]
    },
    end: function (reasonForEnding?: string) {
        var reason = reasonForEnding || 'success';
        this.contact.onCall = false;
        if (this.jingleSession) {
            this.jingleSession.end(reasonForEnding);
        }
        this.collection.remove(this);
    }
});

export default Call;
export type CallType = typeof Call;
