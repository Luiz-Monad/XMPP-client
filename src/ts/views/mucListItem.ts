
import _ from 'underscore';

import templates from 'templates';
import { MUCType } from '../models/muc';
import HumanView from '../helpers/human-view';

export default HumanView.extend<MUCType>().extend({
    template: templates.includes.mucListItem,
    classBindings: {
        activeContact: '',
        hasUnread: '',
        joined: '',
        persistent: '',
    },
    textBindings: {
        displayName: '.name',
        displayUnreadCount: '.unread',
    },
    events: {
        'click': 'handleClick',
        'click .join': 'handleJoinRoom',
        'click .remove': 'handleLeaveRoom',
    },
    render: function () {
        this.renderAndBind({contact: this.model});
        return this;
    },
    handleClick: function (e: JQuery.ClickEvent) {
        app.navigate('groupchat/' + encodeURIComponent(this.model.jid ?? ''));
    },
    handleJoinRoom: function (e: JQuery.ClickEvent) {
        this.model.join();
    },
    handleLeaveRoom: function (e: JQuery.ClickEvent) {
        const  muc = this.model;
	    muc.leave();
    },
});
