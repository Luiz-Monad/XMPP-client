
import Backbone from 'backbone';
import SettingsPage from './pages/settings';
import ChatPage from './pages/chat';
import GroupChatPage from './pages/groupchat';

const Router = Backbone.Router.extend({
    routes: {
        '': 'settings',
        'chat/:jid': 'chat',
        'chat/:jid/:resource': 'chat',
        'groupchat/:jid': 'groupchat',
        'logout': 'logout'
    },
    // ------- ROUTE HANDLERS ---------
    settings: function () {
        app.renderPage(new SettingsPage({
            model: me
        }));
    },
    chat: function (jid: string) {
        const contact = me.contacts.get(decodeURIComponent(jid));
        if (contact) {
            app.renderPage(new ChatPage({
                model: contact
            }));
        } else {
            app.navigate('/');
        }
    },
    groupchat: function (jid: string) {
        const contact = me.mucs.get(decodeURIComponent(jid));
        if (contact) {
            app.renderPage(new GroupChatPage({
                model: contact
            }));
        } else {
            app.navigate('/');
        }
    },
    logout: function () {
        if (client.sessionStarted) {
            client.disconnect();
        }
        localStorage.clear();
        app.whenDisconnected();
    },
});

export default Router;
