## :scroll: Changelog

#### 0.8.4 - Standardized embeds (4/13/22)
- Created a module for embeds to have the same look and version number
	- Added a table for color values to quick change the colors of the embeds
- Updated the reference for all embeds used in the bot

#### 0.8.3 - Updated info command (3/30/22)
- Updated the `info` command to have more information
	- Added a link to the github repository
	- Added an uptime counter
	- Deleted useless things

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