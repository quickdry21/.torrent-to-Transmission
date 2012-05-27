var TAGNO = 12345;

if (localStorage.getItem("rpc_version") == 14) {
    var TR_STATUS_STOPPED = 0;
    var TR_STATUS_CHECK_WAIT = 1;
    var TR_STATUS_CHECK = 2;
    var TR_STATUS_DOWNLOAD_WAIT = 3;
    var TR_STATUS_DOWNLOAD = 4;
    var TR_STATUS_SEED_WAIT = 5;
    var TR_STATUS_SEED = 6;
}
else {
    var TR_STATUS_STOPPED = 16;
    var TR_STATUS_CHECK_WAIT = 1;
    var TR_STATUS_CHECK = 2;
    var TR_STATUS_DOWNLOAD_WAIT = 4;
    var TR_STATUS_DOWNLOAD = 4;
    var TR_STATUS_SEED_WAIT = 8;
    var TR_STATUS_SEED = 8;
}
function rpc_request(json, callback, url, user, pass) {
    var req = new XMLHttpRequest();
    
    if (typeof url == "undefined")
        url = localStorage.rpcURL;
    if (typeof user == "undefined")
        user = localStorage.rpcUser;
    if (typeof pass == "undefined")
        pass = localStorage.rpcPass;

    req.open("POST", url, true, user, pass);
    req.setRequestHeader("X-Transmission-Session-Id", localStorage.sessionId);
    req.setRequestHeader("Content-Type", "application/json");

    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.getResponseHeader("X-Transmission-Session-Id")) {
                localStorage.sessionId = req.getResponseHeader("X-Transmission-Session-Id");
                return rpc_request(json, callback, url, user, pass);
            }
            if (typeof callback != "undefined")
                callback(req);
            localStorage.setItem("lastStatus", req.status);
        }
    };
    req.send(json);
}

function add_torrent(info, tab) {
    var json = JSON.stringify({
        "method": "torrent-add",
        "arguments": {
            "filename": info.linkUrl,
            "paused": false
        },
        "tag": TAGNO
    });

    if (!JSON.parse(localStorage.displayNotification))
        return;

    rpc_request(json, function(req) {
        try {
            var rv = JSON.parse(req.responseText);
            if (rv["result"] == "success")
                showNotification("torrent started", rv["arguments"]["torrent-added"]["name"]);
            else
                showNotification("failed to start torrent", rv["result"]);
        } catch (err) {
            
        }
    });
}

function update_torrents() {
    var json = JSON.stringify({
        "method": "torrent-get",
        "arguments": {
            "fields": [
                "id",
                "name",
                "status",
                "leftUntilDone",
                "percentDone",
                "rateDownload",
                "rateUpload",
                "peersConnected",
                "peersGettingFromUs",
                "peersSendingToUs",
                "recheckProgress"
            ]
        },
        "tag": TAGNO
    });

    rpc_request(json, function(req) {
        var torrents = JSON.parse(localStorage.getItem("torrents"));
        var remTorrents = { };
        
        try {
            var rv = JSON.parse(req.responseText);
        } catch (err) {
            return;
        }        
        
        for (var i = 0; i < rv.arguments.torrents.length; i++) {
            var torrent = rv.arguments.torrents[i];
            var lastStatus = torrent.status;

            if (torrent.id in torrents)
                lastStatus = torrents[torrent.id].status;

            if (torrent.status != lastStatus) {
                switch (torrent.status) {
                    case TR_STATUS_CHECK_WAIT:  // queued to check files
                        break;
                    case TR_STATUS_CHECK:  // checking files
                        break;
                    case TR_STATUS_DOWNLOAD:  // downloading
                        break;
                    case TR_STATUS_DOWNLOAD_WAIT:  // queued
                        break;
                    case TR_STATUS_SEED_WAIT: // queued to seed
                    case TR_STATUS_SEED:  // seeding
                    case TR_STATUS_STOPPED: // stopped
                        if (lastStatus == TR_STATUS_DOWNLOAD && torrent.leftUntilDone == 0)
                            showNotification("torrent complete", torrent.name);
                        break;
                    default:
                        break;
                }
            }
            remTorrents[torrent.id] = torrent;
        }
        localStorage.setItem("torrents", JSON.stringify(remTorrents));
    });   
}

function update_stats() {
    var json = JSON.stringify({
        "method": "session-stats",
        "tag": TAGNO
    });
    rpc_request(json, function(req) {
        localStorage.setItem("session-stats", req.responseText);
    });
}

function update_session() {
    var json = JSON.stringify({
        "method": "session-get",
        "tag": TAGNO
    });
    rpc_request(json, function(req) {
        localStorage.setItem("session-info", req.responseText);
    });
}

function update() {
    update_stats();
    update_session();
    update_torrents();
}