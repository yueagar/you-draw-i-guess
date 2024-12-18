const Writer = require('../primitives/writer.js');

class Player {
    constructor(id, connection) {
        this.id = id;
        this.connection = connection;
        this.name = "Guest" + (~~(9999 * Math.random()) + 1);
        this.room = null;
        this.skipTimeout = null;
        this.becomeDrawerTime = 0;
        this._role = 0; // admin(2nd bit), drawer(1st bit)
        this._pickedColor = 0;
        this._pickedSize = 1;
        this._pickedTopic = null;
        //this.x = 0;
        //this.y = 0;
        this.clicked = false;
        this.currentActionIndex = -1;
        this.actions = [];
        this.score = 0;
    }
    normalize() {
        this.role &= ~1;
        this.becomeDrawerTime = 0;
        this._pickedColor = 0;
        this._pickedSize = 1;
        this._pickedTopic = "to be decided";
        //this.x = 0;
        //this.y = 0;
        this.clicked = false;
        this.currentActionIndex = -1;
        this.actions = [];
        clearTimeout(this.skipTimeout);
    }
    onJoinRoom() {
        this.normalize();
        this.sendRoomId();
        this.sendDrawerInfo();
    }
    sendRoomId() {
        const writer = new Writer(1 + 1 + 4);
        writer.writeUint8(2);
        writer.writeUint8(0);
        writer.writeUint32(this.room.id);
        this.connection.ws.send(writer.buffer);
    }
    sendDrawerInfo() {
        this.sendDrawerColor();
        this.sendDrawerSize();
        this.sendDrawerTopic();
        this.sendDrawerActions();
    }
    sendDrawerColor() {
        const writer = new Writer(1 + 1 + 4);
        writer.writeUint8(4);
        writer.writeUint8(1);
        writer.writeUint32(this.room.drawer.pickedColor);
        this.connection.ws.send(writer.buffer);
    }
    sendDrawerSize() {
        const writer = new Writer(1 + 1 + 1);
        writer.writeUint8(4);
        writer.writeUint8(2);
        writer.writeUint8(this.room.drawer.pickedSize);
        this.connection.ws.send(writer.buffer);
    }
    sendDrawerTopic() {
        if (this.room.drawer.pickedTopic) {
            const writer = new Writer(1 + 1 + this.pickedTopic.length + 1);
            writer.writeUint8(4);
            writer.writeUint8(3);
            writer.writeString(this.room.drawer.pickedTopic.replace(/\S/g, "_"));
            this.connection.ws.send(writer.buffer);
        }
    }
    sendDrawerActions() {
        const writer = new Writer();
        writer.writeUint8(4);
        writer.writeUint8(4);
        writer.writeUint16(this.room.drawer.currentActionIndex + 1);
        writer.writeUint16(this.room.drawer.actions.length);
        this.room.drawer.actions.forEach(action => {
            writer.writeUint32(action.color);
            writer.writeUint8(action.size);
            writer.writeUint16(action.points.length);
            action.points.forEach(point => {
                writer.writeUint16(point.x);
                writer.writeUint16(point.y);
            });
        });
        this.connection.ws.send(writer.cut());
    }
    get role() {
        return this._role;
    }
    set role(role) {
        if (role & 1 && !(this._role & 1)) {
            this.pickedTopic = null;
            this.becomeDrawerTime = Date.now();
            this.skipTimeout = setTimeout(() => {
                this.room?.skip();
            }, 120 * 1000);
        }
        this._role = role;
        const writer = new Writer(1 + 1 + 1);
        writer.writeUint8(5);
        writer.writeUint8(1);
        writer.writeUint8(role);
        this.connection.ws.send(writer.buffer);
    }
    get pickedColor() {
        return this._pickedColor;
    }
    set pickedColor(color) {
        this._pickedColor = color;
        const writer = new Writer(1 + 1 + 4);
        writer.writeUint8(4);
        writer.writeUint8(1);
        writer.writeUint32(color);
        this.room.sendToAll(writer.buffer);
    }
    get pickedSize() {
        return this._pickedSize;
    }
    set pickedSize(size) {
        this._pickedSize = size;
        const writer = new Writer(1 + 1 + 1);
        writer.writeUint8(4);
        writer.writeUint8(2);
        writer.writeUint8(size);
        this.room.sendToAll(writer.buffer);
    }
    get pickedTopic() {
        return this._pickedTopic;
    }
    set pickedTopic(topic) {
        this._pickedTopic = topic;
        if (topic) {
            const obfuscated = topic.replace(/\S/g, "_");
            const writer = new Writer(1 + 1 + obfuscated.length);
            writer.writeUint8(4);
            writer.writeUint8(3);
            writer.writeString(obfuscated);
            this.room.sendToAll(writer.buffer);
        }
    }
}

module.exports = Player;