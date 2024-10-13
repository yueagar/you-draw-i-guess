const Reader = require("../primitives/reader.js");
const Writer = require("../primitives/writer.js");

const Room = require("../rooms/Room.js");
const Player = require("../rooms/Player.js");

class Connection {
    constructor(listener, ws) {
        this.listener = listener;
        this.ws = ws;
        this.player = new Player(-1, this);
        ws.on("message", this.onMessage.bind(this));
        ws.on("close", this.onClose.bind(this));
    }

    onMessage(data) {
        const reader = new Reader(Buffer.from(data));
        const opcode = reader.readUint8();
        switch (opcode) {
            case 1: // new player joining confirmed
                if (reader.readUint8() == 99) { // 99 = valid public join pass
                    this.player.id = this.listener.playerIdCount++;
                    console.log(`Player ${this.player.id} connected.`);
                    //this.player.role = 3; // role = admin + drawer, for debugging
                    const writer = new Writer(1 + 4);
                    writer.writeUint8(1);
                    writer.writeUint32(this.player.id);
                    this.ws.send(writer.buffer);
                } else return this.ws.close();
                break;
            case 2: // room related
                if (this.player.id < 0) return this.ws.close();
                const action = reader.readUint8();
                const roomId = reader.readUint32();
                if (action == 1) { // create room
                    if (this.player.room) {
                        const writer = new Writer(1 + 4);
                        writer.writeUint8(2);
                        writer.writeUint32(this.player.room.id);
                        this.ws.send(writer.buffer);
                    } else {
                        const room = new Room(this.listener.roomIdCount++, this.listener);
                        this.listener.rooms.push(room);
                        this.player.room = room;
                        this.player.role = 3; // role = admin + drawer
                        room.players.push(this.player);
                        console.log(`Player ${this.player.id} created room ${room.id}.`);
                        this.player.sendRoomId();
                        this.listener.sendRoomUpdate();
                    }
                } else if (action == 2) { // join room
                    const room = this.listener.rooms.find(room => room.id == roomId);
                    if (room) {
                        if (room.players.includes(this.player)) {
                            const writer = new Writer(1 + 4);
                            writer.writeUint8(2);
                            writer.writeInt32(-1);
                            this.ws.send(writer.buffer);
                        } else if (room.players.length >= 8) {
                            const writer = new Writer(1 + 4);
                            writer.writeUint8(2);
                            writer.writeInt32(-2);
                            this.ws.send(writer.buffer);
                        } else {
                            if (this.player.room) {
                                this.player.room.kick(this.player, -3);
                            }
                            room.players.push(this.player);
                            this.player.room = room;
                            console.log(`Player ${this.player.id} joined room ${room.id}.`);
                            this.player.onJoinRoom();
                            this.listener.sendRoomUpdate();
                        };
                    } else return this.ws.close();
                } else if (action == 3) {
                    if (this.player.room) {
                        this.player.room.kick(this.player, -3);
                        this.player.normalize();
                        this.listener.sendRoomUpdate();
                    }
                } else return this.ws.close();
                break;
            case 3: // mouse related
                if (this.player.id < 0) return this.ws.close();
                if (this.player.role & 1 && this.player.room) { // role == drawer ?
                    const action = reader.readUint8();
                    const x = reader.readUint16();
                    const y = reader.readUint16();
                    /*if (action == 1) { // mouse move
                        this.player.x = x;
                        this.player.y = y;
                    }*/
                    if (action == 2) { // mouse down
                        //console.log(`Player ${this.player.id} clicked in room ${this.player.room.id}.`);
                        this.player.clicked = true;
                        this.player.actions = this.player.actions.splice(0, this.player.currentActionIndex + 1);
                        this.player.actions.push({
                            color: this.player.pickedColor,
                            size: this.player.pickedSize,
                            points: []
                        });
                        this.player.currentActionIndex = this.player.actions.length - 1;
                    }
                    if (action == 3) { // mouse up
                        this.player.clicked = false;
                    }
                    if (this.player.clicked) {
                        this.player.actions[this.player.currentActionIndex].points.push({ x, y });
                        const writer = new Writer(1 + 1 + 2 + 2);
                        writer.writeUint8(3);
                        writer.writeUint8(action);
                        writer.writeUint16(x);
                        writer.writeUint16(y);
                        this.player.room.sendToAll(writer.buffer);
                    }
                };
                break;
            case 4: // draw related
                if (this.player.id < 0) return this.ws.close();
                if (this.player.role & 1 && this.player.room) { // role == drawer ?
                    const type = reader.readUint8();
                    if (type == 1) { // color
                        let color = reader.readUint32();
                        if (color < 0 || color > 0xFFFFFF) return this.ws.close();
                        console.log(`Player ${this.player.id} picked color ${color}.`);
                        this.player.pickedColor = color;
                    } else if (type == 2) { // size
                        let size = reader.readUint8();
                        if (size < 1 || size > 10) return this.ws.close();
                        console.log(`Player ${this.player.id} picked size ${size}.`);
                        this.player.pickedSize = size;
                    } else if (type == 3) {
                        let topic = reader.readString();
                        console.log(`Player ${this.player.id} picked topic ${topic}.`);
                        this.player.pickedTopic = topic;
                    } else if (type == 4) {
                        let action = reader.readUint8();
                        if (action == 1) {
                            this.player.currentActionIndex--;
                            this.player.room.players.forEach(player => player.sendDrawerActions());
                        } else if (action == 2) {
                            this.player.currentActionIndex++;
                            this.player.room.players.forEach(player => player.sendDrawerActions());
                        }
                    }
                }
                break;
            default:
                this.ws.close();
                break;
        }
    }

    onClose() {
        this.listener.onDisconnection(this);
    }
}

module.exports = Connection;