
import { MeType } from '../models/me';
import BasePage from './base';
import templates from 'templates';

const SettingsPage = BasePage.extend<MeType>().extend({
    template: templates.pages.settings,
    classBindings: {
        shouldAskForAlertsPermission: '.enableAlerts',
        soundEnabledClass: '.soundNotifs',
    },
    srcBindings: {
        avatar: '#avatarChanger img',
    },
    textBindings: {
        status: '.status',
    },
    events: {
        'click .enableAlerts': 'enableAlerts',
        'click .soundNotifs': 'handleSoundNotifs',
        'dragover': 'handleAvatarChangeDragOver',
        'drop': 'handleAvatarChange',
        'change #uploader': 'handleAvatarChange',
        'click .disconnect': 'handleDisconnect',
    },
    render: function () {
        this.renderAndBind();
        return this;
    },
    enableAlerts: function () {
        if (app.notifications.permissionNeeded()) {
            app.notifications.requestPermission(function (perm) {
                if (perm === 'granted') {
                    app.notifications.create('Ok, sweet!', {
                        body: "You'll now be notified of stuff that happens."
                    });
                }
            });
        }
    },
    handleAvatarChangeDragOver: function (e: JQuery.Event) {
        e.preventDefault();
        return false;
    },
    handleAvatarChange: function (e: JQuery.ChangeEvent) {
        let file;

        e.preventDefault();

        if ((e as any).dataTransfer) {
            file = (e as any).dataTransfer.files[0];
        } else if (e.target.files) {
            file = e.target.files[0];
        } else {
            return;
        }

        if (file.type.match('image.*')) {
            const fileTracker = new FileReader();
            fileTracker.onload = function () {
                me.publishAvatar(this.result?.toString());
            };
            fileTracker.readAsDataURL(file);
        }
    },
    handleSoundNotifs: function (e: JQuery.Event) {
        this.model.setSoundNotification(!this.model.soundEnabled);
    },
    handleDisconnect: function (e: JQuery.Event) {
        client.disconnect();
    },
});

export default SettingsPage;
