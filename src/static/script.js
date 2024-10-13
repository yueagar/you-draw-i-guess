class Drawer {
    static init() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 600;
        this.canvas.height = 400;
        this.clicked = false;
        this.prevX = -1;
        this.prevY = -1;
        this.color = "#000000";
        this.size = 1;
        this.currentActionIndex = 0;
        this.actions = [];
        this.addEventListeners();
        this.clear();
    }
    static addEventListeners() {
        this.canvas.addEventListener("mousemove", event => {
            if (this.clicked && Connection.role & 1) {
                //console.log(1, event.offsetX, event.offsetY);
                SendActions.sendMouse(1, event.offsetX, event.offsetY);
            }
        });
        this.canvas.addEventListener("mousedown", event => {
            this.clicked = true;
            //console.log(2, event.offsetX, event.offsetY);
            Connection.role & 1 && SendActions.sendMouse(2, event.offsetX, event.offsetY);
        });
        document.addEventListener("mouseup", event => {
            this.clicked = false;
            //console.log(3, event.offsetX, event.offsetY);
            Connection.role & 1 && SendActions.sendMouse(3, event.offsetX, event.offsetY);
        });
    }
    static draw(x, y) {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.size;
        this.ctx.beginPath();
        this.ctx.moveTo(this.prevX, this.prevY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.closePath();
        this.prevX = x;
        this.prevY = y;
    }
    static drawActions() {
        this.clear();
        for (let i = 0; i < this.currentActionIndex + 1; i++) {
            this.ctx.strokeStyle = this.convert(this.actions[i].color);
            this.ctx.lineWidth = this.actions[i].size;
            this.ctx.beginPath();
            this.ctx.moveTo(this.actions[i].points[0].x, this.actions[i].points[0].y);
            for (let j = 1; j < this.actions[i].points.length; j++) {
                this.ctx.lineTo(this.actions[i].points[j].x, this.actions[i].points[j].y);
            }
            this.ctx.stroke();
            this.ctx.closePath();
        }
    }
    static clear() {
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    static convert(color) {
        let str = color.toString(16);
        let zeros = "";
        for (let i = 0; i < 6 - str.length; i++) {
            zeros += "0";
        }
        return '#' + zeros + str;
    }
    /*static undo() {
        if (this.currentActionIndex >= 0) {
            this.currentActionIndex--;
            this.drawActions();
        }
    }
    static redo() {
        if (this.currentActionIndex < this.actions.length - 1) {
            this.currentActionIndex++;
            this.drawActions();
        }
    }*/
}

class Interface {
    static init() {
        this.reconnectButton = document.getElementById("reconnect");
        this.createRoomButton = document.getElementById("createRoom");
        this.refreshListButton = document.getElementById("refreshList");
        this.roomsList = document.getElementById("roomsList");
        this.playersList = document.getElementById("playersList");
        this.colorPicker = document.getElementById("colorPicker");
        this.sizePicker = document.getElementById("sizePicker");
        this.undoButton = document.getElementById("undo");
        this.redoButton = document.getElementById("redo");
        this.addEventListeners();
    }
    static addEventListeners() {
        this.reconnectButton.addEventListener("click", this.onReconnect.bind(this));
        this.createRoomButton.addEventListener("click", this.onCreateRoom.bind(this));
        this.colorPicker.addEventListener("input", event => {
            Drawer.color = event.target.value;
            SendActions.sendDraw(1, parseInt(Drawer.color.slice(1), 16));
        });
        this.sizePicker.addEventListener("input", event => {
            Drawer.size = event.target.value;
            SendActions.sendDraw(2, Drawer.size);
        });
        this.undoButton.addEventListener("click", () => {
            SendActions.sendDraw(4, 1);
        });
        this.redoButton.addEventListener("click", () => {
            SendActions.sendDraw(4, 2);
        });
    }
    static onReconnect() {
        Connection.connect();
    }
    static onCreateRoom() {
        SendActions.sendRoom(1);
    }
    static onRefreshList() {
        this.clearList();
        fetch("/rooms").then(response => response.json()).then(data => {
            data.forEach(room => {
                const li = document.createElement("li");
                const btn = document.createElement("button");
                btn.textContent = room.id == Connection.roomId ? "Leave" : "Join";
                btn.addEventListener("click", () => {
                    SendActions.sendRoom(room.id == Connection.roomId ? 3 : 2, room.id);
                });
                li.style.textDecoration = room.id == Connection.roomId ? "underline" : "none";
                li.textContent = `Room ${room.id} [${room.players.length}/8] ${room.id == Connection.roomId ? "(joined)" : ""}`;
                li.id = `server${room.id}`;
                li.appendChild(btn);
                this.roomsList.appendChild(li);
            })
        });
        fetch("/players?roomId=" + Connection.roomId).then(response => response.json()).then(data => {
            data.forEach(player => {
                const li = document.createElement("li");
                li.style.textDecoration = player.id == Connection.playerId ? "underline" : "none";
                li.style.color = player._role & 1 ? "red" : "black";
                li.style.fontWeight = player._role & 2 ? "bold" : "normal";
                li.textContent = `${player.name} #${player.id} [${player.score}] ${player.id == Connection.playerId ? "(you)" : ""}`;
                this.playersList.appendChild(li);
            });
        });
    }
    static clearList() {
        while (this.roomsList.firstChild) {
            this.roomsList.removeChild(this.roomsList.firstChild);
        }
        while (this.playersList.firstChild) {
            this.playersList.removeChild(this.playersList.firstChild);
        }
    }
}

class Connection {
    static init() {
        this.address = `ws${location.protocol == "https" ? "s" : ""}://${location.host}`;
        this.connected = false;
        this.playerId = -1;
        this.roomId = -1;
        this.role = 0;
        this.topic = "to be decided";
        this.connect();
    }
    static connect() {
        this.ws = new WebSocket(this.address);
        this.ws.binaryType = "arraybuffer";
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);
    }
    static onMessage(message) {
        MessageReader.read(message.data);
    }
    static onOpen() {
        this.connected = true;
        SendActions.sendConnected();
        console.log("Connected to the server.");
    }
    static onClose() {
        this.connected = false;
        console.log("Disconnected from the server.");
        Drawer.clear();
        Interface.clearList();
    }
    static onError(error) {
        console.error(error);
    }
    static send(data) {
        if (this.connected) {
            this.ws.send(data);
        };
    }
    static clean() {
        this.ws.close();
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws = null;
    }
}

