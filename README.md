# Pasta Bot :spaghetti:

A [Discord](https://discord.com) Bot that I created with many different minigames and features to use within my own discord servers.

<p align="center">
    <img src="https://repository-images.githubusercontent.com/309200127/89ab0f80-3186-11eb-96f2-d7bbafbfe63f" alt="An image of pasta">
</p>

## :computer: Features

- Fully integrated with discord slash (/) commands
  - Provides autocomplete for certain command options too
- Customizable status display
  - Shows birthdays supplied by the `birthdays.json` file
  - Shows holidays/events supplied by the `events.json`
  - Integrates with a Minecraft server to display the current status of the server and current player count
- Reaction role messages that can be edited at any time
- Minecraft server integration to give the status of a Minecraft server
- Valorant integration to give custom roles for specific ranks
- And more!

## :rocket: Minigames

### Minesweeper

- Play a game of minesweeper right in discord
  - Use button controls for digging, moving, and flagging
- View player game statistics
  - Global leaderboard for fastest games, most played games and most won games

<p align="center">
    <img src="./docs/assets/minesweeper-digging.gif" alt="Digging in Minesweeper">
    <img src="./docs/assets/minesweeper-flagging.gif" alt="Flagging in Minesweeper">
    <img src="./docs/assets/minesweeper-losing.gif" alt="Losing in Minesweeper">
    <img src="./docs/assets/minesweeper-full.png" alt="Full game of Minesweeper">
</p>

### Tic-Tac-Toe

- Ability to play against PastaBot themselves (with a scaling difficulty)
- Challenge other players to a match
- View player game statistics
  - Global leaderboard for most played and most won games

<p align="center">
    <img src="./docs/assets/tictactoe-full.png" alt="Full game of Tic-Tac-Toe">
</p>

## :scroll: Changelog

> [!WARNING]
> The changelog is currently out of date and is receiving several updates as I go through and re-categorize each commit

[View changelog](CHANGELOG.md)

## :wrench: Building

> [!NOTE]
> This is mostly intended to be used for my own personal use. I will not be providing an in-depth setup guide

Setup can be accomplished with:

1. Cloning this repo
2. Running `npm install`
3. Filling out the `.env` file (an example can be found in `.env.example`)
4. Running the bot with `npm run start`
