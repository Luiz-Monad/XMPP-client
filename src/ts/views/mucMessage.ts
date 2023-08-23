
import _ from 'underscore';
import HumanView from 'human-view';
import templates from 'templates';


export default HumanView.extend({
    template: templates.includes.mucMessage,
    initialize: function (opts) {
        this.render();
    },
    classBindings: {
        mine: '.message',
        pending: '.message',
        delayed: '.message',
        edited: '.message',
        meAction: '.message'
    },
    textBindings: {
        body: '.body',
        nick: '.nick',
        formattedTime: '.timestamp'
    },
    render: function () {
        this.renderAndBind({message: this.model});
        return this;
    }
});
