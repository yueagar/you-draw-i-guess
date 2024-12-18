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
        this.count = 0;
        this.countLastReset = 0;
        this.countInterval = setInterval(() => {
            if (this.countLastReset + 120 * 1000 - Date.now() > 0) {
                this.count = Math.max(0, Math.ceil((this.countLastReset + 120 * 1000 - Date.now()) / 1000));
                Interface.countdown.textContent = `Timeleft: ${this.count}s`;
            }
        }, 1000);
        this.addEventListeners();
        this.clear();
    }
    static addEventListeners() {
        ["mousemove", "touchmove"].forEach(e => this.canvas.addEventListener(e, event => {
            if (this.clicked && Connection.role & 1) {
                event.preventDefault();
                //console.log(1, event.offsetX, event.offsetY);
                const rect = event.target.getBoundingClientRect();
                SendActions.sendMouse(1, event.offsetX || event.touches[0].clientX - window.scrollX - rect.left, event.offsetY || event.touches[0].clientY - window.scrollY - rect.top);
            }
        }));
        ["mousedown", "touchstart"].forEach(e => this.canvas.addEventListener(e, event => {
            this.clicked = true;
            event.preventDefault();
            //console.log(2, event.offsetX, event.offsetY);
            const rect = event.target.getBoundingClientRect();
            Connection.role & 1 && SendActions.sendMouse(2, event.offsetX || event.touches[0].clientX - window.scrollX - rect.left, event.offsetY || event.touches[0].clientY - window.scrollY - rect.top);        }));
        ["mouseup", "touchend"].forEach(e => document.addEventListener(e, event => {
            this.clicked = false;
            //console.log(3, event.offsetX, event.offsetY);
            Connection.role & 1 && SendActions.sendMouse(3, event.offsetX || 0, event.offsetY || 0);
        }));
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
        this.clear(true);
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
    static clear(action = false) {
        if (!action) {
            this.count = 0;
            this.countLastReset = 0;
            Interface.countdown && (Interface.countdown.textContent = "Timeleft: 0s");
        }
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
        // server-related
        this.reconnectButton = document.getElementById("reconnect");
        this.createRoomButton = document.getElementById("createRoom");
        this.roomsList = document.getElementById("roomsList");
        this.playersList = document.getElementById("playersList");
        // draw-related
        this.countdown = document.getElementById("countdown");
        this.colorPicker = document.getElementById("colorPicker");
        this.sizePicker = document.getElementById("sizePicker");
        this.undoButton = document.getElementById("undo");
        this.redoButton = document.getElementById("redo");
        // chat-related
        this.chatHistory = document.getElementById("chatHistory");
        this.chatInput = document.getElementById("chatInput");
        this.sendChatButton = document.getElementById("sendChat");
        // guess-related
        this.guessHeader = document.getElementById("guessHeader");
        this.guessInput = document.getElementById("guessInput");
        this.submitGuessButton = document.getElementById("submitGuess");
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
        this.sendChatButton.addEventListener("click", () => {
            if (this.chatInput.value) {
                SendActions.sendMsg(this.chatInput.value, 1);
                this.chatInput.value = "";
            }
        });
        this.chatInput.addEventListener("keydown", event => {
            if (event.key == "Enter") {
                this.sendChatButton.click();
            }
        });
        this.submitGuessButton.addEventListener("click", () => {
            if (this.guessInput.value) {
                SendActions.sendMsg(this.guessInput.value, 2);
                this.guessInput.value = "";
            }
        });
        this.guessInput.addEventListener("keydown", event => {
            if (event.key == "Enter") {
                this.submitGuessButton.click();
            }
        });
    }
    static onReconnect() {
        Connection.ws.close();
        Connection.connect();
    }
    static onCreateRoom() {
        SendActions.sendRoom(1);
    }
    static onRefreshList(type) {
        //console.log(`Refreshed list type ${type}.`);
        //this.clearList(type);
        type & 1 && fetch("/rooms").then(response => response.json()).then(data => {
            this.clearList(1);
            data.forEach(room => {
                const li = document.createElement("li");
                li.style.textDecoration = room.id == Connection.roomId ? "underline" : "none";
                li.textContent = `Room ${room.id} [${room.players.length}/8] ${room.id == Connection.roomId ? "(joined)" : ""}`;
                li.id = `server${room.id}`;
                const btn = document.createElement("button");
                btn.textContent = room.id == Connection.roomId ? "Leave" : "Join";
                btn.addEventListener("click", () => {
                    SendActions.sendRoom(room.id == Connection.roomId ? 3 : 2, room.id);
                });
                li.appendChild(btn);
                this.roomsList.appendChild(li);
            })
        });
        type & 2 && fetch("/players?roomId=" + Connection.roomId).then(response => response.json()).then(data => {
            this.clearList(2);
            Connection.roomPlayers = [];
            data.forEach(player => {
                Connection.roomPlayers.push(player);
                const li = document.createElement("li");
                li.style.textDecoration = player.id == Connection.playerId ? "underline" : "none";
                li.style.color = player._role & 1 ? "red" : "black";
                li.style.fontWeight = player._role & 2 ? "bold" : "normal";
                li.textContent = `${player.name} #${player.id} [${player.score}] ${player.id == Connection.playerId ? "(you)" : ""}`;
                li.id = `player${player.id}`;
                if (Connection.role & 2 && !(player._role & 2) && Connection.playerId != player.id) {
                    const btn = document.createElement("button");
                    btn.textContent = "Kick";
                    btn.addEventListener("click", () => {
                        SendActions.sendManage(1, player.id);
                    });
                    li.appendChild(btn);
                }
                this.playersList.appendChild(li);
                player._role & 1 && (Drawer.countLastReset = player.becomeDrawerTime);
            });
        });
    }
    static clearList(type) {
        if (type & 1) {
            while (this.roomsList.firstChild) {
                this.roomsList.removeChild(this.roomsList.firstChild);
            }
        }
        if (type & 2) {
            while (this.playersList.firstChild) {
                this.playersList.removeChild(this.playersList.firstChild);
            }
        }
    }
    static addChatMessage(sender, message) {
        const dateObj = new Date();
        const timeString = dateObj.getHours().toString().padStart(2, "0") + ":" + dateObj.getMinutes().toString().padStart(2, "0") + ":" + dateObj.getSeconds().toString().padStart(2, "0");
        this.chatHistory.textContent += `[${timeString}] ${sender}: ${message}\n`;
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
    static clearChat() {
        this.chatHistory.textContent = "";
    }
    static toggleGuessBox(role) {
        this.guessHeader.textContent = role & 1 ? "Decide the topic:" : "Guess the word:";
        this.guessInput.placeholder = role & 1 ? "Input your topic here." : "Input your guess here.";
        //this.submitGuessButton.textContent = role & 1 ? "Submit Topic" : "Submit Guess";
    }
}

class Connection {
    static init() {
        this.address = `ws${location.protocol == "https:" ? "s" : ""}://${location.host}`;
        this.connected = false;
        this.playerId = -1;
        this.roomId = -1;
        this.roomPlayers = [];
        this.role = 0;
        this.topic = "tbd";
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
        Interface.addChatMessage("System", "Connected to the server.");
    }
    static onClose() {
        this.connected = false;
        this.playerId = -1;
        this.roomId = -1;
        this.roomPlayers = [];
        this.role = 0;
        this.topic = "tbd";
        console.log("Disconnected from the server.");
        Interface.addChatMessage("System", "Disconnected from the server.");
        Drawer.clear();
        Interface.clearList(3);
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
                this.onUpdateList(data);
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
            case 6:
                this.onChat(data);
                break;
            default:
                console.error("Unknown opcode: " + opcode);
                break;
        }
    }
    static onUpdateList(data) {
        const type = data.readUInt8();
        Interface.onRefreshList(type);
    }
    static onConnected(data) {
        Connection.playerId = data.readUInt32();
        console.log("Player ID: " + Connection.playerId);
        Interface.addChatMessage("Server", `Your Player ID is ${Connection.playerId}.`);
        Interface.onRefreshList(1);
    }
    static onRoom(data) {
        const status = data.readUInt8();
        switch (status) {
            case 0:
                const id = data.readUInt32();
                Connection.roomId = id;
                console.log("Room ID: " + Connection.roomId);
                Interface.addChatMessage("Server", `You joined room ${Connection.roomId}.`);
                break;
            case 1:
                console.log("You are already in a room.");
                Interface.addChatMessage("Server", "You are already in a room.");
                break;
            case 2:
                console.log("Room is full.");
                Interface.addChatMessage("Server", "The room is now full.");
                break;
            case 3:
                console.log("You left the room.");
                Interface.addChatMessage("Server", "You left the room.");
                Connection.roomId = -1;
                Drawer.clear();
                Drawer.color = "#000000";
                Drawer.size = 1;
                break;
            case 4:
                console.log("You have been kicked by the room owner.");
                Interface.addChatMessage("Server", "You have been kicked by the room owner.");
                Connection.roomId = -1;
                Drawer.clear();
                Drawer.color = "#000000";
                Drawer.size = 1;
                break;
            default:
                break;
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
            Interface.addChatMessage("Server", `The drawer has picked a topic. Hint: ${Connection.topic}.`);
        } else if (type == 4) {
            Drawer.currentActionIndex = data.readUInt16() - 1;
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
                } else if (Connection.role & 1 && !(role & 1)) {
                    Drawer.clear();
                }
                Connection.role = role;
                Interface.toggleGuessBox(role);
            }
        }
    }
    static onChat(data) {
        const type = data.readUInt8();
        const senderId = type == 1 ? data.readUInt32() : -1;
        const sender = senderId > -1 ? Connection.roomPlayers.find(player => player.id == senderId).name : type == 2 ? "Server" : "System";
        const message = data.readUTF8String();
        Interface.addChatMessage(sender, message);
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
    static sendManage(action, playerId) {
        const writer = new Writer(1 + 1 + 4);
        writer.writeUInt8(5);
        writer.writeUInt8(action);
        writer.writeUInt32(playerId);
        Connection.send(writer.dataView.buffer);
    }
    static sendMsg(message, type) {
        const writer = new Writer(1 + 1 + message.length + 1);
        writer.writeUInt8(6);
        writer.writeUInt8(type);
        writer.writeUTF8String(message);
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