
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
import { JID } from './models/jid';
import { BasePageType } from './pages/base';
import MainView from './views/main';
import Router from './router';
import AppStorage from './storage';
import xmppEventHandlers from './helpers/xmppEventHandlers';
import pushNotifications from './helpers/pushNotifications';
import { fire, rail, timer } from './helpers/railway';
import Barrier from './helpers/barrier';

export class App {
    config: StanzaIO.AgentConfig = <StanzaIO.AgentConfig>{};
    notifications: Notify = <Notify>{};
    soundManager: typeof SoundEffectManager;
    storage: AppStorage = <AppStorage>{};
    composing: Record<string, string> = {};
    timeInterval: number = 0;
    asyncBarrier: Barrier = <Barrier>{};

    currentPage: BasePageType | null = null;
    state: StateType = <StateType>{};
    history: Backbone.History = <Backbone.History>{};

    launch() {
        const self = window['app'] = this;
        fire(async () => {

            /* *** Config *** */

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

            const config = localStorage.config;

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
            _.extend(self, Backbone.Events);

            /* *** Dependencies *** */

            app.notifications = new Notify();
            app.soundManager = new SoundEffectManager();
            app.storage = new AppStorage();
            app.state = new State();
            app.composing = {};
            app.timeInterval = 0;
            app.asyncBarrier = new Barrier();

            await app.storage.open();

            /* *** User Profile *** */

            let profile: Profile = {
                storageId: app.config.jid!,
                jid: JID.parse(app.config.jid!),
            };
            const [err, res] = await rail(app.storage.profiles.get(app.config.jid));
            if (!err && res) {
                profile = res;
                profile.jid = JID.parse(app.config.jid!);
                app.config.rosterVer = res.rosterVer;
            }

            window['me'] = new Me(profile);
            me.publishAvatar();
            me.load();

            me.contacts.on('loaded', () => self.asyncBarrier.trigger('contacts:loaded'));

            /* *** Window events *** */

            window.onbeforeunload = () => {
                if (client.sessionStarted) {
                    client.disconnect();
                }
            };

            /* *** XMPP client *** */

            window['client'] = createClient(app.config);
            client.use(pushNotifications);
            xmppEventHandlers(client, self);
            client.connect();

            client.on('session:started', () => self.asyncBarrier.trigger('session:started'));

            await app.whenConnected();
            app.state.hasConnected = true;

            /* *** Sounds *** */

            app.soundManager.loadFile('sounds/ding.wav', 'ding');
            app.soundManager.loadFile('sounds/threetone-alert.wav', 'threetone-alert');

            /* *** Refresh timer *** */

            timer(async () => {
                const [err, res] = await rail(client.getTime(client.jid));
                if (err || !res) return;
                self.timeInterval = (res.utc?.getMilliseconds() ?? 0) - Date.now();
            }, 600000)

            /* *** Backbone *** */

            new Router();
            app.history = Backbone.history;
            app.history.on('route', function (route, params) {
                app.state.pageChanged = params;
            });

            /* *** Main Page *** */

            const view = new MainView({
                model: app.state,
                el: document.body,
            });
            view.render();

            if (!me.contacts.length) {
                await this.asyncBarrier.listen('contacts:loaded');
            }

            /* *** Start navigation *** */

            // start our router and show the appropriate page
            const baseUrl = url.parse(SERVER_CONFIG.baseUrl ?? '')
            app.history.start({ pushState: false, root: baseUrl.pathname! })
            if ('fragment' in app.history && app.history.fragment === '' && SERVER_CONFIG.startup)
                app.navigate(SERVER_CONFIG.startup)

        });
    }
    async whenConnected() {
        if (client.sessionStarted) return;
        await this.asyncBarrier.listen('session:started');
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

        app.currentPage?.hide(animation);
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
