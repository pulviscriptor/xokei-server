Protocol based on JSON format.  
Each packet is JSON array having `[0]` element `cmd` representing command (`opcode`) and additional data.  
Examples:  
`["welcome","1.0.0"]` where `1.0.0` is version of server  
`["game_won",{"winner":"player1","scores":[6,3]}]`
# Server -> Client #
## welcome ##
First message from server.  
- `version` (`string`) - version of server. Client should disconnect if version mismatch from client's version.

## joined_room ##
Player joined room. `window.location.hash` will be changed to `id`.
- `opt` (`object`) 
	- `room_id` (`string`) - ID of room. Example: `7W3ZLG`
	- `side` (`string`) - side of player. `player1` or `player2`
	- `type` (`string`) - `public` or `private` room type
	- `name` (`string`) - player's name

## invite_friend ##
Display dialog with URL to invite friend to newly created private room.

## kill ##
Force client to close connection.
- `code` (`string`) - reason to kill. Available codes:
  - `CLIENT_DISCONNECTED` - opponent disconnected
  - `SERVER_SHUTDOWN` - server shutting down
  - `NEW_GAME` - game finished and opponent clicked "new game" (refused to play another game)

## check_room_result ##
Result of client's `check_room` request.
- `result` (`string`) - next strings can be sent:
 - `NOT_FOUND` - room not found
 - `GAME_RUNNING` - room is already have 2 players and game running
 - `AVAILABLE` - you can join this room

## opponent_joined ##
Opponent joined game
- `opt` (`object`)
	- `name` (`string`) - opponent's name
	- `side` (`string`) `player1` or `player2`

## board ##
Load board state with actors places.
- `opt` (`object`)  
	- `actors` (`array`) - array of objects. Each object has `x`, `y`, `owner` (`string`) (`player1` or `player2)

## place_puck ##
Tell player to place puck.  
Both players will receive this message.
- `owner` (`string`) - `player1` or `player2`

## puck_placed (TODO: replace with `turn`) ##
Puck is placed on board.
- `x` (`int`)
- `y` (`int`)

## turn ##
Switch board owner (wait turn of player) (two moves)  
Both players will receive this message.
- `player` (`string`) - new owner `player1` or `player2`

## opponent_resigned ##
Opponent resigned
- `code` (`string`) - resign reason:
	- `CLIENT_DISCONNECTED` - opponent disconnected (show opponent resigned window)
	- `ONLINE_RESIGN` - opponent clicked "resign" button

# Client -> Server #
## create_room ##
Create new game room.  
If room is `public` then server will attempt to find free room for player.  
- `opt` (`object`)  
	- `type` (`string`) - `public` or `private` room type
	- `name` (`string`) - player name

## check_room ##
Check if private room exists.
- `id` (`string`) - room ID

## join_room ##
Join private room.
- `opt` (`object`)  
	- `room` (`string`) - room ID
	- `name` (`string`) - player name

## place_puck (TODO: replace with `turn`) ##
Tell server to place puck.
- `x` (`int`)
- `y` (`int`)

## resign ##
Resign game.