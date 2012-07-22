(function () {
    "use strict";

    /* ---------- Namespace: Metrica.Utilities ---------- */
    WinJS.Namespace.define("Metrica.Utilities", {
        /// <field name="supportedEncodings" type="Array">サポートしているエンコーディング</field>
        supportedEncodings: {
            get: function () { return ['UTF-8', 'ISO-2022-JP', 'US-ASCII']; }
        },

        classify: function (name) {
            /// <summary>クラス名の形に変換する。(hoge -> Hoge, HAUHAU -> Hauhau)</summary>
            /// <param name="name" type="String">変換する名前</param>
            
            if (name == null) return null;

            var s = "";
            var parts = name.split('_');
            while (parts.length > 0) {
                var part = parts.shift();
                s += part.charAt(0).toUpperCase() + part.substr(1).toLowerCase();
            }
            return s;
        },
        linkify: function (text) {
            /// <summary>テキストのリンクをa要素とimg要素に変換してDocumentFragmentとして返します。</summary>
            /// <param name="text" type="String">テキスト</param>
            /// <returns type="DocumentFragment" />

            var fragment = document.createDocumentFragment();
            var linkRegex = /(https?:\/\/[^ ()'""]+)/g;
            var m, start = 0;
            while (m = linkRegex.exec(text)) {
                fragment.appendChild(document.createTextNode(text.substr(start, linkRegex.lastIndex - m[0].length - start)));

                // 画像置き換え
                var imgElement = document.createElement('img');
                imgElement.alt = m[0];
                imgElement.className = "embedded-thumbnail";
                if (/http:\/\/twitpic.com\/[a-zA-Z0-9_-]+(\?.*)?/.test(m[0])) {
                    imgElement.src = m[0].replace("http://twitpic.com/", "http://twitpic.com/show/mini/");
                } else if (/http:\/\/movapic.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                    imgElement.src = m[0].replace(/http:\/\/movapic.com\/pic\/([a-zA-Z0-9_-]+)/, "http://image.movapic.com/pic/s_$1.jpeg");
                } else if (/http:\/\/yfrog.com\/pic\/[a-zA-Z0-9_-]+/.test(m[0])) {
                    imgElement.src = m[0].replace(/http:\/\/yfrog.com\/([a-zA-Z0-9_-]+)/, "http://yfrog.com/s_$1.th.jpg");
                } else if (/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                    imgElement.src = m[0].replace(/http:\/\/instagr.am\/p\/([a-zA-Z0-9_-]+).*/, "http://instagr.am/p/$1/media/?size=m");
                } else if (/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/.test(m[0])) {
                    imgElement.src = m[0].replace(/http:\/\/gyazo.com\/([a-zA-Z0-9_-]+).*/, "http://cache.gyazo.com/$1.png");
                }

                // a要素を作る
                var aElement = document.createElement('a');
                aElement.href = m[0];
                if (imgElement.src) {
                    aElement.appendChild(imgElement);
                } else {
                    aElement.textContent = m[0];
                }
                fragment.appendChild(aElement);
                start = linkRegex.lastIndex;
            }
            fragment.appendChild(document.createTextNode(text.substr(start)));
            return fragment;
        }
    });

    /* ---------- Namespace: Metrica.Setting ---------- */
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
    WinJS.Binding.define
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
            var iter = container.values.first();

            while (iter.hasCurrent) {
                var accountData = iter.current.value;
                var id = JSON.parse(accountData.id || 'null');
                var account = this.getById(id);
                if (!account) {
                    account = new Metrica.Setting.Account(JSON.parse(accountData.accountName));
                    account.id = id || account.id;
                    this._accounts.push(account);
                }
                account.load();
                iter.moveNext();
            }

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
            //this._deleteAccount(accountName);
        }
    };
    WinJS.Namespace.define("Metrica.Setting", {
        Account: Metrica_Setting_Account,
        Accounts: Metrica_Setting_Accounts
    });
    WinJS.Namespace.define("Metrica.Setting.Accounts", Metrica_Setting_Accounts);
    WinJS.Utilities.ready(function () { Metrica.Setting.Accounts._reload(); });

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
        ['unreadCount', 'isSelected', 'isContainsKeyword', 'isJoined'].forEach(function (type) {
            that.bind(type, function () {
                var className = [];
                if (that.hasUnread) className.push('has-unread');
                if (that.isSelected) className.push('is-selected');
                if (that.isContainsKeyword) className.push('is-contains-keyword');
                if (that.isJoined) className.push('is-joined');
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
        WinJS.Binding.expandProperties({ name: '', unreadCount: 0, isSelected: false, isJoined: false, isContainsKeyword: false, topic: '', htmlClassName: '' })
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
            this._connection.readLineAsync().then(function (line) {
                this.dispatchEvent('messagelinereceived', { line: line });
                console.log(line);
                this._readLineAsync();
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
        this._connection.addEventListener('messagelinereceived', this.onMessageLineReceived.bind(this));
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
        this.addEventListener('receivePrivmsg', this._onReceiveChannelMessage.bind(this));
        this.addEventListener('receiveNotice', this._onReceiveChannelMessage.bind(this));
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

        onMessageLineReceived: function (arg) {
            /// <summary>メッセージを受け取ったイベントのイベントハンドラ</summary>
            //console.log(arg.detail.line);
            var message = Metrica.Net.IrcMessage.createFromLine(arg.detail.line);
            this.processMessage(message);
        },

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
                    content = message.commandParams[1].replace(/\u0003\d+(,\d+)?/, '');
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
})();