const Writer = require('../primitives/writer.js');

class Room {
    constructor(id, listener) {
        this.id = id;
        this.listener = listener;
        this.players = [];
        this.adminIndex = 0;
        this.drawerIndex = 0;
    }
    sendToAll(data) {
        this.players.forEach(player => player.connection.ws.send(data));
    }
    skip() {
        this.players[this.drawerIndex]?.normalize();
        this.drawerIndex++;
        this.drawerIndex %= this.players.length;
        this.players[this.drawerIndex].role |= 1;
    }
    kick(player, type) {
        const writer = new Writer(1 + 4);
        writer.writeUint8(2);
        writer.writeInt32(type); // -1 = same room reject, -2 = full room reject, -3 = leave, -4 = kick
        player.connection.ws.send(writer.buffer);
        if (player.role & 1) {
            this.skip();
        };
        if (player.role & 2) {
            player.role &= ~2;
            this.players[(this.adminIndex + 1) % this.players.length].role |= 2;
        };
        console.log(`Player ${player.id} left room ${this.id}.`);
        player.room = null;
        this.players.splice(this.players.indexOf(player), 1);
        this.drawerIndex = this.players.findIndex(player => player.role & 1);
        if (this.players.length < 1) {
            this.listener.rooms.splice(this.listener.rooms.indexOf(this), 1);
            console.log(`Automatically removed the inactive room ${this.id}. ${this.listener.rooms.length} rooms left.`);
        };
    }
    get admin() {
        return this.players[this.adminIndex];
    }
    get drawer() {
        return this.players[this.drawerIndex];
    }
}

module.exports = Room;