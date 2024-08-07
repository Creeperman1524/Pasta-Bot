## :scroll: Changelog

# This chanelog and the versioning scheme will most likely be updated to "backfill" all previous updates and give a more up-to-date changelog based on the commit history (though that might take some time)

#### 0.9.4 - Valorant Roles (7/23/24)
- Added a valorant role system
    - Users can link their riot id and discord account using `/valorant link`
    - They can update their role in participating servers using `/valorant update-role`
- Added a `/config` command to change guild-specific features
    - Can enable specific modules (though the specific functionality is not implemented)
    - Can assigned a logging channel (also not implemented)
    - Can assign roles to be used for the valorant roles system
    - Can view configs with `/config view`
#### 0.9.3 - Tic Tac Toe (9/8/23)
- Added a fully fledged Tic Tac Toe game
	- User can request other user's to duel them head-to-head
	- Buttons are used as the game board
	- Players can go against PastaBot
		- Adapts its difficulty depending on their win ratio
		- Might get cocky sometimes...
- Added user statistics
	- Players can view their own statistics and other users
- Added leaderboards
	- Leaderboards can be sorted by most wins or most games played
	- They show both the total and separate bot and human scores
- Added Tic Tac Toe help menu
#### 0.9.2 - Activity System (10/30/22)
- Added new Activity System
	- Added a new rotating status system
	- Minecraft server takes control of the icon, and is only shown when someone is online
	- Rotates through multiple statuses
- Added Special Calendar Events
	- Added an activity that displays a countdown for upcoming events
	- Added the `events.json` file to add more events
- Added Birthdays (7/6/23)
	- Added an activity that displays a countdown for upcoming birthdays
	- Added the `birthdays.json` file to add more birthdays
	- Displays "Happy birthday" on each specific day, before resuming the countdown at 7pm
#### 0.9.1 - Minesweeper Update (10/9/22)
- Added more randomized decorative pieces
	- The player emoji is randomized per game
	- The wall colors are randomized per game
- Added a How to Play menu
- Added multiple subcommands 
	- `start` to start a new game
	- `help` to bring up the help menu
	- `leaderboard` to show many leaderboards
	- `stats` to show user stats
- Added data-saving
	- Allows for multiple leaderboards (fastest times, most wins, total games)
	- Allows users to see their own stats as well
- Changed the emoji-based movement to button-based
- Fixed many bugs
	- Fixed the "first click bug"
		- The top left tile is never a bomb
	- Emojis are better optimized as unicode
	- Fixed bombs sometimes not "exploding"
	- Fixed a bot crash when a channel/thread with an activate game is deleted
	- Made the "ends at" timestamp nicer 
### 0.9.0 - Database (8/9/22)
- Added a MongoDB database that the bot can interface with 
	- Logs connections and outages 
- Removed `storage.json` and stored the information in the database
	- Stores the bot command reload timer
	- Added guild specific configurations 
	- Updated the `/reactionroles` command to use the database
#### 0.8.6 - Autocompletion (5/31/22)
- Adds a system where commands can pass suggested values that the user can use when using a command
	- `help`, `reload`  (as of `0.8.6`)
- Added environment variables (6/28/22)
	- Added a `dev` environment which is also reflected in the bot version
	- Replaced the `hidden.json` file with a `.env` for better security and ease of use
	- Updated all private variables to use this system
#### 0.8.5 - Major cleanup and bugfixes (5/16/22)
- Added a way to update the internal minecraft version
- Moved and renamed internal files
- Updated the `/help` command
	- Completely rewrote to match with the `0.7.1` update
	- Added paginated embeds (with buttons!)
	- Added individual command help with extra info
- Fixed the `/server backup` command
	- Updated the backup directory after moving the server to an ssd
	- Added the discord timestamps for relative times
	- Added better error handling to not crash the bot
- Fixed the `/reload` command
	- Fixed after the `0.7.1` update
	- Added better error handling
- Cleaned up code comments and imports
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

