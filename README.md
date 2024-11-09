# you-draw-i-guess {#header}
###### You draw something, and I try to guess it! {#header}

### Why do I make this project?
I had a lot of fun playing gartic.io with my friends. I wanted to try to make my own gartic.io and practice my skills on making RESTful APIs and WebSocket servers, manipulating binary data and utilizing HTML Canvas API. Therefore, I made this project. Besides, I recently realized that I still have not submitted a project to get the CS50x certificate so I think I am also going to submit a preliminary version of this project to get the certificate.
### How to play?
Firstly, we have two roles in this game: drawer and guesser. Drawer draws, guesser guesses, and 2 minutes a round. If all guessers guess correctly or 2 minutes have passed, a guesser will become the new drawer and the original drawer will become a guesser so everyone has the chance to show off his/her amazing drawing skills.
#### Roles
##### Drawer {.red}
As a drawer, you can decide the topic and draw on the canvas. If the drawers draw clearly and the guessers guess the topic correctly, the drawer gets 1 point for every correct guess. It is much more efficient to gain points as a drawer.
##### Guesser
As a guesser, you observe the drawer's art piece and guess what it is about. You get 1 point if you guess it correctly.

### How to install and run this project?
1. Clone or download this github repository.
2. Open your command terminal and change directory to the downloaded folder.
3. Install the dependencies by running the following command.
`npm install`
4. Start the project by running the following command.
`npm run start`
5. Go to http://localhost:8080 on your own web browser and there it is.
If you do not want to set up the whole thing in your machine, you can also have a look at the online demo: https://you-draw-i-guess.fly.dev.

### Todo list
- [x] Basic drawing
- [x] Room system
- [x] Player role assignment
- [x] Custom topic and guess system
- [x] Chatroom
- [x] Basic room moderation abilities
- [ ] Frontend design
- [ ] React dynamic frontend instead of vanilla static frontend
- [ ] Account system with MongoDB
- [ ] More security

<hr>

## More information for developers
### Code structure
- GameServer
  - Listener
    - Connection[]
      - Player
    - Room[]
      - Player[]

From a Player instance, we can access its Connection and Room.
From a Connection or a Room instance, we can access Listener.

### Binary protocol
#### Client -> Server
##### Connection (2)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (1) |
| 1 | uint8 | passcode (99) |
##### Room operation (6)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (2) |
| 1 | uint8 | operation type |
| 2 | uint32 | room id |
##### Mouse action (6)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (3) |
| 1 | uint8 | action type |
| 2 | uint16 | cursor x coordinate |
| 4 | uint16 | cursor y coordinate |
##### Draw action (6 or 3 or 3 + topic.length or 2)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (4) |
| 1 | uint8 | action type |
| 2 | uint32 | if type == 1: pen color |
| 2 | uint8 | if type == 2: pen size |
| 2 | utf8-string | if type == 3: topic |
##### Manage/mod action (6)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (5) |
| 1 | uint8 | action type |
| 2 | uint32 | player id |
##### Chat (3 + message.length)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (6) |
| 1 | uint8 | action type |
| 2 | utf8-string | message |
#### Server -> Client
##### Call to fetch API (2)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (0) |
| 1 | uint8 | type |
##### Confirm connection (5)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (1) |
| 1 | uint32 | self player id |
##### Room operation result (2 or 6)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (2) |
| 1 | uint8 | status |
| 2 | uint32 | if status == 0: self room id |
##### Drawer's mouse action (6)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (3) |
| 1 | uint8 | action type |
| 2 | uint16 | cursor x coordinate |
| 4 | uint16 | cursor y coordinate |
##### Drawer's draw action (6 or 3 or 3 + topic.length or >>2)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (4) |
| 1 | uint8 | action type |
| 2 | uint32 | if type == 1: pen color |
| 2 | uint8 | if type == 2: pen size |
| 2 | utf8-string | if type == 3: topic |
| 2 | uint16 | if type == 4: current action index |
| 4 | uint16 | if type == 4: action length |
| ... | ... | loop through actions  |
| ? | uint32 | color |
| ? | uint8 | size |
| ... | ... | for each action, loop through points |
| ? | uint16 | x coordinate |
| ? | uint16 | y coordinate |

##### Manage/mod action result (3 or 2)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (5) |
| 1 | uint8 | action type |
| 2 | uint8 | if type == 1: new role |
##### Chat (7 + message.length or 3 + message.length)
| Offset | Data Type | Info |
|---|---|---|
| 0 | uint8 | opcode (6) |
| 1 | uint8 | action type |
| 2 | uint32 | if type == 1: sender id | 
| 2 or 6 | utf8-string | message |

#### RESTful API
`GET /rooms`: returns a JSON array of objects (Room instances)
`GET /players?roomId={id}`: returns a JSON array of objects (Player instances in a certain Room)

<style>
    #header {
        text-align: center;
    }
    .red {
        color: red;
    }
</style>