(function () {
    "use strict";

    WinJS.Namespace.define("Metrica.Data.Dummy", {
        channels: new WinJS.Binding.List([
            new Metrica.Data.Channel('irc.example.com', 'channel1'),
            new Metrica.Data.Channel('#Channel1', 'channel1'),
            new Metrica.Data.Channel('#Channel2', 'channel2'),
            new Metrica.Data.Channel('#ChannelAAAAAA-AAAAAAAAA-AAAAAAAAAAA', 'channel3'),
            new Metrica.Data.Channel('#Channel4', 'channel4'),
        ]),
        channelLogs: {
            '#Channel1': new WinJS.Binding.List([
            ])
        }
    });

    Metrica.Data.Dummy.channels.getAt(0).isSpecial = true;

})();