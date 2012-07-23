(function () {
    "use strict";

    WinJS.Namespace.define('Metrica.UI.Pages.ChannelMembers', {
        flyout: null
        , onBeforeShowHandler: function (event) {
            Metrica.UI.Pages.ChannelMembers.flyout = this.winControl;

            var homeFragment = document.querySelector('.fragment').parentElement.winControl;
            var membersListView = document.querySelector('#members').winControl;
            if (window.intellisense) membersListView = new WinJS.UI.ListView();
            membersListView.layout = new WinJS.UI.ListLayout();
            membersListView.itemDataSource = homeFragment._currentChannel.members.dataSource;
            membersListView.itemTemplate = document.querySelector('#templateMembersListViewItem');
        }
        , onAfterShowHandler: function (event) {
        }
    });
    Metrica.UI.Pages.ChannelMembers.onBeforeShowHandler.supportedForProcessing = true;
    Metrica.UI.Pages.ChannelMembers.onAfterShowHandler.supportedForProcessing = true;

})();