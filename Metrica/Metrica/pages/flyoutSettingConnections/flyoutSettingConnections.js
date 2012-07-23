(function () {
    "use strict";

    WinJS.Namespace.define('Metrica.UI.Page.ConnectionSetting', {
        onBeforeShowHandler: function (event) {
            // setting
            var account = Metrica.Setting.Accounts.getByName('Default');
            if (account == null) {
                account = Metrica.Setting.Accounts.createAccount('Default');
            }

            var template = document.getElementById('settingTemplate').winControl;
            template.render(account).then(function (element) {
                document.querySelector('.win-content').appendChild(element);
            });

            // encodings
            var encodingSelect = document.getElementById('settingServerEncoding');
            WinJS.Utilities.empty(encodingSelect);
            Metrica.Utilities.supportedEncodings.forEach(function (encoding) {
                var encodingOption = document.createElement('option');
                encodingOption.value = encoding;
                encodingOption.textContent = encoding;
                encodingOption.selected = (encoding.toLowerCase() == account.encoding.toLowerCase());
                encodingSelect.appendChild(encodingOption);
            });

            // channels
            var channelsList = document.getElementById('settingChannels');
            WinJS.Utilities.empty(channelsList);
            account.joinChannelsOnConnect.forEach(function (channel) {
                var option = document.createElement('option');
                option.value = channel;
                option.textContent = channel;
                channelsList.appendChild(option);
            });
            document.getElementById('buttonSettingChannelsRemove').addEventListener('click', function (e) {
                // [Remove] remove item from list
                if (channelsList.selectedIndex > -1) {
                    channelsList.removeChild(channelsList.getElementsByTagName('option')[channelsList.selectedIndex]);
                }
                account.joinChannelsOnConnect = Array.prototype.map.call(channelsList.getElementsByTagName('option'), function (option) { return option.value; });
                account.save();
            });
            document.getElementById('buttonSettingChannelsAdd').addEventListener('click', function (e) {
                // [Add] add item to list
                var inputE = document.getElementById('settingJoinChannelNameInput');
                if (inputE.checkValidity() && inputE.value.replace(/^\s*|\s*$/) != '') {
                    var option = document.createElement('option');
                    option.value = inputE.value;
                    option.textContent = inputE.value;
                    channelsList.appendChild(option);

                    account.joinChannelsOnConnect = Array.prototype.map.call(channelsList.getElementsByTagName('option'), function (option) { return option.value; });
                    account.save();
                }
            });

            // bind to event
            function bindInput(query, propertyName) {
                WinJS.Utilities.query(query)
                               .listen('change', function (e) {
                                   account[propertyName] = e.target.value;
                                   account.save();
                               });
            }
            bindInput('.settingServerAddress', 'serverAddress');
            bindInput('.settingNick', 'nick');
            bindInput('.settingServerPort', 'port');
            bindInput('.settingServerPassword', 'password');
            bindInput('.settingUser', 'user');
            bindInput('.settingRealname', 'realname');
            bindInput('#settingServerEncoding', 'encoding');

        }
        , onAfterShowHandler: function (event) {
        }
    });
    Metrica.UI.Page.ConnectionSetting.onBeforeShowHandler.supportedForProcessing = true;
    Metrica.UI.Page.ConnectionSetting.onAfterShowHandler.supportedForProcessing = true;

})();