
import _ from 'underscore';
import { Constants } from 'stanza';
import StayDown from 'staydown';
import Sugar from 'sugar';

import BasePage from './base';
import templates from 'templates';
import MUCRosterItem from '../views/mucRosterItem';
import MessageModel, { MessageType } from '../models/message';
import { MUCType } from '../models/muc';
import { JID } from '../models/jid';
import { ResourceType } from '../models/resource';
import { ContactType } from '../models/contact';
import embedIt from '../helpers/embedIt';
import htmlify from '../helpers/htmlify';

let tempSubject = '';

const GroupChatPage = BasePage.extend<MUCType>().extend({
    template: templates.pages.groupchat,
    initialize: function (spec: unknown) {
        this.editMode = false;

        this.listenTo(this, 'pageloaded', this.handlePageLoaded);
        this.listenTo(this, 'pageunloaded', this.handlePageUnloaded);

        this.listenTo(this.model.messages, 'change', this.refreshModel);
        this.listenTo(this.model.messages, 'reset', this.renderMessages);
        this.listenTo(this.model, 'refresh', this.renderMessages);

        app.state.bind('change:connected', this.connectionChange, this);

        this.render();
    },
    events: {
        'keydown textarea': 'handleKeyDown',
        'keyup textarea': 'handleKeyUp',
        'click .status': 'clickStatusChange',
        'blur .status': 'blurStatusChange',
        'keydown .status': 'keyDownStatusChange',
        'click #members_toggle': 'clickMembersToggle',
    },
    classBindings: {
        joined: '.controls',
    },
    textBindings: {
        displayName: 'header .name',
        subject: 'header .status',
        membersCount: '#members_toggle_count',
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
        autoCompletePos: 'number',
        $chatInput: '$',
        $chatBox: '$',
        $messageList: '$',
        $autoComplete: '$',
        staydown: StayDown,
    },
    show: function (animation: unknown) {
        BasePage.prototype.show.apply(this, [animation]);
        client.sendMessage({
            type: 'groupchat',
            to: this.model.jid,
            chatState: 'active'
        });

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
        client.sendMessage({
            type: 'groupchat',
            to: this.model.jid,
            chatState: 'inactive'
        });
    },
    render: function () {
        if (this.rendered) return this;
        this.rendered = true;

        this.renderAndBind();
        this.$chatInput = this.$('.chatBox textarea');
        this.$chatInput.val(app.composing[this.model.jid] || '');
        this.$chatBox = this.$('.chatBox');
        this.$messageList = this.$('.messages');
        this.$autoComplete = this.$('.autoComplete');

        this.staydown = new StayDown({ target: this.$messageList[0], interval: 500 });

        this.renderMessages();

        this.renderCollection(this.model.resources, MUCRosterItem, this.$('.groupRoster'));

        this.listenTo(this, 'rosterItemClicked', this.rosterItemSelected);
        this.listenTo(this.model.messages, 'add', this.handleChatAdded);
        this.listenTo(this.model.resources, 'add', this.handleResourceAdded);

        $(window).on('resize', _.bind(this.resizeInput, this));

        this.registerBindings();

        return this;
    },
    renderMessages: function () {
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
    handleChatAdded: function (model: MessageType) {
        this.appendModel(model, true);
    },
    handleResourceAdded: function (model: ResourceType) {
        const xmppContact = me.getContact(model.id.split('/')[1]);
        if (xmppContact) {
            xmppContact.bind('change:avatar', this.handleAvatarChanged, this);
        }
    },
    handleAvatarChanged: function (contact: ContactType, uri: string) {
        if (!me.isMe(contact.jid)) {
            $('.' + contact.jid.substr(0, contact.jid.indexOf('@')) + ' .messageAvatar img').attr('src', uri);
        }
    },
    handlePageLoaded: function () {
        this.staydown.checkdown();
        this.resizeInput();
    },
    handlePageUnloaded: function () {
    },
    handleKeyDown: function (e: JQuery.KeyDownEvent) {
        if ((e.which === 13 || e.which === 9) && !e.shiftKey) { // Enter or Tab
            if (this.$autoComplete?.css('display') !== 'none') {
                const nickname = this.$autoComplete?.find('>:nth-child(' + this.autoCompletePos + ')>:first-child')?.text();
                this.rosterItemSelected(nickname);
            } else if (e.which === 13) {
                app.composing[this.model.jid] = '';
                this.sendChat();
            }
            e.preventDefault();
            return false;
        } else if (e.which === 38) { // Up arrow

            if (this.$autoComplete?.css('display') !== 'none') {
                const count = this.$autoComplete?.find('>li')?.length ?? 0;
                const oldPos = this.autoCompletePos ?? 0;
                this.autoCompletePos = (oldPos - 1) < 1 ? count : oldPos - 1;

                this.$autoComplete?.find('>:nth-child(' + oldPos + ')')?.removeClass('selected');
                this.$autoComplete?.find('>:nth-child(' + this.autoCompletePos + ')')?.addClass('selected');

            }
            else if ((this.$chatInput?.val()?.toString()?.length ?? 0) === 0 && this.model.lastSentMessage) {
                this.editMode = true;
                this.$chatInput?.addClass('editing');
                this.$chatInput?.val(this.model.lastSentMessage?.body!);
            }
            e.preventDefault();
            return false;
        } else if (e.which === 40) { // Down arrow

            if (this.$autoComplete?.css('display') !== 'none') {
                const count = this.$autoComplete?.find('>li').length ?? 0;
                const oldPos = this.autoCompletePos ?? 0;
                this.autoCompletePos = (oldPos + 1) > count ? 1 : oldPos + 1;

                this.$autoComplete?.find('>:nth-child(' + oldPos + ')')?.removeClass('selected');
                this.$autoComplete?.find('>:nth-child(' + this.autoCompletePos + ')')?.addClass('selected');
            }
            else if (this.editMode) {
                this.editMode = false;
                this.$chatInput?.removeClass('editing');
            }
            e.preventDefault();
            return false;
        } else if (!e.ctrlKey && !e.metaKey) {
            if (!this.typing || this.paused) {
                this.typing = true;
                this.paused = false;
                client.sendMessage({
                    type: 'groupchat',
                    to: this.model.jid,
                    chatState: 'composing'
                });
            }
        }
    },
    handleKeyUp: function (e: JQuery.KeyUpEvent) {
        this.resizeInput();
        app.composing[this.model.jid] = this.$chatInput?.val()?.toString() ?? '';
        if (this.typing && this.$chatInput?.val()?.toString()?.length === 0) {
            this.typing = false;
            this.paused = false;
            client.sendMessage({
                type: 'groupchat',
                to: this.model.jid,
                chatState: 'active'
            });
        } else if (this.typing) {
            this.pausedTyping();
        }

        if (([38, 40, 13]).indexOf(e.which) === -1) {
            const lastWord = this.$chatInput?.val()?.toString()?.split(' ')?.pop() ?? '';
            if (lastWord.charAt(0) === '@') {
                const models = this.model.resources?.search(lastWord.substr(1) || '', true, true);
                if (models.length) {
                    this.renderCollection(models, MUCRosterItem, this.$autoComplete!);
                    this.autoCompletePos = 1;
                    this.$autoComplete?.find('>:nth-child(' + this.autoCompletePos + ')')?.addClass('selected');
                    this.$autoComplete?.show();
                }
                else
                    this.$autoComplete?.hide();
            }

            if (this.$autoComplete?.css('display') !== 'none') {
                if (lastWord === '') {
                    this.$autoComplete?.hide();
                    return;
                }
            }
        }
    },
    rosterItemSelected: function (nickName?: string) {
        if (nickName === me.nick)
            nickName = 'me';
        const val = this.$chatInput?.val()?.toString();
        const splited = val?.split(' ') ?? [];
        const length = splited.length - 1;
        const lastWord = splited.pop() ?? '';
        if (('@' + nickName).indexOf(lastWord) > -1)
            splited[length] = nickName + ', ';
        else
            splited.push(nickName + ', ');
        this.$chatInput?.val(splited.join(' '));
        this.$autoComplete?.hide();
        this.$chatInput?.focus();
    },
    resizeInput: /*throtle*/ function () {
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
    pausedTyping: /*debounce*/ function () {
        if (this.typing && !this.paused) {
            this.paused = true;
            client.sendMessage({
                type: 'groupchat',
                to: this.model.jid,
                chatState: 'paused'
            });
        }
    },
    sendChat: function () {
        const val = this.$chatInput?.val()?.toString();

        if (val) {
            this.staydown.intend_down = true;

            const links = _.map(htmlify.collectLinks(val), function (link) {
                return { url: link };
            });

            const bmessage = {
                to: this.model.jid,
                type: 'groupchat' as Constants.MessageType,
                body: val,
                chatState: 'active' as Constants.ChatState,
                oobURIs: links
            };
            const message: Partial<typeof bmessage> & {
                replace?: string,
            } = bmessage;
            if (this.editMode) {
                message.replace = this.model.lastSentMessage?.mid || this.model.lastSentMessage?.cid;
            }

            const mid = client.sendMessage(message);
            const from = JID.parse(this.model.jid + '/' + this.model.nick);
            const to = JID.parse(message.to!);

            const msgModel = new MessageModel({
                ...message,
                mid: mid,
                from: from,
                to: to,
            });

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
        this.$chatInput?.removeClass('editing');
        this.$chatInput?.val('');
    },
    clickStatusChange: function (e: JQuery.ClickEvent) {
        tempSubject = e.target.textContent;
    },
    blurStatusChange: function (e: JQuery.BlurEvent) {
        let subject = e.target.textContent;
        if (subject === '')
            subject = true;
        client.setSubject(this.model.jid, subject);
        e.target.textContent = tempSubject;
    },
    keyDownStatusChange: function (e: JQuery.KeyDownEvent) {
        if (e.which === 13 && !e.shiftKey) {
            e.target.blur();
            return false;
        }
    },
    clickMembersToggle: function (e: JQuery.Event) {
        const roster = $('.groupRoster'); // TODO: check for active roster not for any
        const pages = roster.closest('.page');
        const toggleVisible = roster.css('visibility') === 'hidden'

        if (toggleVisible)
            roster.css('visibility', 'visible');
        else
            roster.css('visibility', 'hidden');

        pages.toggleClass('visibleGroupRoster', toggleVisible);
    },
    appendModel: function (model: MessageType, preload?: boolean) {
        const msgDate = Sugar.Date(model.timestamp!);
        const messageDay = msgDate.format('{month} {dd}, {yyyy}').toString();

        if (this.firstModel === undefined ||
            msgDate.getMilliseconds() >
            Sugar.Date(this.firstModel.timestamp!).getMilliseconds()) {
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
            let newEl: JQuery
            if (isGrouped) {
                newEl = $(model.partialTemplateHtml);
                const last = this.$messageList?.find('li')?.last();
                last?.find('.messageWrapper')?.append(newEl);
                last?.addClass('chatGroup');
                this.staydown.checkdown();
            } else {
                newEl = $(model.templateHtml);
                newEl.addClass(model.sender?.getNickname(model.from?.full)!);
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
            let newEl: JQuery
            if (isGrouped) {
                newEl = $(model.partialTemplateHtml);
                const first = this.$messageList?.find('li')?.first()?.next();
                first?.find('.messageWrapper div:first')?.after(newEl);
                first?.addClass('chatGroup');
            } else {
                newEl = $(model.templateHtml);
                newEl.addClass(model.sender?.getNickname(model.from?.full)!);
                firstEl?.after(newEl[0]);
                this.firstModel = model;
            }
            if (!model.pending) embedIt(newEl);

            this.$messageList?.scrollTop(this.$messageList?.prop('scrollHeight') - scrollDown);
            this.firstChanged = true;
        }
    },
    refreshModel: function (model: MessageType) {
        const existing = this.$('#chat' + model.cid);
        existing.replaceWith(model.bareMessageTemplate(existing.prev().hasClass('message_header')));
    },
    connectionChange: function () {
        if (app.state.connected) {
            this.$chatInput?.attr('disabled', null);
        } else {
            this.$chatInput?.attr('disabled', 'disabled');
        }
    }
});

GroupChatPage.prototype.pausedTyping = _.debounce(GroupChatPage.prototype.pausedTyping, 3000);
GroupChatPage.prototype.resizeInput = _.throttle(GroupChatPage.prototype.resizeInput, 300)

export default GroupChatPage;