class MessageReader {
    static read(data) {
        data = new Reader(new DataView(data));
        //console.log(data);
        const opcode = data.readUInt8();
        switch (opcode) {
            case 0:
                this.onUpdateList();
                break;
            case 1:
                this.onConnected(data);
                break;
            case 2:
                this.onRoom(data);
                break;
            case 3:
                this.onMouse(data);
                break;
            case 4:
                this.onDraw(data);
                break;
            case 5:
                this.onManage(data);
                break;
            default:
                console.error("Unknown opcode: " + opcode);
                break;
        }
    }
    static onUpdateList() {
        Interface.onRefreshList();
    }
    static onConnected(data) {
        Connection.playerId = data.readUInt32();
        console.log("Player ID: " + Connection.playerId);
        Interface.onRefreshList();
    }
    static onRoom(data) {
        const id = data.readInt32();
        if (id >= 0) {
            Connection.roomId = id;
            console.log("Room ID: " + Connection.roomId);
        } else {
            switch (id) {
                case -1:
                    console.log("You are already in a room.");
                    break;
                case -2:
                    console.log("Room is full.");
                    break;
                case -3:
                    console.log("You left the room.");
                    Connection.roomId = -1;
                    Drawer.clear();
                    Drawer.color = "#000000";
                    Drawer.size = 1;
                    break;
                default:
                    break;
            }
        }
    }
    static onMouse(data) {
        const type = data.readUInt8();
        const x = data.readUInt16();
        const y = data.readUInt16();
        if (type == 2) {
            Drawer.prevX = x;
            Drawer.prevY = y;
        }
        Drawer.draw(x, y);
        //console.log(playerId, x, y);
    }
    static onDraw(data) {
        const type = data.readUInt8();
        //console.log(type);
        if (type == 1) {
            Drawer.color = Drawer.convert(data.readUInt32());
        } else if (type == 2) {
            Drawer.size = data.readUInt8();
        } else if (type == 3) {
            Connection.topic = data.readUTF8String();
        } else if (type == 4) {
            Drawer.currentActionIndex = data.readInt16();
            const actionsLength = data.readUInt16();
            Drawer.actions = [];
            for (let i = 0; i < actionsLength; i++) {
                Drawer.actions.push({
                    color: data.readUInt32(),
                    size: data.readUInt8(),
                    points: []
                });
                const pointsLength = data.readUInt16();
                for (let j = 0; j < pointsLength; j++) {
                    Drawer.actions[i].points.push({
                        x: data.readUInt16(),
                        y: data.readUInt16()
                    });
                }
            }
            Drawer.drawActions();
        }
    }
    static onManage(data) {
        const type = data.readUInt8();
        if (type == 1) {// role update
            const role = data.readUInt8();
            if (role != Connection.role) {
                if (role & 1) {
                    !(Connection.role & role & 1) && Drawer.clear();
                    SendActions.sendDraw(1, parseInt(Interface.colorPicker.value.slice(1), 16));
                    SendActions.sendDraw(2, Interface.sizePicker.value);
                }
                Connection.role = role;
            }
        }
    }
}

