
import _ from 'underscore';
import { Constants } from 'stanza';
import StayDown from 'staydown';
import BasePage from './base';
import templates from 'templates';
import MessageModel, { MessageType } from '../models/message';
import embedIt from '../helpers/embedIt';
import htmlify from '../helpers/htmlify';
import { ContactType } from '../models/contact';
import { ChatState } from 'stanza/Constants';
import { ResourceType } from '../models/resource';

const ChatPage = BasePage.define<ContactType>().extend({
    template: templates.pages.chat,
    initialize: function (spec: unknown) {
        this.editMode = false;

        this.listenTo(this, 'pageloaded', this.handlePageLoaded);
        this.listenTo(this, 'pageunloaded', this.handlePageUnloaded);

        this.listenTo(this.model.messages, 'change', this.refreshModel);
        this.listenTo(this.model.messages, 'reset', this.renderCollection);
        this.listenTo(this.model, 'refresh', this.renderCollection);

        app.state.bind('change:connected', this.connectionChange, this);
        this.model.bind('change:avatar', this.handleAvatarChanged, this);

        this.render();
    },
    events: {
        'keydown textarea': 'handleKeyDown',
        'keyup textarea': 'handleKeyUp',
        'click .call': 'handleCallClick',
        'click .accept': 'handleAcceptClick',
        'click .end': 'handleEndClick',
        'click .mute': 'handleMuteClick',
    },
    srcBindings: {
        streamUrl: 'video.remote',
    },
    textBindings: {
        displayName: 'header .name',
        formattedTZO: 'header .tzo',
        status: 'header .status',
        chatStateText: '.chatBox .contactState',
    },
    classBindings: {
        chatState: 'header',
        idle: '.user_presence',
        show: '.user_presence',
        onCall: '.conversation',
    },
    props: {
        firstChanged: 'boolean',
        editMode: 'boolean',
        rendered: 'boolean',
        typing: 'boolean',
        paused: 'boolean',
        firstModel: MessageModel,
        lastModel: MessageModel,
        firstDate: 'string',
        lastDate: 'string',
        $chatInput: '$',
        $chatBox: '$',
        $messageList: '$',
        staydown: StayDown,
    },
    show: function (animation: unknown) {
        BasePage.prototype.show.apply(this, [animation]);
        this.sendChatState('active');

        this.firstChanged = true;
        const self = this;
        $('.messages').scroll(function () {
            if (self.firstChanged && ($('.messages li:first-child').offset()?.top ?? 0) > 0) {
                self.firstChanged = false;
                self.model.fetchHistory();
            }
        });

        this.$chatInput?.focus();
    },
    hide: function () {
        BasePage.prototype.hide.apply(this);
        this.sendChatState('inactive');
    },
    render: function () {
        if (this.rendered) return this;
        const self = this;

        this.rendered = true;

        this.renderAndBind();

        this.$chatInput = this.$('.chatBox textarea');
        this.$chatInput.val(app.composing[this.model.jid] || '');
        this.$chatBox = this.$('.chatBox');
        this.$messageList = this.$('.messages');

        this.staydown = new StayDown({ target: this.$messageList[0], interval: 500 });
        this.renderCollection();

        this.listenTo(this.model.messages, 'add', this.handleChatAdded);
        this.listenToAndRun(this.model, 'change:jingleResources', this.handleJingleResourcesChanged);

        $(window).on('resize', _.bind(this.resizeInput, this));

        this.registerBindings(me, {
            srcBindings: {
                streamUrl: 'video.local'
            }
        });

        return this;
    },
    handlePageLoaded: function (e: JQuery.Event) {
        this.staydown.checkdown();
        this.resizeInput();
    },
    handlePageUnloaded: function (e: JQuery.Event) {
    },
    handleCallClick: function (e: JQuery.Event) {
        e.preventDefault();
        this.model.call();
        return false;
    },
    renderCollection: function () {
        const self = this;

        this.$messageList?.empty();
        delete this.firstModel;
        delete this.firstDate;
        delete this.lastModel;
        delete this.lastDate;

        this.model.messages.each(function (model, i) {
            self.appendModel(model);
        });
        this.staydown.checkdown();
    },
    handleKeyDown: function (e: JQuery.KeyDownEvent) {
        if (e.which === 13 && !e.shiftKey) {
            app.composing[this.model.jid] = '';
            this.sendChat();
            this.sendChatState('active');
            e.preventDefault();
            return false;
        } else if (e.which === 38 && (this.$chatInput?.val()?.toString()?.length ?? 0) === 0 && this.model.lastSentMessage) {
            this.editMode = true;
            this.$chatInput?.addClass('editing');
            this.$chatInput?.val(this.model.lastSentMessage.body!);
            e.preventDefault();
            return false;
        } else if (e.which === 40 && this.editMode) {
            this.editMode = false;
            this.$chatInput?.removeClass('editing');
            e.preventDefault();
            return false;
        } else if (!e.ctrlKey && !e.metaKey) {
            if (!this.typing || this.paused) {
                this.typing = true;
                this.paused = false;
                this.$chatInput?.addClass('typing');
                this.sendChatState('composing');
            }
        }
    },
    handleKeyUp: function (e: JQuery.KeyUpEvent) {
        this.resizeInput();
        app.composing[this.model.jid!] = this.$chatInput?.val()?.toString() ?? '';
        if (this.typing && (this.$chatInput?.val()?.toString()?.length ?? 0) === 0) {
            this.typing = false;
            this.$chatInput?.removeClass('typing');
            this.sendChatState('active');
        } else if (this.typing) {
            this.pausedTyping();
        }
    },
    pausedTyping: /*debounce*/ function () {
        if (this.typing && !this.paused) {
            this.paused = true;
            this.sendChatState('paused');
        }
    },
    sendChatState: function (state: ChatState) {
        //if (!this.model.supportsChatStates) return;
        client.sendMessage({
            to: this.model.lockedResource || this.model.jid,
            chatState: state
        });
    },
    sendChat: function () {
        const val = this.$chatInput?.val()?.toString();

        if (val) {
            this.staydown.intend_down = true;

            const links = _.map(htmlify.collectLinks(val), function (link) {
                return { url: link };
            });

            const bmessage = {
                id: client.nextId(),
                to: this.model.lockedResource || this.model.jid,
                type: 'chat' as Constants.MessageType,
                body: val,
                requestReceipt: true,
                oobURIs: links,
            };
            const message: Partial<typeof bmessage> & {
                chatState?: Constants.ChatState,
                replace?: string,
                from?: string,
            } = bmessage;
            if (this.model.supportsChatStates) {
                message.chatState = 'active';
            }
            if (this.editMode) {
                message.replace = this.model.lastSentMessage?.id?.toString();
            }

            client.sendMessage(message);

            // Prep message to create a Message model
            const from = me.jid;
            const mid = message.id;
            delete message.id;

            const msgModel = new MessageModel(message);
            msgModel.from = from;
            msgModel.mid = mid;

            if (this.editMode) {
                this.model.lastSentMessage?.correct(msgModel);
            } else {
                this.model.addMessage(msgModel, false);
                this.model.lastSentMessage = msgModel;
            }
        }
        this.editMode = false;
        this.typing = false;
        this.paused = false;
        this.$chatInput?.removeClass('typing');
        this.$chatInput?.removeClass('editing');
        this.$chatInput?.val('');
    },
    handleChatAdded: function (model: MessageType) {
        this.appendModel(model, true);
    },
    refreshModel: function (model: MessageType) {
        let existing = this.$('#chat' + model.cid);
        existing.replaceWith(model.bareMessageTemplate(existing.prev().hasClass('message_header')));
        existing = this.$('#chat' + model.cid);
        embedIt(existing);
    },
    handleJingleResourcesChanged: function (model: unknown, val: ResourceType[]) {
        const resources = val || this.model.jingleResources;
        this.$('button.call').prop('disabled', !resources.length);
    },
    handleAvatarChanged: function (contact: ContactType, uri: string) {
        if (!me.isMe(contact.jid)) {
            $('.' + contact.jid.substr(0, contact.jid.indexOf('@')) + ' .messageAvatar img').attr('src', uri);
        }
    },
    appendModel: function (model: MessageType, preload?: boolean) {
        const msgDate = Date.create(model.timestamp!);
        const messageDay = msgDate.format('{month} {ord}, {yyyy}');

        if (this.firstModel === undefined || msgDate > new Date(this.firstModel.timestamp!)) {
            if (this.firstModel === undefined) {
                this.firstModel = model;
                this.firstDate = messageDay;
            }

            if (messageDay !== this.lastDate) {
                const dayDivider = $(templates.includes.dayDivider({ day_name: messageDay }));
                this.staydown.append(dayDivider[0]);
                this.lastDate = messageDay;
            }

            const isGrouped = model.shouldGroupWith(this.lastModel);
            let newEl: JQuery;
            if (isGrouped) {
                newEl = $(model.partialTemplateHtml);
                const last = this.$messageList?.find('li')?.last();
                last?.find('.messageWrapper')?.append(newEl);
                last?.addClass('chatGroup');
                this.staydown.checkdown();
            } else {
                newEl = $(model.templateHtml);
                if (!me.isMe(model.sender?.jid)) {
                    const jid = typeof model.sender?.jid === 'string' ? model.sender?.jid : model.sender?.jid.full;
                    newEl.addClass(jid?.substr(0, jid?.indexOf('@') ?? 0) ?? '');
                }
                this.staydown.append(newEl[0]);
                this.lastModel = model;
            }
            if (!model.pending) embedIt(newEl);
        }
        else {
            const scrollDown = (this.$messageList?.prop('scrollHeight') ?? 0) - (this.$messageList?.scrollTop() ?? 0);
            const firstEl = this.$messageList?.find('li')?.first();

            if (messageDay !== this.firstDate) {
                const dayDivider = $(templates.includes.dayDivider({ day_name: messageDay }));
                firstEl?.before(dayDivider[0]);
                this.firstDate = messageDay;
            }

            const isGrouped = model.shouldGroupWith(this.firstModel);
            let newEl: JQuery;
            if (isGrouped) {
                newEl = $(model.partialTemplateHtml);
                const first = this.$messageList?.find('li')?.first()?.next();
                first?.find('.messageWrapper div:first')?.after(newEl);
                first?.addClass('chatGroup');
            } else {
                newEl = $(model.templateHtml);
                if (!me.isMe(model.sender?.jid)) {
                    const jid = typeof model.sender?.jid === 'string' ? model.sender?.jid : model.sender?.jid.full;
                    newEl.addClass(jid?.substr(0, jid?.indexOf('@') ?? 0) ?? '');
                }
                firstEl?.after(newEl[0]);
                this.firstModel = model;
            }
            if (!model.pending) embedIt(newEl);

            this.$messageList?.scrollTop(this.$messageList.prop('scrollHeight') - scrollDown);
            this.firstChanged = true;
        }
    },
    handleAcceptClick: function (e: JQuery.Event) {
        e.preventDefault();
        this.$('button.accept').prop('disabled', true);
        if (this.model.jingleCall?.sid && this.model.jingleCall.state === 'pending') {
            client.acceptCall(this.model.jingleCall.sid);
        }
        return false;
    },
    handleEndClick: function (e: JQuery.Event) {
        e.preventDefault();
        if (this.model.jingleCall?.sid) {
            client.declineCall(this.model.jingleCall.sid)
        }
        return false;
    },
    handleMuteClick: function (e: JQuery.Event) {
        return false;
    },
    resizeInput: /*throttle*/ function () {
        const maxHeight = parseInt(this.$chatInput?.css('max-height')!, 10);

        this.$chatInput?.removeAttr('style');
        const height = this.$chatInput?.outerHeight() ?? 0;
        const scrollHeight = this.$chatInput?.get(0)?.scrollHeight ?? 0;
        let newHeight = Math.max(height, scrollHeight);
        const heightDiff = height - (this.$chatInput?.innerHeight() ?? 0);

        if (newHeight > maxHeight) newHeight = maxHeight;
        if (newHeight > height) {
            this.$chatInput?.css('height', newHeight + heightDiff);
            this.$chatInput?.scrollTop(this.$chatInput[0].scrollHeight - (this.$chatInput?.height() ?? 0));
            const newMargin = newHeight - height + heightDiff;
            const marginDelta = newMargin - parseInt(this.$messageList?.css('marginBottom')!, 10);
            if (!!marginDelta) {
                this.$messageList?.css('marginBottom', newMargin);
            }
        } else {
            this.$messageList?.css('marginBottom', 0);
        }
    },
    connectionChange: function () {
        if (app.state.connected) {
            this.$chatInput?.attr('disabled', null);
        } else {
            this.$chatInput?.attr('disabled', 'disabled');
        }
    },
});

ChatPage.prototype.pausedTyping = _.debounce(ChatPage.prototype.pausedTyping, 3000);
ChatPage.prototype.resizeInput = _.throttle(ChatPage.prototype.resizeInput, 300)

export default ChatPage;
