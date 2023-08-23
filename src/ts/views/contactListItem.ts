
import _ from 'underscore';
import HumanView from 'human-view';
import templates from 'templates';


export default HumanView.extend({
    template: templates.includes.contactListItem,
    classBindings: {
        show: '',
        subscription: '',
        chatState: '',
        activeContact: '',
        hasUnread: '',
        idle: '',
        persistent: ''
    },
    textBindings: {
        displayName: '.name',
        displayUnreadCount: '.unread'
    },
    srcBindings: {
        avatar: '.avatar'
    },
    events: {
        'click': 'handleClick',
        'click .remove': 'handleRemoveContact'
    },
    render: function () {
        this.renderAndBind({contact: this.model});
        return this;
    },
    handleClick: function (e: Event) {
        if (me.contacts.get(this.model.jid)) {
            app.navigate('chat/' + encodeURIComponent(this.model.jid));
        }
    },
    handleRemoveContact: function(e: Event) {
        var question = "Remove "
            + (this.model.name ?
                (this.model.name + " (" +  this.model.jid + ")")
                    : this.model.jid)
            + " from contact list?";
        if(!confirm(question)) return;
        me.removeContact(this.model.jid);
        if (app.history.fragment === 'chat/' + encodeURIComponent(this.model.jid)) {
            app.navigate('/');
        }
    }
});