class SendActions {
    static sendConnected() {
        const writer = new Writer(1 + 1);
        writer.writeUInt8(1);
        writer.writeUInt8(99);
        Connection.send(writer.dataView.buffer);
    }
    static sendRoom(type, roomId = 0) {
        const writer = new Writer(1 + 1 + 4);
        writer.writeUInt8(2);
        writer.writeUInt8(type);
        writer.writeUInt32(roomId);
        Connection.send(writer.dataView.buffer);
    }
    static sendMouse(action, x, y) {
        const writer = new Writer(1 + 1 + 2 + 2);
        writer.writeUInt8(3);
        writer.writeUInt8(action);
        writer.writeUInt16(x);
        writer.writeUInt16(y);
        Connection.send(writer.dataView.buffer);
    }
    static sendDraw(type, value) {
        const writer = new Writer(1 + 1 + (type == 1 ? 4 : type == 3 ? value.length + 1 : 1));
        writer.writeUInt8(4);
        writer.writeUInt8(type);
        if (type == 1) {
            writer.writeUInt32(value);
        } else if (type == 3) {
            writer.writeUTF8String(value);
        } else {
            writer.writeUInt8(value);
        }
        Connection.send(writer.dataView.buffer);
    }
}

class Reader {
    constructor(dataView) {
        this.dataView = dataView;
        this.index = 0;
        this.maxIndex = dataView.byteLength;
    }
    readUInt8() {
        return this.dataView.getUint8(this.index++);
    }
    readInt8() {
        return this.dataView.getInt8(this.index++);
    }
    readUInt16() {
        const value = this.dataView.getUint16(this.index, true);
        return this.index += 2, value;
    }
    readInt16() {
        const value = this.dataView.getInt16(this.index, true);
        return this.index += 2, value;
    }
    readUInt32() {
        const value = this.dataView.getUint32(this.index, true);
        return this.index += 4, value;
    }
    readInt32() {
        const value = this.dataView.getInt32(this.index, true);
        return this.index += 4, value;
    }
    readFloat32() {
        const value = this.dataView.getFloat32(this.index, true);
        return this.index += 4, value;
    }
    readFloat64() {
        const value = this.dataView.getFloat64(this.index, true);
        return this.index += 8, value;
    }
    readUTF8String() {
        let str = "";
        while (this.index < this.maxIndex) {
            const charCode = this.readUInt8();
            if (charCode == 0) {
                break;
            }
            str += String.fromCharCode(charCode);
        }
        return str;
    }
}

class Writer {
    constructor(length) {
        this.dataView = new DataView(new ArrayBuffer(length));
        this.index = 0;
    }
    writeUInt8(value) {
        this.dataView.setUint8(this.index++, value);
    }
    writeInt8(value) {
        this.dataView.setInt8(this.index++, value);
    }
    writeUInt16(value) {
        this.dataView.setUint16(this.index, value, true);
        this.index += 2;
    }
    writeInt16(value) {
        this.dataView.setInt16(this.index, value, true);
        this.index += 2;
    }
    writeUInt32(value) {
        this.dataView.setUint32(this.index, value, true);
        this.index += 4;
    }
    writeInt32(value) {
        this.dataView.setInt32(this.index, value, true);
        this.index += 4;
    }
    writeFloat32(value) {
        this.dataView.setFloat32(this.index, value, true);
        this.index += 4;
    }
    writeFloat64(value) {
        this.dataView.setFloat64(this.index, value, true);
        this.index += 8;
    }
    writeUTF8String(str) {
        for (let i = 0; i < str.length; i++) {
            this.writeUInt8(str.charCodeAt(i));
        }
        this.writeUInt8(0);
    }
}

window.onload = () => {
    Drawer.init();
    Interface.init();
    Connection.init();
}