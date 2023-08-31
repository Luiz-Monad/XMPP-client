
import _ from 'underscore';
import HumanView from 'human-view';

const BasePage = HumanView.extend({
    props: {
        detached: 'boolean',
        cache: 'boolean',
    },

    show: function (animation?: unknown) {
        const self = this;

        $('body').scrollTop(0);

        if (this.detached) {
            this.$('#pages').append(this.el);
            this.detached = false;
        } else {
            this.render();
        }

        this.$el.addClass('active');

        app.currentPage = this;

        app.state.pageTitle = _.result(self, 'title');

        this.trigger('pageloaded');

        if ('jid' in this.model) {
            me.setActiveContact(this.model.jid as string);
        }

        return this;
    },
    hide: function (animation?: unknown) {
        const self = this;

        this.$el.removeClass('active');

        this.trigger('pageunloaded');

        if (this.cache) {
            this.$el.detach();
            this.detached = true;
        } else {
            this.animateRemove();
        }

        me.setActiveContact('');

        return this;
    },
});

export default BasePage;
export type BasePageType = InstanceType<typeof BasePage>;

