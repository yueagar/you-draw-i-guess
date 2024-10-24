const path = require("path");

const express = require("express");

const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;

const Connection = require("./Connection");

class Listener {
    constructor(server) {
        this.socket = null;
        this.server = server;
        this.port = process.env.PORT || 8080;

        this.playerIdCount = 0;
        this.roomIdCount = 0;

        this.connections = [];
        this.rooms = [];
    }
    startApp() {
        this.app = express();
        this.app.use("/", express.static(path.join(__dirname, "../static")));
        this.app.get("/rooms", (req, res) => {
            res.json(this.rooms.map(room => {
                return {
                    id: room.id,
                    players: room.players.map(player => player.id),
                    adminIndex: room.adminIndex,
                    drawerIndex: room.drawerIndex
                };
            }));
        });
        this.app.get("/players", (req, res) => {
            const room = this.rooms.find(room => room.id == req.query.roomId);
            if (room) {
                res.json(room.players.map(player => {
                    return {
                        ...player,
                        _pickedTopic: "",
                        connection: player.id,
                        room: player.room.id,
                        actions: player.actions.map(action => ({ "color": action.color, "size": action.size, "points": action.points }))
                    };
                }));
            } else {
                res.json([]);
            }
        });
        /*this.app.listen(this.port, () => {
            console.log("App listening on port " + this.port);
        });*/
    }
    open() {
        if (this.app !== null && this.socket !== null) {
            return false;
        }
        //this.socket = new WebSocketServer({ port: this.port }, this.onOpen.bind(this));
        const appServer = require("http").createServer(this.app);
        this.socket = new WebSocketServer({ server: appServer });
        this.socket.on("connection", this.onConnection.bind(this));
        appServer.listen(this.port, this.onOpen.bind(this));
        return true;
    }
    onOpen() {
        console.log("Websocket listening on port " + this.port);
    }
    onConnection(ws) {
        this.connections.push(new Connection(this, ws));
    }
    onDisconnection(connection) {
        //console.log(`Player ${connection.player.id} disconnected.`);
        this.connections.splice(this.connections.indexOf(connection), 1);
        connection.player.room?.kick(connection.player, 3);
        this.sendRoomUpdate();
    }
    sendRoomUpdate() {
        this.connections.forEach(connection => connection.ws.send(Buffer.from([0, 1])));
    }
}

module.exports = Listener;