
import _ from 'underscore';
import HumanView from 'human-view';
import templates from 'templates';


export default HumanView.extend({
    template: templates.includes.mucListItem,
    classBindings: {
        activeContact: '',
        hasUnread: '',
        joined: '',
        persistent: ''
    },
    textBindings: {
        displayName: '.name',
        displayUnreadCount: '.unread'
    },
    events: {
        'click': 'handleClick',
        'click .join': 'handleJoinRoom',
        'click .remove': 'handleLeaveRoom'
    },
    render: function () {
        this.renderAndBind({contact: this.model});
        return this;
    },
    handleClick: function (e: Event) {
        app.navigate('groupchat/' + encodeURIComponent(this.model.jid));
    },
    handleJoinRoom: function (e: Event) {
        this.model.join();
    },
    handleLeaveRoom: function (e: Event) {
        var  muc = this.model;
	    muc.leave();
    }
});
