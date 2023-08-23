
import _ from 'underscore';
import HumanView from 'human-view';
import templates from 'templates';


export default HumanView.extend({
    template: templates.includes.mucRosterItem,
    events: {
        'click': 'handleClick'
    },
    classBindings: {
        show: '',
        chatState: '',
        idle: ''
    },
    textBindings: {
        mucDisplayName: '.name'
    },
    render: function () {
        this.renderAndBind({contact: this.model});
        return this;
    },
    handleClick: function (e: Event) {
        this.parent.trigger('rosterItemClicked', this.model.mucDisplayName);
    }
});
