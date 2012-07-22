(function () {
    "use strict";

    WinJS.Namespace.define("Metrica.Data.Dummy", {
        channels: new WinJS.Binding.List([
            new Metrica.Data.Channel('#Channel1', 'channel1'),
            new Metrica.Data.Channel('#Channel2', 'channel2'),
        ]),
        channelLogs: {
            '#Channel1': new WinJS.Binding.List([
            ])
        }
    });

})();