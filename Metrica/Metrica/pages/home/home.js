(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/home/home.html", {
        _homeController: null,

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            Metrica.UI.Pages.Home.Current = new Metrica.UI.Pages.Home();
            this._homeController = Metrica.UI.Pages.Home.Current;
            this._homeController.ready(element, options);
        },

        updateLayout: function (element, viewState, prevViewState) {
            this._homeController.updateLayout(element, viewState, prevViewState);
        },
    });

    var Metrica_UI_Pages_Home = WinJS.Class.define(function () {
    }, {
        /// <field name="_title" type="HTMLDivElement" />
        _title: null,
        /// <field name="_topicTitle" type="HTMLDivElement" />
        _topicTitle: null,
        /// <field name="_channelLog" type="WinJS.UI.ListView" />
        _listViewChannel: null,
        /// <field name="_channelLog" type="HTMLDivElement" />
        _channelLog: null,
        /// <field name="_channelLogItemTemplate" type="HTMLDivElement" />
        _channelLogItemTemplate: null,
        /// <field name="_headerChannelMenu" type="WinJS.UI.Menu" />
        _headerChannelMenu: null,
        /// <field name="_currentChannel" type="Metrica.Data.Channel" />
        _currentChannel: null,
        /// <field name="_session" type="Metrica.Net.Session" />
        _session: null,
        /// <field name="_appBar" type="WinJS.UI.AppBar" />
        _appBar: null,

        ready: function (element, options) {
            this.prepareView(element, options);
            this.prepareEventHandlers(element, options);
            //this.connect();
        },

        updateLayout: function (element, viewState, prevViewState) {
            if (this._currentChannel) {
                if (viewState == Windows.UI.ViewManagement.ApplicationViewState.snapped) {
                    this._title.textContent = this._currentChannel.name;
                } else {
                    this._title.textContent = 'Metrica';
                }
            }
        },

        prepareView: function (element, options) {
            this._appBar = element.querySelector('#appbar').winControl;
            this._session = null;
            this._topicTitle = element.querySelector('#topicTitle');
            this._channelLog = element.querySelector('#channelLog');
            this._title = element.querySelector('.pagetitle');
            this._channelInput = element.querySelector('#channelInput');
            this._listViewChannel = element.querySelector('#channels').winControl;
            if (window.intellisense) this._listViewChannel = new WinJS.UI.ListView();

            this._channelLogItemTemplate = element.querySelector('.templateChannelLogItem2');

            this._listViewChannel.layout = new WinJS.UI.ListLayout();
            this._listViewChannel.itemTemplate = element.querySelector('#templateChannelListViewItem');
            this._listViewChannel.oniteminvoked = this.onChannelItemInvoked.bind(this);

            this._headerChannelMenu = document.getElementById("headerChannelsMenu").winControl;
            if (window.intellisense) this._headerChannelMenu = new WinJS.UI.Menu();
            this._headerChannelMenu.anchor = this._title;

            this.updateAppBar();
        },

        prepareEventHandlers: function (element, options) {
            // appbar
            var hideAppBarAndFlyouts = function () {
                document.getElementById('flyoutSetTopic').winControl.hide();
                document.getElementById('flyoutJoinChannel').winControl.hide();
                document.getElementById('flyoutPartChannel').winControl.hide();
                this._appBar.hide();
            }.bind(this);

            this._appBar.addEventListener("beforeshow", function () {
                if (this._currentChannel) {
                    document.querySelector('#channelTopicInput').value = this._currentChannel.topic;
                }
            }.bind(this), false);
            this._appBar.getCommandById('cmdShowMembers').addEventListener('click', function () {
                WinJS.UI.SettingsFlyout.showSettings("defaults", "/pages/flyoutChannelMembers/flyoutChannelMembers.html");
                this._appBar.hide();
            }.bind(this));
            this._appBar.getCommandById('cmdConnect').addEventListener('click', function () {
                this.connect();
                this._appBar.hide();
            }.bind(this));

            // menu
            this._title.addEventListener('click', function (e) {
                if (this._session) {
                    this._headerChannelMenu.commands = this._session.sortedChannels.map(function (channel, i) {
                        return new WinJS.UI.MenuCommand(null, { id: 'menuItemChannel' + i, label: channel.name, selected: channel == this._currentChannel });
                    }.bind(this));
                }
                this._headerChannelMenu.show();
            }.bind(this));
            this._headerChannelMenu.addEventListener('click', function (e) {
                var d = this._headerChannelMenu.getCommandById(e.target.id);
                var cmd = e.target.winControl;
                var channel = this._session.getChannel(cmd.label);
                this.selectChannel(channel);
            }.bind(this));


            // input
            this._channelInput.addEventListener('keydown', function (e) {
                if (e.keyCode == 13) {
                    if (this._session == null || this._channelInput.value == '') return;

                    var message = new Metrica.Net.IrcMessage((e.shiftKey ? "NOTICE" : "PRIVMSG"), [this._currentChannel.name, this._channelInput.value]);
                    // send to server
                    this._session.sendMessage(message);
                    this._channelInput.value = '';
                }
            }.bind(this));

            document.querySelector('#buttonJoin').addEventListener('click', function () {
                var input = document.querySelector('#joinChannelNameInput');
                this._session.sendMessage(new Metrica.Net.IrcMessage("JOIN", [input.value]));
                input.value = "";
                hideAppBarAndFlyouts();
            }.bind(this));
            document.querySelector('#buttonPart').addEventListener('click', function () {
                var input = document.querySelector('#partCommentInput');
                this._session.sendMessage(new Metrica.Net.IrcMessage("PART", [this._currentChannel.name, input.value]));
                input.value = "";
                hideAppBarAndFlyouts();
            }.bind(this));
            document.querySelector('#buttonSetTopic').addEventListener('click', function () {
                this._session.sendMessage(new Metrica.Net.IrcMessage("TOPIC", [this._currentChannel.name, document.querySelector('#channelTopicInput').value]));
                hideAppBarAndFlyouts();
            }.bind(this));
        },

        onConnected: function () {
            this.updateAppBar();
        },
        onDisconnected: function () {
            this.updateAppBar();
        },

        connect: function () {
            var account = Metrica.Setting.Accounts.getByName('Default');
            if (!account || !account.isValid) {
                WinJS.UI.SettingsFlyout.showSettings("Connections", "/pages/flyoutSettingConnections/flyoutSettingConnections.html");
                return;
            }

            var session = new Metrica.Net.Session(account);
            Metrica.Net.CurrentSessions[account] = session;

            this._session = Metrica.Net.CurrentSessions[account];
            this._listViewChannel.itemDataSource = this._session.sortedChannels.dataSource;
            this._session.connection
                         .connectAsync()
                         .then(function () { this.onConnected(); }.bind(this),
                               function (error) {
                                   new Windows.UI.Popups.MessageDialog("Connection failed. (" + error.message.replace(/\r\n/g, '') + ")").showAsync().done();
                               }.bind(this));
        },

        onChannelItemInvoked: function (e) {
            e.detail.itemPromise.then(function (v) {
                this.selectChannel(v.data);
            }.bind(this));
        },

        onChannelLogItemInserted: function (e) {
            this.appendLineToCurrentLogView(e.detail.value);
        },

        onChannelLogItemRemoved: function (e) {
            // TODO: ないと思うけど途中が抜けた場合とか…
            if (this._channelLog.firstElementChild)
                this._channelLog.removeChild(this._channelLog.firstElementChild);
        },

        appendLineToCurrentLogView: function (data) {
            var stimeFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("shorttime");

            var d = this._channelLogItemTemplate.cloneNode(true);
            d.style.display = 'block';
            d.classList.add('message-type-' + data.type);
            if (data.type.match(/^\d+$/)) {
                d.classList.add('message-type-numeric');
            }
            d.querySelector('.time').textContent = stimeFmt.format(data.time);
            d.querySelector('.nickname').textContent = data.nick;
            //d.querySelector('.message').textContent = data.message;

            // linkify
            var messageElement = d.querySelector('.message');
            messageElement.textContent = '';
            messageElement.appendChild(Metrica.Utilities.linkify(data.message));

            // もともとの位置が一番下の時、要素追加後に一番下までスクロールする
            var requireScroll = (this._channelLog.scrollTop == this._channelLog.scrollHeight - this._channelLog.offsetHeight); // 追加前の状態が末端の時はスクロールする
            this._channelLog.appendChild(d);
            if (requireScroll) {
                this.scrollToBottom();
            }
            return WinJS.Promise.as(d);
        },

        createLineHtml: function (data) {
            var stimeFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("shorttime");
            return '<div class="templateChannelLogItem2 ' + ('message-type-' + data.type) + '">' +
                   '<div class="channelLogViewLine">' +
                   '<span class="time">' + Metrica.Utilities.escapeHtml(stimeFmt.format(data.time)) + '</span>' +
                   '<span class="nickname">' + Metrica.Utilities.escapeHtml(data.nick) + '</span>' +
                   '<span class="message">' + Metrica.Utilities.linkifyHtml(data.message) + '</span>' +
                   '</div>' +
                   '</div>';
        },

        scrollToBottom: function () {
            /// <summary>ログを一番下までスクロールします。</summary>
            this._channelLog.scrollTop = this._channelLog.scrollHeight - this._channelLog.offsetHeight;
        },

        updateAppBar: function () {
            var isConnected = this._session && this._session.connection.isConnected;
            var selectedChannel = this._currentChannel;
            // selection commands
            this._appBar.getCommandById('cmdSetTopic').disabled = !(isConnected && selectedChannel && !selectedChannel.isSpecial);
            this._appBar.getCommandById('cmdPart').disabled = !(isConnected && selectedChannel && !selectedChannel.isSpecial);
            this._appBar.getCommandById('cmdShowMembers').disabled = !(isConnected && selectedChannel && !selectedChannel.isSpecial);
            // global commands
            this._appBar.getCommandById('cmdJoinNew').disabled = !(isConnected);
        },

        onChannelTopicChanged: function (newTopic, oldTopic) {
            if (!oldTopic) return;

            WinJS.UI.Animation.exitContent([this._topicTitle]).then(function () {
                this._topicTitle.textContent = newTopic;
                return WinJS.UI.Animation.enterContent([this._topicTitle]);
            }.bind(this));
        },

        selectChannel: function (channel) {
            if (this._currentChannel == channel) return;

            WinJS.UI.Animation.exitContent([this._topicTitle, this._channelLog])
                .then(function () {
                    // unobserve
                    if (this._currentChannelLog) {
                        this._currentChannelLog.oniteminserted = null;
                        this._currentChannelLog.onitemremoved = null;
                    }

                    // title
                    if (Windows.UI.ViewManagement.ApplicationView.value == Windows.UI.ViewManagement.ApplicationViewState.snapped) {
                        this._title.textContent = channel.name;
                    } else {
                        this._title.textContent = 'Metrica';
                    }

                    // clear all
                    this._channelLog.innerHTML = '';

                    // clear unread count
                    channel.unreadCount = 0;

                    // set topic
                    this._topicTitle.textContent = channel.topic;
                    if (this._currentChannel) {
                        this._currentChannel.unbind('topic', this.onChannelTopicChanged.bind(this));
                    }
                    channel.bind('topic', this.onChannelTopicChanged.bind(this));

                    // select channel
                    this._session.channels.forEach(function (item) { item.isSelected = false; });
                    channel.isSelected = true;

                    // update view
                    //WinJS.Promise.join(channel.channelLog.slice(0, 200).map(function (logLine) {
                    //    return WinJS.Promise.as(true);
                    //    //return this.appendLineToCurrentLogView(logLine);
                    //}.bind(this))).then(function () {
                    //    this._channelLog.scrollTop = this._channelLog.scrollHeight - this._channelLog.offsetHeight;
                    //}.bind(this));
                    var innerHTML = '';
                    channel.channelLog.forEach(function (logLine) {
                        innerHTML += this.createLineHtml(logLine);
                    }.bind(this));
                    this._channelLog.innerHTML = innerHTML;
                    this.scrollToBottom();

                    this._currentChannel = channel;
                    this._currentChannelLog = channel.channelLog;
                    this._currentChannelLog.oniteminserted = this.onChannelLogItemInserted.bind(this);
                    this._currentChannelLog.onitemremoved = this.onChannelLogItemRemoved.bind(this);

                    // update appbar
                    this.updateAppBar();

                    return WinJS.UI.Animation.enterContent([this._topicTitle, this._channelLog]);
                }.bind(this));
        }
    }, {
        // static members
        Current: null
    });

    WinJS.Namespace.define('Metrica.UI.Pages', {
        Home: Metrica_UI_Pages_Home
    });
})();
