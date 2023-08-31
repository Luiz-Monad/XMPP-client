
import _ from 'underscore';
import HumanView from 'human-view';
import templates from 'templates';
import { CallType } from '../models/call';
import { ContactType } from '../models/contact';

export default HumanView.extend<CallType>().extend({
    template: templates.includes.call,
    classBindings: {
        state: '',
    },
    events: {
        'click .answer': 'handleAnswerClick',
        'click .ignore': 'handleIgnoreClick',
        'click .cancel': 'handleCancelClick',
        'click .end': 'handleEndClick',
        'click .mute': 'handleMuteClick',
    },
    props: {
        $buttons: '$',
    },
    render: function () {
        this.renderAndBind();
        // register bindings for sub model
        this.registerBindings(this.model.contact as ContactType, {
            textBindings: {
                displayName: '.callerName'
            },
            srcBindings: {
                avatar: '.callerAvatar'
            }
        });
        this.$buttons = this.$('button');
        this.listenToAndRun(this.model, 'change:state', this.handleCallStateChange);

        return this;
    },
    handleAnswerClick: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        const self = this;
        if (!self.model.contact) return false;
        self.model.state = 'active';
        app.navigate('/chat/' + encodeURIComponent(self.model.contact.jid));
        self.model.contact.onCall = true;
        self.model.accept();
        return false;
    },
    handleIgnoreClick: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        this.model.end('decline');
        return false;
    },
    handleCancelClick: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        this.model.end('cancel');
        return false;
    },
    handleEndClick: function (e: JQuery.ClickEvent) {
        e.preventDefault();
        this.model.end('success');
        return false;
    },
    handleMuteClick: function (e: JQuery.ClickEvent) {
        return false;
    },
    // we want to make sure we show the appropriate buttons
    // when in constious stages of the call
    handleCallStateChange: function (model: unknown, callState: string) {
        const state = (callState || this.model.state) as keyof typeof map;
        // hide all
        this.$buttons?.hide();

        const map = {
            incoming: '.ignore, .answer',
            outgoing: '.cancel',
            accepted: '.end, .mute',
            terminated: '',
            ringing: '.cancel',
            mute: '.end, .unmute',
            unmute: '.end, .mute',
            //hold: '',
            //resumed: '',
        };

        console.log('map[state]', map[state]);

        this.$(map[state]).show();
    },
});
