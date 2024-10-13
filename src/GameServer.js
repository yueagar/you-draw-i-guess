const Listener = require("./sockets/Listener");

class GameServer {
    constructor() {
        this.Listener = new Listener(this);
    }

    start() {
        this.Listener.startApp();
        this.Listener.open();
    }
}

module.exports = GameServer;