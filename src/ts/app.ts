
import _ from 'underscore';

import Backbone from 'backbone';
import StanzaIO, { createClient } from 'stanza';
import Notify from 'notify.js';
import url from 'url';
import SoundEffectManager from 'sound-effect-manager';

import { HumanView } from './types/human-view';
import { Profile } from './storage/profile';
import State, { StateType } from './models/state';
import Me from './models/me';
import { BasePageType } from './pages/base';
import MainView from './views/main';
import Router from './router';
import AppStorage from './storage';
import xmppEventHandlers from './helpers/xmppEventHandlers';
import pushNotifications from './helpers/pushNotifications';
import { fire, rail } from './helpers/railway';

export class App {
    config: StanzaIO.AgentConfig = <StanzaIO.AgentConfig>{};
    notifications: Notify = <Notify>{};
    soundManager: typeof SoundEffectManager;
    storage: AppStorage = <AppStorage>{};
    composing: Record<string, string> = {};
    timeInterval: number = 0;

    currentPage: BasePageType = <BasePageType>{};
    state: StateType = <StateType>{};
    history: Backbone.History = <Backbone.History>{};

    id: any;

    launch() {
        function parseConfig(json: string) {
            const config = JSON.parse(json);
            const credentials = config.credentials;
            if (!credentials) return config;

            for (const property in credentials) {
                if (!credentials.hasOwnProperty(property)) continue;

                const value = credentials[property];
                if (value.type === 'Buffer') {
                    credentials[property] = new Buffer(value);
                }
            }

            return config;
        }

        const self = window['app'] = this;
        const config = localStorage['config'];

        if (!config) {
            console.log('missing config');
            app.whenDisconnected();
            return;
        }

        app.config = parseConfig(config);
        app.config.useStreamManagement = false; // Temporary solution because this feature is bugged on node 4.0

        if (!app.config.jid) {
            console.log('not logged in');
            app.whenDisconnected();
            return;
        }
        _.extend(this, Backbone.Events);

        fire(async () => {
            app.notifications = new Notify();
            app.soundManager = new SoundEffectManager();
            app.storage = new AppStorage();
            await app.storage.open();
            app.composing = {};
            app.timeInterval = 0;

            let profile: Profile = {
                jid: app.config.jid!,
            };
            const [err, res] = await rail(app.storage.profiles.get(app.config.jid));
            if (!err && res) {
                profile = res;
                profile.jid = app.config.jid!;
                app.config.rosterVer = res.rosterVer;
            }

            app.state = new State();
            window['me'] = new Me(profile);

            window.onbeforeunload = () => {
                if (client.sessionStarted) {
                    client.disconnect();
                }
            };

            window['client'] = createClient(app.config);
            client.use(pushNotifications);
            xmppEventHandlers(client, self);
            client.connect();

            await new Promise((ok, err) => client.once('session:started', ok));
            app.state.hasConnected = true;

            app.soundManager.loadFile('sounds/ding.wav', 'ding');
            app.soundManager.loadFile('sounds/threetone-alert.wav', 'threetone-alert');

            await app.whenConnected();

            function getInterval() {
                if (!client.sessionStarted) return;
                fire(async () => {
                    const [err, res] = await rail(client.getTime(self.id));
                    if (err || !res) return;
                    self.timeInterval = (res.utc?.getMilliseconds() ?? 0) - Date.now();
                });
                setTimeout(getInterval, 600000);
            }
            getInterval();

            me.publishAvatar();

            new Router();
            app.history = Backbone.history;
            app.history.on('route', function (route, params) {
                app.state.pageChanged = params;
            });

            const view = new MainView({
                model: app.state,
                el: document.body,
            });
            view.render();

            if (!me.contacts.length) {
                await new Promise((ok, err) => me.contacts.once('loaded', ok));
            }

            // start our router and show the appropriate page
            const baseUrl = url.parse(SERVER_CONFIG.baseUrl ?? '')
            app.history.start({ pushState: false, root: baseUrl.pathname! })
            if ('fragment' in app.history && app.history.fragment === '' && SERVER_CONFIG.startup)
                app.navigate(SERVER_CONFIG.startup)
        });;
    }
    async whenConnected() {
        if (client.sessionStarted) return;
        await new Promise((ok, err) => me.contacts.once('session:started', ok));
    }
    whenDisconnected() {
        window.location.href = 'login.html';
    }
    navigate(page: string) {
        const url = (page.charAt(0) === '/') ? page.slice(1) : page;
        app.state.markActive();
        app.history.navigate(url, true);
    }
    renderPage(view: HumanView<any>, animation?: unknown) {
        const container = $('#pages');

        if (app.currentPage) {
            app.currentPage.hide(animation);
        }
        // we call render, but if animation is none, we want to tell the view
        // to start with the active class already before appending to DOM.
        ///animation === 'none'
        container.append(view.render().el);
        (view as BasePageType).show(animation);
    }
    serverConfig() {
        return SERVER_CONFIG;
    }
}

const app = new App();

$(() => app.launch());

export default app;
