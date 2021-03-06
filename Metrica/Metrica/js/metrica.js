﻿/// <reference path="metrica.utilities.js" />
(function () {
    "use strict";

    /* ---------- Namespace: Metrica.Setting ---------- */
    var Metrica_Setting_Keyword = WinJS.Class.define(function (keyword, useRegex) {
        /// <summary>キーワードを扱うクラスです。</summary>
        this._matcher = null;

        this._keyword = keyword;
        this._useRegex = !!useRegex;
        this._updateMatcher();
    }, {
        /// <field name="useRegex" type="Boolean">正規表現を利用するかどうかを取得・設定します。</field>
        useRegex: {
            get: function () { return this._useRegex; },
            set: function (value) {
                this._useRegex = value;
                this._updateMatcher();
            }
        },
        /// <field name="matcher" type="RegExp">マッチさせるための正規表現を取得します。</field>
        matcher: {
            get: function () { return this._matcher; }
        },
        /// <field name="keyword" type="String">キーワードを取得・設定します。</field>
        keyword: {
            get: function () { return this._keyword; },
            set: function (value) {
                this._keyword = value;
                this._updateMatcher();
            }
        },

        toPlainObject: function () {
            return {
                keyword: this._keyword,
                useRegex: this._useRegex
            }
        },

        _updateMatcher: function () {
            /// <summary>matcherを更新します。</summary>
            this._matcher = new RegExp(
                ((this.useRegex) ? this._keyword
                                 : this._keyword.replace(/([/.*+?|()\[\]{}\\^$])/g, "\\$1"))
            , 'i');
        }
    });

    var Metrica_Setting_Keywords = WinJS.Class.define(function () { }, {}, {
        _keywords: [ ],

        load: function () {
            /// <summary>設定を読み込みます。</summary>
            var rootContainer = Windows.Storage.ApplicationData.current.localSettings;
            var container = rootContainer.createContainer('Keywords', Windows.Storage.ApplicationDataCreateDisposition.always);
            this._keywords = [];
            try {
                JSON.parse(container.values.lookup('entries') || '[]').forEach(function (entry) {
                    this._keywords.push(new Metrica.Setting.Keyword(entry.keyword, entry.useRegex));
                }.bind(this));
            } catch (e) { /* TODO: logging */ }
        },

        save: function () {
            /// <summary>設定を保存します。</summary>
            var rootContainer = Windows.Storage.ApplicationData.current.localSettings;
            var container = rootContainer.createContainer('Keywords', Windows.Storage.ApplicationDataCreateDisposition.always);
            container.values['entries'] = JSON.stringify(this._keywords.map(function (keyword) { return keyword.toPlainObject(); }));
            Windows.Storage.ApplicationData.current.signalDataChanged();
        },

        add: function (keyword) {
            /// <summary>キーワード設定を追加します。</summary>
            /// <param name="keyword" type="Metrica.Setting.Keyword">キーワード設定</param>
            this._keywords.push(keyword);
            this.save();
        },

        remove: function (targetKeyword) {
            /// <summary>キーワード設定を削除します。</summary>
            /// <param name="targetKeyword" type="Metrica.Setting.Keyword">削除するキーワード設定</param>
            this._keywords = this._keywords.filter(function (keyword) { return !(keyword.toString() == targetKeyword.toString() && keyword.useRegex == targetKeyword.useRegex); });
            this.save();
        },

        getAll: function () {
            /// <summary>すべてのキーワードを取得します。</summary>
            /// <returns type="Array" />
            return this._keywords;
        },

        isMatch: function (text) {
            /// <summary>キーワードのいずれかにマッチするかどうかを返します。</summary>
            /// <param name="text" type="String">マッチするかテストする対象のテキスト。</param>
            /// <returns type="Boolean" />

            return this._keywords.some(function (keyword) { return keyword.matcher.test(text); });
        }
    });

    var Metrica_Setting_Account = WinJS.Class.define(function (accountName) {
        /// <summary>アカウント情報を扱うクラス。作成するには Metrica.Setting.Accounts.createAccount メソッドを利用してください。</summary>
        /// <param name="accountName" type="String">アカウント名</param>
        this._initObservable();

        this.id = btoa(new Date().valueOf() + '' + Math.random());
        this.accountName = accountName;
        this.serverAddress = "";
        this.port = 6667;
        this.encoding = "UTF-8";
        this.nick = "";
        this.username = "metrica";
        this.realname = "";
        this.password = "";
        this.joinChannelsOnConnect = [];

        this.bind('encoding', function (newValue, currentValue) {
            if (Metrica.Utilities.supportedEncodings.indexOf(newValue) == -1) {
                return WinJS.Promise.wrapError("Not Supported Encoding: '" + newValue + "'");
            }
        });

        return this;
    }, {
        // instance methods
        toPlainObject: function () {
            return {
                id: this.id,
                accountName: this.accountName,
                serverAddress: this.serverAddress,
                port: this.port,
                encoding: this.encoding,
                nick: this.nick,
                username: this.username,
                realname: this.realname,
                password: this.password,
                joinChannelsOnConnect: this.joinChannelsOnConnect
            };
        },

        isValid: {
            get: function () {
                return !!(this.serverAddress && this.port && this.nick && this.encoding);
            }
        },

        save: function () {
            /// <summary>アカウント情報を保存します。</summary>
            var rootContainer = Windows.Storage.ApplicationData.current.localSettings;
            var container = rootContainer.createContainer('Accounts', Windows.Storage.ApplicationDataCreateDisposition.always);
            var accountData = this.toPlainObject();
            var data = new Windows.Storage.ApplicationDataCompositeValue();
            Object.keys(accountData).forEach(function (key) {
                data[key] = JSON.stringify(accountData[key]);
            });
            container.values[accountData.id] = data;
            Windows.Storage.ApplicationData.current.signalDataChanged();
        },

        load: function () {
            /// <summary>アカウント情報を読み込みます。</summary>
            var rootContainer = Windows.Storage.ApplicationData.current.localSettings;
            var container = rootContainer.createContainer('Accounts', Windows.Storage.ApplicationDataCreateDisposition.always);
            var accountData = container.values[this.id];
            var that = this;
            Object.keys(accountData).forEach(function (key) {
                that[key] = JSON.parse(accountData[key]);
            });
        }
    });
    WinJS.Class.mix(Metrica_Setting_Account,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties({ accountName: '', serverAddress: '', port: 0, encoding: '', nick: '', username: '', realname: '', password: '' })
    );

    var Metrica_Setting_Accounts = {
        _accounts: new WinJS.Binding.List(),
        _prepareContainer: function () {
            var rootContainer = Windows.Storage.ApplicationData.current.localSettings;
            var container = rootContainer.createContainer('Accounts', Windows.Storage.ApplicationDataCreateDisposition.always);
            return container;
        },
        _saveAccount: function (name) {
            this.getByName(name).save();
        },
        _reload: function () {
            var container = this._prepareContainer();

            Metrica.Utilities.forEachWinRTObject(container.values, function (keyValue) {
                var accountData = keyValue.value;
                var id = JSON.parse(accountData.id || 'null');
                var account = this.getById(id);
                if (!account) {
                    account = new Metrica.Setting.Account(JSON.parse(accountData.accountName));
                    account.id = id || account.id;
                    this._accounts.push(account);
                }
                account.load();
            }.bind(this));
        },

        asBindingList: function () {
            /// <summary>バインディングデータを取得します。</summary>
            return this._accounts;
        },
        getByName: function (accountName) {
            /// <summary>指定した名前のアカウントを取得します。</summary>
            return this._accounts.filter(function (account) { return account.accountName == accountName; })[0];
        },
        getById: function (id) {
            /// <summary>指定したIDのアカウントを取得します。</summary>
            return this._accounts.filter(function (account) { return account.id == id; })[0];
        },
        getAt: function (index) {
            /// <summary>指定したインデックスのアカウントを取得します。</summary>
            return this._accounts.getAt(index);
        },
        getAll: function () {
            /// <summary>すべてのアカウントを取得します。</summary>
            return this._accounts.map(function (e) { return e; });
        },
        /// <field name="count" type="Number">すべてのアカウントを取得します。</field>
        count: {
            get: function () { return this._accounts.length; }
        },
        clear: function () {
            /// <summary>すべてのアカウントを削除します。</summary>
            this._accounts.splice(0, this._accounts.length);
        },
        createAccount: function (accountName) {
            /// <summary>アカウントを追加します。</summary>
            /// <returns type="Metrica.Data.Account" />

            if (this.getByName(accountName)) throw "The account name already exists";

            var account = new Metrica.Setting.Account(accountName);
            this._accounts.push(account);

            this._saveAccount(accountName);
            return account;
        },
        deleteAccount: function (accountName) {
            /// <summary>アカウントを削除します。</summary>
            var account = this.getByName(accountName);
            var index = this._accounts.indexOf(account);
            this._accounts.splice(index, 1);
            // TODO: 削除
            //this._deleteAccount(accountName);
        }
    };
    WinJS.Namespace.define("Metrica.Setting", {
        Account: Metrica_Setting_Account,
        Accounts: Metrica_Setting_Accounts,
        Keyword: Metrica_Setting_Keyword,
        Keywords: Metrica_Setting_Keywords
    });
    WinJS.Namespace.define("Metrica.Setting.Accounts", Metrica_Setting_Accounts);
    WinJS.Utilities.ready(function () {
        Metrica.Setting.Accounts._reload();
        Metrica.Setting.Keywords.load();
    });


    /* ---------- Namespace: Metrica.Data ---------- */
    var Metrica_Data_Channel = WinJS.Class.define(function (id, topic, name) {
        this._initObservable();
        this.id = id;
        this.name = name || id;
        this.topic = topic || '';
        this.unreadCount = 0;
        this.isSelected = false;
        this.isSpecial = false;
        this.channelLog = new WinJS.Binding.List();
        this.members = new WinJS.Binding.List();

        var that = this;
        that.bind('unreadCount', function () {
            that.notify('hasUnread');
        });
        ['unreadCount', 'isSelected', 'isContainsKeyword', 'isJoined', 'isSpecial'].forEach(function (type) {
            that.bind(type, function () {
                var className = [];
                if (that.hasUnread) className.push('has-unread');
                if (that.isSelected) className.push('is-selected');
                if (that.isContainsKeyword) className.push('is-contains-keyword');
                if (that.isJoined) className.push('is-joined');
                if (that.isSpecial) className.push('is-special');
                that.htmlClassName = className.join(' ');
            });
        });

        return this;
    }, {
        // instance members
        /// <field name="name" type="String">チャンネル名・ユーザー名など一意の値を取得します</field>
        id: '',
        /// <field name="displayName" type="String">表示名を取得します</field>
        name: '',
        /// <field name="unreadCount" type="Number">未読数を取得・設定します。</field>
        unreadCount: 0,
        /// <field name="hasUnread" type="Boolean">接続を取得します。</field>
        hasUnread: { get: function () { return this.unreadCount != 0; } },
        /// <field name="isSelected" type="Boolean">選択状態を取得・設定します。</field>
        isSelected: false,
        /// <field name="isJoined" type="Boolean">JOINの状態を取得・設定します。</field>
        isJoined: false,
        /// <field name="isContainsKeyword" type="Boolean">キーワードを含むかどうかを取得・設定します。</field>
        isContainsKeyword: false,
        /// <field name="isSpecial" type="Boolean">チャンネルではない特別なものかどうかを取得・設定します。</field>
        isSpecial: false, // TODO: 別なクラスにしたほうがよい
        /// <field name="topic" type="Metrica.Net.Connection">トピックを取得・設定します。</field>
        topic: '',
        /// <field name="channelLog" type="Metrica.Net.Connection">チャンネルログのリストを取得・設定します。</field>
        channelLog: null,
        /// <field name="htmlClassName" type="String">HTMLのクラス名を取得します。</field>
        htmlClassName: '',

        getMemberByNick: function (nick) {
            /// <summary>指定したニックネームのメンバーを取得します。</summary>
            /// <param name="nick" type="String">ニックネーム</param>
            /// <returns type="Metrica.Data.Member" />
            nick = nick.toLowerCase();
            var member = this.members.filter(function (member) { return member.nick.toLowerCase() == nick; })[0];
            return member;
        },
        removeMemberByNick: function (nick) {
            /// <summary>指定したニックネームのメンバーを削除します。</summary>
            /// <param name="nick" type="String">ニックネーム</param>
            var member = this.getMemberByNick(nick);
            if (member != null) {
                var index = this.members.indexOf(member);
                this.members.splice(index, 1);
            }
        },
        addMember: function (nick, isOperator) {
            /// <summary>指定したニックネームのメンバーを追加します。</summary>
            /// <param name="nick" type="String">ニックネーム</param>
            var member = this.getMemberByNick(nick);
            if (member == null) {
                member = new Metrica.Data.Member(nick, isOperator);
                this.members.push(member);
            }
            return member;
        }
    }, {
        // static members
    });
    WinJS.Class.mix(Metrica_Data_Channel,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties({ name: '', unreadCount: 0, isSelected: false, isJoined: false, isSpecial: false, isContainsKeyword: false, topic: '', htmlClassName: '' })
    );

    var Metrica_Data_Member = WinJS.Class.define(function (nick, isOperator) {
        /// <summary>チャンネルのメンバーを扱うクラスです。</summary>
        /// <param name="nick" type="String">ニックネーム</param>
        /// <param name="isOperator" type="Boolean">オペレータ権限を持っているかどうか</param>
        /// <field name="nick" type="String">ニックネーム</field>
        /// <field name="isOperator" type="Boolean">オペレータ権限を持っているかどうかを設定・取得します</field>
        this._initObservable();
        this.nick = nick;
        this.isOperator = isOperator || false;

        return WinJS.Binding.as(this);
    }, {
    });
    WinJS.Class.mix(Metrica_Data_Member,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties({ nick: '', isOperator: false })
    );
    WinJS.Namespace.define("Metrica.Data", {
        Channel: Metrica_Data_Channel,
        Member: Metrica_Data_Member
    });

    /* ---------- Namespace: Metrica.Net ---------- */
    var Metrica_Net_Connection = WinJS.Class.define(function (account) {
        /// <summary>サーバーへの接続を扱うクラスです。</summary>
        /// <param name="account" type="Metrica.Setting.Account">接続情報を含むアカウント情報</param>

        this._account = account;
        this._isConnected = false;
        this._connection = null;

        this.addEventListener('connected', function (e) { if (this.onconnected) { this.onconnected(e); } }.bind(this));
        this.addEventListener('disconnected', function (e) { if (this.ondisconnected) { this.ondisconnected(e); } }.bind(this));
        this.addEventListener('messagelinereceived', function (e) { if (this.onmessagelinereceived) { this.onmessagelinereceived(e); } }.bind(this));
        this.addEventListener('beforemessagesend', function (e) { if (this.onbeforemessagesend) { this.onbeforemessagesend(e); } }.bind(this));
    }, {
        // instance methods
        _readLineAsync: function () {
            this._connection.readLineAsync()
                .then(function (line) {
                    // onreceived
                    this.dispatchEvent('messagelinereceived', { line: line });
                    //console.log(line);
                    this._readLineAsync();
                }.bind(this), function (error) {
                    // 読み取りエラー(回線切断など)
                    this.disconnectAsync(); // 切断
                    return WinJS.Promise.wrapError(error);
                }.bind(this));
        },
        _sendUserAndPassword: function () {
            /// <summary>サーバーへユーザー情報を送信します。</summary>
            /// <returns type="WinJS.Promise" />
            var conn = this._connection;
            var account = this._account;
            return conn.writeLineAsync("USER " + account.username + " * * :" + (account.realname || 'Metrica User'))
                       .then(function () { return (account.password ? conn.writeLineAsync("PASS :" + account.password) : WinJS.Promise.wrap(conn)); })
                       .then(function () { return conn.writeLineAsync("NICK " + account.nick); })
            ;
        },

        connectAsync: function () {
            /// <summary>サーバーへ接続します。</summary>
            /// <returns type="WinJS.Promise" />
            var conn = this._connection = new MetricaConnectionHelper.Connection(this._account.serverAddress, this._account.port, this._account.encoding);
            return conn.connectAsync()
                        .then(
                            function complete() {
                                this._isConnected = true;

                                // Start readlines
                                this._readLineAsync();

                                // Send user and password + nick
                                return this._sendUserAndPassword();
                            }.bind(this),
                            function error(e) {
                                return WinJS.Promise.wrapError(e);
                            }.bind(this)
                        )
                        .then(function () {
                            this.dispatchEvent('connected', { });
                        }.bind(this));
        },

        disconnectAsync: function (force) {
            /// <summary>サーバーから切断します。</summary>
            /// <param name="force" type="Boolean">強制切断するかどうかを指定します。</param>
            /// <returns type="WinJS.Promise" />
            this._connection.disconnect();
            this._isConnected = false;
            return WinJS.Promise.wrap(this);
        },

        sendLineAsync: function (line) {
            /// <summary>一行を送信します。</summary>
            /// <param name="line" type="String">送信するテキスト。</param>
            /// <returns type="WinJS.Promise" />
            return this._connection.writeLineAsync(line);
        },

        /// <field name="isConnected" type="Boolean">サーバーに接続しているかどうかを取得します。</field>
        isConnected: {
            get: function () { return this._isConnected; },
        },

        /// <field name="onconnected" type="Function">接続したときのイベント。</field>
        onconnected: null,

        /// <field name="ondisconnected" type="Function">切断したときのイベント。</field>
        ondisconnected: null,

        /// <field name="onmessagelinereceived" type="Function">メッセージを受信したときのイベント。</field>
        onmessagelinereceived: null,

        /// <field name="onbeforemessagesend" type="Function">メッセージを送信する前のイベント。</field>
        onbeforemessagesend: null
    });

    var Metrica_Net_IrcMessage = WinJS.Class.define(function (command, commandParams) {
        this._prefix = '';
        this._sender = '';
        this._senderNick = '';
        this._senderHost = '';
        this._command = command.toUpperCase();
        this._commandParams = commandParams || [];
    }, {
        // instance members
        _setPrefix: function () {
            if (this._senderNick == '') {
                this._prefix = '';
            } else if (this._senderHost == '') {
                this._prefix = this._senderNick;
            } else {
                this._prefix = this._senderNick + '!' + this._senderHost;
            }
        },

        sender: {
            get: function () { return this._sender; },
            set: function (value) {
                var match = value.match(/(.+?)!(.+)/);
                if (match) {
                    this._senderNick = match[1];
                    this._senderHost = match[2];
                } else {
                    this._senderHost = '';
                    this._senderNick = value;
                }
                this._sender = value;
                this._setPrefix();
            }
        },
        senderHost: {
            get: function () { return this._senderHost; },
            set: function (value) { this._senderHost = value; this._setPrefix(); }
        },
        senderNick: {
            get: function () { return this._senderNick; },
            set: function (value) { this._senderNick = value; this._setPrefix(); }
        },
        prefix: {
            get: function () { return this._prefix; },
            set: function (value) { this.sender = value; }
        },
        isServerMessage: {
            get: function () { return !(this.prefix.length == 0); }
        },
        command: {
            get: function () { return this._command; }
        },
        commandParams: {
            get: function () { return this._commandParams; }
        },
        commandParam: {
            get: function () {
                return (this._commandParams.length > 1) ? this._commandParams.slice(0, this._commandParams.length - 1).join(' ') + ' :' + this._commandParams.slice(this._commandParams.length - 1).join('')
                                                        : this._commandParams[0] || '';
            },
            set: function (value) {
                value = value || '';
                this._commandParams = [];
                var params = value.split(/ /, 15);
                var param;
                while (param = params.shift()) {
                    if (param[0] == ':') {
                        params.unshift(param.substr(1)); // 先頭に差し込む
                        this._commandParams.push(params.join(' '));
                        break;
                    } else {
                        this._commandParams.push(param);
                    }
                }
            }
        },
        rawMessage: {
            get: function () {
                var parts = [];
                if (this.prefix.length != 0) {
                    parts.push(":" + this.prefix);
                }
                parts.push(this.command);
                if (this.commandParam.length > 0) {
                    parts.push(this.commandParam);
                }
                return parts.join(' ');
            }
        }
    }, {
        // static members
        createFromLine: function (line) {
            var newMessage;
            var parts;
            if (parts = line.match(/^:(.*?)(?:[ ]+(.*?))(?:[ ]+(.*?))?$/)) {
                var parts = line.match(/^:(.*?)(?:[ ]+(.*?))?(?:[ ]+(.*?))?$/);
                newMessage = new Metrica.Net.IrcMessage(parts[2]);
                newMessage.prefix = parts[1];
                newMessage.commandParam = parts[3] || '';
            } else if (parts = line.match(/^(.+?)(?:[ ]+(.*?))?$/)) {
                newMessage = new Metrica.Net.IrcMessage(parts[1]);
                newMessage.commandParam = parts[2] || '';
            } else {
                // TODO: Invalid Message
                return new Metrica.Net.IrcMessage('INVALIDMESSAGE', [ line ]);
            }
            return newMessage;
        }
    });

    var Metrica_Net_Session = WinJS.Class.define(function (account) {
        /// <summary>接続や状態を管理するクラスです。</summary>
        /// <param name="account" type="Metrica.Setting.Account">接続先アカウント情報</param>
        this._account = account;
        this._connection = new Metrica.Net.Connection(account);
        this._connection.addEventListener('messagelinereceived', this._onMessageLineReceived.bind(this));
        this._currentNick = this._account.nick;
        this._serverChannel = new Metrica.Data.Channel('\u0000_' + this._account.id, '', this._account.serverAddress /* this._account.accountName */);
        this._serverChannel.isSpecial = true;
        this._channels = new WinJS.Binding.List([ this._serverChannel ]);
        this._sortedChannels = this._channels.createSorted(function (a, b) {
            var aN = a.id.toLowerCase(),
                bN = b.id.toLowerCase();
            return aN > bN ? 1 : aN == bN ? 0 : -1;
        });

        this.addEventListener('receiveQuit', this._onReceiveQuit.bind(this));
        this.addEventListener('receiveNick', this._onReceiveNick.bind(this));
        this.addEventListener('receivePing', this._onReceivePing.bind(this));
        ['001', '002', '003', '004', '005', '250', '251', '252', '253', '254', '255', '265', '266', '372', '375', '376'].forEach(function (num) {
            this.addEventListener('receive' + num, this._onReceiveServerMessage.bind(this));
        }.bind(this));

        // Channel Message
        this.addEventListener('receive353', this._onReceive353.bind(this)); // NAMES
        this.addEventListener('receive332', this._onReceive332.bind(this)); // TOPIC 
        this.addEventListener('receiveTopic', this._onReceiveTopic.bind(this)); // TOPIC 
        this.addEventListener('receiveJoin', this._onReceiveJoin.bind(this));
        this.addEventListener('receivePart', this._onReceivePart.bind(this));
        this.addEventListener('receivePrivmsg', this._onReceivePrivmsg.bind(this));
        this.addEventListener('receivePrivmsg', this._onReceiveChannelMessage.bind(this));
        this.addEventListener('receiveNotice', this._onReceiveChannelMessage.bind(this));

        // events
        this.addEventListener('keywordmatched', function (args) { if (this.onkeywordmatched) this.onkeywordmatched(args); }.bind(this));

        // extension
        new Metrica.Extension.ToastNotification(this);

    }, {
        // instance members
        /// <field name="connection" type="Metrica.Net.Connection">接続を取得します。</field>
        connection: {
            get: function () { return this._connection; },
        },

        /// <field name="channels" type="WinJS.Binding.List">チャンネルを保持するリストを返します。</field>
        channels: {
            get: function () { return this._channels; }
        },

        /// <field name="channels" type="WinJS.Binding.List">ソートされたチャンネルを保持するリストを返します。</field>
        sortedChannels: {
            get: function () { return this._sortedChannels; }
        },

        /// <field name="currentNick" type="String">現在のニックネームを返します。</field>
        currentNick: {
            get: function () { return this._currentNick; }
        },

        /// <field name="onkeywordmatched" type="Function">キーワードにマッチしたときに呼び出されるコールバック。</field>
        onkeywordmatched: null,

        getKnownMemberByNick: function (nick) {
            /// <summary>接続しているサーバーで把握しているユーザーをニックネームで取得します。</summary>
            nick = nick.toLowerCase();
            var member = this._knownMembers.filter(function (member) { return member.nick.toLowerCase() == nick; })[0];
            return member;
        },

        getChannel: function (channelName, fetchOnly) {
            /// <summary>チャンネルを取得します。</summary>
            /// <returns type="Metrica.Data.Channel" />
            var channelNameLower = channelName.toLowerCase();
            var channel = this._channels.filter(function (c) { return c.name.toLowerCase() == channelNameLower; })[0];
            if (!fetchOnly && channel == null) {
                channel = new Metrica.Data.Channel(channelName);
                this._channels.push(channel);
            }
            return channel;
        },

        sendMessage: function (message) {
            /// <summary>メッセージを送信します。</summary>
            /// <param name="message" type="Metrica.Net.IrcMessage">IRCメッセージ</param>
            this._connection.sendLineAsync(message.rawMessage).done();
            this.processMessage(message);
        },

        processMessage: function (message) {
            /// <summary>メッセージを処理します。</summary>
            /// <param name="message" type="Metrica.Net.IrcMessage">IRCメッセージ</param>
            var eventName = "receive" + Metrica.Utilities.classify(message.command);
            this.dispatchEvent(eventName, message);
        },

        _onMessageLineReceived: function (arg) {
            /// <summary>メッセージを受け取ったイベントのイベントハンドラ</summary>
            //console.log(arg.detail.line);
            var message = Metrica.Net.IrcMessage.createFromLine(arg.detail.line);
            this.processMessage(message);
        },

        _onReceiveNick: function (args) {
            // サーバーから来たNICKだけ処理する
            if (args.detail.isServerMessage) {
                // JOINしているチャンネルにのみながす
                this.channels.forEach(function (channel) {
                    var member = channel.getMemberByNick(args.detail.senderNick);
                    if (member != null) {
                        this._appendToChannelLog(channel, args.detail);
                    }
                }.bind(this));

                // NICK (self)
                if (args.detail.senderNick.toLowerCase() == this.currentNick.toLowerCase()) {
                    this._currentNick = args.detail.senderNick;
                }
            }
        },
        _onReceiveQuit: function (args) {
            this.channels.forEach(function (channel) {
                // 対象ユーザーがJOINしているチャンネルに通知を流してメンバーから削除する
                var member = channel.getMemberByNick(args.detail.senderNick);
                if (member != null) {
                    this._appendToChannelLog(channel, args.detail);
                    channel.removeMemberByNick(args.detail.senderNick);
                }
            }.bind(this));
        },
        _onReceiveJoin: function (args) {
            var channel = this.getChannel(args.detail.commandParams[0]);
            channel.isJoined = true;
            this._appendToChannelLog(channel, args.detail);
            channel.addMember(args.detail.senderNick);
        },
        _onReceivePart: function (args) {
            var channel = this.getChannel(args.detail.commandParams[0]);
            var member = channel.getMemberByNick(args.detail.senderNick);
            if (member != null) {
                this._appendToChannelLog(channel, args.detail);
                channel.removeMemberByNick(args.detail.senderNick);
            }
        },
        _onReceive353: function (args) {
            // NAMES List Replies
            var channel = this.getChannel(args.detail.commandParams[2]); // [sender, channel, users...]
            args.detail.commandParams[3].split(' ').forEach(function (memberNick) {
                var matches = memberNick.match(/(@)?(.*)/);
                channel.addMember(matches[2], matches[1] == '@');
            }.bind(this));
        },
        _onReceive332: function (args) {
            if (!args.detail.isServerMessage) return;
            var channel = this.getChannel(args.detail.commandParams[1]); // [setter, channel, topic]
            channel.topic = args.detail.commandParams[2];
            this._appendToChannelLog(channel, args.detail);
        },
        _onReceiveTopic: function (args) {
            if (!args.detail.isServerMessage) return;
            var channel = this.getChannel(args.detail.commandParams[0]); // [channel, topic]
            channel.topic = args.detail.commandParams[1];
            this._appendToChannelLog(channel, args.detail);
        },
        _onReceivePing: function (args) {
            this.sendMessage(new Metrica.Net.IrcMessage("PONG", [args.detail.commandParams[0]])); // [serverName]
        },
        _onReceivePrivmsg: function (args) {
            var channel = this.getChannel(args.detail.commandParams[0], true);
            var text = Metrica.Utilities.removeFormatCodes(args.detail.commandParams[1]);

            // キーワードチェック
            if (Metrica.Setting.Keywords.isMatch(text)) {
                this.dispatchEvent('keywordmatched', { channel:channel, text:text, message:args.detail });
            }
        },
        _onReceiveChannelMessage: function (args) {
            var channel = this.getChannel(args.detail.commandParams[0], true);
            if (channel == null) {
                // :irc.example.com NOTICE * ....
                channel = this._serverChannel;
            }
            this._appendToChannelLog(channel, args.detail);
        },
        _onReceiveServerMessage: function (args) {
            this._appendToChannelLog(this._serverChannel, args.detail);
        },
        _appendToChannelLog: function (channel, message) {
            /// <param name="channel" type="Metrica.Data.Channel">チャンネル</param>
            /// <param name="message" type="Metrica.Net.IrcMessage">IRCメッセージ</param>

            // Unread
            if (message.command == 'PRIVMSG' && !channel.isSelected) {
                channel.unreadCount++;
            }

            // content
            var content = "";
            switch (message.command) {
                case 'PRIVMSG':
                case 'NOTICE':
                    content = Metrica.Utilities.removeFormatCodes(message.commandParams[1]);
                    break;
                case 'NICK':
                    content = "Nick " + message.senderNick + " -> " + message.commandParams[0];
                    break;
                case 'JOIN':
                    content = message.senderNick + " Join (" + message.sender + ")";
                    break;
                case 'PART':
                    content = message.senderNick + " Part (" + message.commandParams[0] + ")";
                    break;
                case 'QUIT':
                    content = message.senderNick + " Quit (" + message.commandParams[0] + ")";
                    break;
                case 'TOPIC':
                    content = "Topic: " + message.commandParams[1];
                    break;
                case '332':
                    content = "Topic: " + message.commandParams[2];
                    break;

                // server numeric reply
                case '001':
                case '002':
                case '003':
                case '004':
                case '005':
                case '250':
                case '251':
                case '252':
                case '253':
                case '254':
                case '255':
                case '265':
                case '266':
                case '372':
                case '375':
                case '376':
                    content = message.commandParams[1];
                    break;
            }
            
            // Channel Log
            channel.channelLog.push({
                time    : new Date(),
                nick    : (message.isServerMessage ? message.senderNick : this.currentNick), // サーバーから来たメッセージであればそのニックネームを、そうでなければ現在の自分のニックを。
                message : content,
                type    : message.command
            });
            if (channel.channelLog.length > 200) {
                channel.channelLog.shift();
            }
        }
    });

    WinJS.Class.mix(Metrica_Net_Connection, WinJS.Utilities.eventMixin);
    WinJS.Class.mix(Metrica_Net_Session, WinJS.Utilities.eventMixin);
    WinJS.Namespace.define("Metrica.Net", {
        Connection: Metrica_Net_Connection,
        IrcMessage: Metrica_Net_IrcMessage,
        Session: Metrica_Net_Session,
        CurrentSessions: {}
    });

    /* ---------- Namespace: Metrica.Converter ---------- */
    WinJS.Namespace.define('Metrica.Converter', {
        valueToString: WinJS.Binding.converter(function (data) { return data.toString(); }),
    }, {
        supportedForProcessing: true
    });


    /* ---------- Namespace: Metrica.Extension ---------- */
    var Metrica_Extension_ToastNotification = WinJS.Class.define(function (session) {
        /// <summary>トースト通知をするクラス</summary>
        /// <param name="session" type="Metrica.Net.Session">セッション</param>

        this._session = session;
        this._session.addEventListener('keywordmatched', this._onKeywordMatched.bind(this));
    }, {
        // instance members
        dispose: function () {
            /// <summary>処理を行うのをやめて状態を破棄します。</summary>
            this._session.removeEventListener('keywordmatched', this._onKeywordMatched.bind(this));
            this._session = null;
        },
        _onKeywordMatched: function (args) {
            var channel = args.detail.channel;
            var message = args.detail.message;

            // キーワードチェック
            this.notify((channel ? channel.name + ": " : '') + args.detail.message.senderNick, args.detail.text, channel);
        },
        notify: function (title, body, channel) {
            // Toast Notification
            var notificationManager = Windows.UI.Notifications.ToastNotificationManager;
            var toastTemplate = Windows.UI.Notifications.ToastTemplateType.toastText02;
            var toastXml = notificationManager.getTemplateContent(toastTemplate);

            toastXml.getElementsByTagName('text')[0].appendChild(toastXml.createTextNode(title));
            toastXml.getElementsByTagName('text')[1].appendChild(toastXml.createTextNode(body));

            //var audioE = toastXml.createElement('audio');
            //audioE.setAttribute('src', 'ms-winsoundevent:Notification.IM');
            //toastXml.documentElement.appendChild(audioE);

            var toast = new Windows.UI.Notifications.ToastNotification(toastXml);

            if (channel) {
                toast.onactivated = function () {
                    Metrica.UI.Pages.Home.Current.selectChannel(channel);
                }.bind(this);
            }

            notificationManager.createToastNotifier().show(toast);
        }
    });
    WinJS.Namespace.define('Metrica.Extension', {
        ToastNotification: Metrica_Extension_ToastNotification
    });

})();