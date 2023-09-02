/*global app, me, client, Resample*/
"use strict";

var BasePage = require('./base');
var templates = require('../templates');

module.exports = BasePage.extend({
    template: templates.pages.settings,
    classBindings: {
        shouldAskForAlertsPermission: '.enableAlerts',
        soundEnabledClass: '.soundNotifs'
    },
    srcBindings: {
        avatar: '#avatarChanger img'
    },
    textBindings: {
        status: '.status'
    },
    events: {
        'click .enableAlerts': 'enableAlerts',
        'click .soundNotifs': 'handleSoundNotifs',
        'dragover': 'handleAvatarChangeDragOver',
        'drop': 'handleAvatarChange',
        'change #uploader': 'handleAvatarChange',
        'click .disconnect': 'handleDisconnect'
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
    handleAvatarChangeDragOver: function (e) {
        e.preventDefault();
        return false;
    },
    handleAvatarChange: function (e) {
        var file;

        e.preventDefault();

        if (e.dataTransfer) {
            file = e.dataTransfer.files[0];
        } else if (e.target.files) {
            file = e.target.files[0];
        } else {
            return;
        }

        if (file.type.match('image.*')) {
            var fileTracker = new FileReader();
            fileTracker.onload = function () {
                me.publishAvatar(this.result);
            };
            fileTracker.readAsDataURL(file);
        }
    },
    handleSoundNotifs: function (e) {
        this.model.setSoundNotification(!this.model.soundEnabled);
    },
    handleDisconnect: function (e) {
        client.disconnect();
    }
});
