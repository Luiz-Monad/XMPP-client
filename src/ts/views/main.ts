
import templates from 'templates';
import ContactListItem from '../views/contactListItem';
import MUCListItem from '../views/mucListItem';
import ContactRequestItem from '../views/contactRequest';
import { StateType } from '../models/state';
import HumanView from '../helpers/human-view';

export default HumanView.extend<StateType>().extend({
    template: templates.body,
    initialize: function () {
        this.listenTo(app.state, 'change:title', this.handleTitle);
        app.state.on('change:deviceID', function () {
            console.log('DEVICE ID>>>', app.state.deviceID);
        });

        app.state.bind('change:connected', this.connectionChange, this);
    },
    events: {
        'click a[href]': 'handleLinkClick',
        'click .embed': 'handleEmbedClick',
        'click .reconnect': 'handleReconnect',
        'click .logout': 'handleLogout',
        'keydown #addcontact': 'keyDownAddContact',
        'keydown #joinmuc': 'keyDownJoinMUC',
        'blur #me .status': 'handleStatusChange',
        'keydown .status': 'keyDownStatus',
    },
    classBindings: {
        connected: '#topbar',
        hasActiveCall: '#wrapper',
        currentPageIsSettings: '.settings',
    },
    props: {
        $joinmuc: '$',
        $addcontact: '$',
        $meStatus: '$',
    },
    render: function () {
        $('head').append(templates.head());
        $('body').removeClass('aux');
        this.renderAndBind();
        this.renderCollection(me.contacts, ContactListItem, this.$('#roster nav'));
        this.renderCollection(me.mucs, MUCListItem, this.$('#bookmarks nav'));
        this.renderCollection(me.contactRequests, ContactRequestItem, this.$('#contactrequests'));

        this.$joinmuc = this.$('#joinmuc');
        this.$addcontact = this.$('#addcontact');
        this.$meStatus = this.$('#footer .status');

        this.registerBindings(me, {
            textBindings: {
                displayName: '#me .name',
                status: '#me .status',
                organization: '#organization #orga_name',
            },
            srcBindings: {
                avatar: '#me .avatar'
            }
        });
        return this;
    },
    handleReconnect: function (e: JQuery.ClickEvent) {
        client.connect();
    },
    handleLinkClick: function (e: JQuery.ClickEvent) {
        const t = $(e.target!);
        const aEl = t.is('a') ? t[0] : t.closest('a')[0];
        const local = window.location.host === aEl.host;
        const path = aEl.pathname.slice(1);

        if (local) {
            e.preventDefault();
            app.navigate(path);
            return false;
        }
    },
    handleEmbedClick: function (e: JQuery.ClickEvent) {
        if (e.shiftKey) {
            e.preventDefault();
            $(e.currentTarget!).toggleClass('collapsed');
        }
    },
    handleTitle: function (e: JQuery.Event) {
        document.title = app.state.title;
    },
    handleStatusChange: function (e: JQuery.ChangeEvent) {
        const text = e.target.textContent;
        me.status = text;
        client.sendPresence({
            status: text,
            legacyCapabilities: Object.values(client.disco.caps),
        });
    },
    keyDownStatus: function (e: JQuery.KeyDownEvent) {
        if (e.which === 13 && !e.shiftKey) {
            e.target.blur();
            return false;
        }
    },
    handleLogout: function (e: JQuery.ClickEvent) {
        app.navigate('/logout');
    },
    handleAddContact: function (e: JQuery.Event) {
        e.preventDefault();

        let contact = this.$('#addcontact')?.val()?.toString();
        if (contact && contact.indexOf('@') === -1 && SERVER_CONFIG.domain)
            contact += '@' + SERVER_CONFIG.domain;
        if (contact) {
            client.sendPresence({ to: contact, type: 'subscribe' });
        }
        this.$('#addcontact').val('');

        return false;
    },
    keyDownAddContact: function (e: JQuery.KeyDownEvent) {
        if (e.which === 13 && !e.shiftKey) {
            this.handleAddContact(e);
            return false;
        }
    },
    handleJoinMUC: function (e: JQuery.Event) {
        e.preventDefault();

        let mucjid = this.$('#joinmuc').val()?.toString() ?? '';
        this.$('#joinmuc').val('');
        if (mucjid.indexOf('@') === -1 && SERVER_CONFIG.muc)
            mucjid += '@' + SERVER_CONFIG.muc;
        me.mucs.add({
            id: mucjid,
            name: mucjid,
            jid: mucjid,
            nick: me.nick,
            autoJoin: true
        });
        me.mucs.save();
        me.mucs.get(mucjid).join(true);
    },
    keyDownJoinMUC: function (e: JQuery.KeyDownEvent) {
        if (e.which === 13 && !e.shiftKey) {
            this.handleJoinMUC(e);
            return false;
        }
    },
    connectionChange: function () {
        if (app.state.connected) {
            this.$joinmuc?.attr('disabled', null);
            this.$addcontact?.attr('disabled', null);
            this.$meStatus?.attr('contenteditable', 'true');
        } else {
            this.$joinmuc?.attr('disabled', 'disabled');
            this.$addcontact?.attr('disabled', 'disabled');
            this.$meStatus?.attr('contenteditable', null);
        }
    },
});
