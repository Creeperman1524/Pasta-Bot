## :scroll: Changelog
### (**WIP**) 0.9.0 - *Music Player*
- Ability to play single songs, playlists, pause, shuffle, and queue songs
- Multiple people can add to the queue
	- Possible additional logging for when songs fail

#### 0.8.2 - Bot task system (3/6/22)
- Different tasks are now separated into files for better organization
	- Updating the bot status
	- Updating commands at startup


#### 0.8.1 - Internal bot logging (2/22/22)
- The bot can output log information to a file with timestamps to further debug
	- Helpful for figuring out when things go wrong
	- Logs error to a separate file
	- Track crude statistics with these metrics

### 0.8.0- *Reaction Roles* (2/13/22)
- Adds ability to assign a message to be reacted to that grants and revokes roles from users
	- You can add or remove roles at a later time
	- Customize the emojis each role is bound to
	- Persists over bot restarts (may get out of sync when the bot is offline)

#### 0.7.2 - Command Permissions (1/29/22)
- Commands are integrated with discord permissions to "grey out" commands when you can't use them
	- Able to change what permissions are needed to use the command
	- Possible values include `OWNER`, `ADMINISTRATOR`, or `MESSAGES`

#### 0.7.1 - Command grouping (1/29/22)
- Commands are grouped into separate categories interally

### 0.7.0 - *Minesweeper* (11/24/21)
- Added a full working minesweeper minigame