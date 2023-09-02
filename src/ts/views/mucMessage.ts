
import _ from 'underscore';

import templates from 'templates';
import { MessageType } from '../models/message';
import HumanView from '../helpers/human-view';

export default HumanView.extend<MessageType>().extend({
    template: templates.includes.mucBareMessage,
    initialize: function (opts: unknown) {
        this.render();
    },
    classBindings: {
        mine: '.message',
        pending: '.message',
        delayed: '.message',
        edited: '.message',
        meAction: '.message',
    },
    textBindings: {
        body: '.body',
        nick: '.nick',
        formattedTime: '.timestamp',
    },
    render: function () {
        this.renderAndBind({ message: this.model });
        return this;
    },
});
