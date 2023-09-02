
import _ from 'underscore';

import templates from 'templates';
import { ContactType } from '../models/contact';
import HumanView from '../helpers/human-view';

export default HumanView.extend<ContactType>().extend({
    template: templates.includes.contactRequest,
    initialize: function (opts: unknown) {
        this.render();
    },
    events: {
        'click .approve': 'handleApprove',
        'click .deny': 'handleDeny',
    },
    textBindings: {
        jid: '.jid',
    },
    render: function () {
        this.renderAndBind({ message: this.model });
        return this;
    },
    handleApprove: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        client.sendPresence({
            to: this.model.jid,
            type: 'subscribed'
        });
        client.sendPresence({
            to: this.model.jid,
            type: 'subscribe'
        });
        me.contactRequests.remove(this.model);
        return false;
    },
    handleDeny: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        client.sendPresence({
            to: this.model.jid,
            type: 'unsubscribed'
        });
        me.contactRequests.remove(this.model);
        return false;
    },
});
