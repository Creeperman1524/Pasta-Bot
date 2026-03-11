# Integration and DB Failure Tests for Minesweeper, Tictactoe, and All Commands

**Related commits / PR:** <!-- paste link here -->

---

## Summary

Expanded the Jest test suite with ~185 new tests covering full game integration flows and database failure paths. Minesweeper and tictactoe went from unit-only tests to having complete integration tests that simulate button presses through a `MockCollector`, verify embed output, and assert stats are saved. Database failure tests were added for all commands that write to MongoDB, following the pattern established in `rankRole.test.ts`. Two source bugs in `tictactoe.ts` were discovered and fixed during testing.

---

## Changes

### New test infrastructure

**`test/helpers/mockMessage.ts`** (new file)

- `MockCollector` — an `EventEmitter` subclass with a `.stop()` method that emits the `'end'` event, matching the Discord.js collector API.
- `createMockMessage(embeds?)` — factory returning a mock `Message` where `embeds` stores whatever `EmbedBuilder[]` was passed to `editReply`, and `createMessageComponentCollector()` returns a `MockCollector`. This lets integration tests drive the collector-based game loops.

**`test/helpers/mockInteraction.ts`** (updated)

- Added `useMockMessage?: boolean` flag to `createMockInteraction`. When set, `editReply` returns a `MockMessage` (capturing the passed embeds) rather than a plain `{}`. This is required because game code reads `game.embed.embeds[0]` and calls `game.embed.createMessageComponentCollector()` against the returned message object.

### Minesweeper tests (`test/commands/minigames/minesweeper.test.ts`)

Six new `describe` blocks added:

- **`generateText()` rendering** — all 7 tile statuses (hidden, shown-empty, numbered, player, flag, border, exploded, incorrect-flag) tested against their expected emoji. Mine-reveal sets `game.player.lost`.
- **`floodFill()` behaviour** — single-tile reveal for `num > 0` tiles, recursive zero-propagation, stops at borders and already-revealed tiles, correct `tilesLeft` decrement.
- **`updateBoard()` / `updatePlayer()` actions** — direction buttons disabled at board edges; flagging a hidden tile sets status 3 and increments `game.flags`; unflagging reverses that; digging a shown tile is a no-op.
- **`/minesweeper start` integration** — `editReply` called with embed title `'Minesweeper 💣'`, non-empty board description with emoji, and movement button rows.
- **Movement and flagging integration** — Right and Flag button presses emitted on `MockCollector`; confirms `editReply` is called again with updated state; also confirms button clicks from other users are ignored.
- **Win / lose / timeout integration** — digging a mine tile produces a lose embed with no components and saves stats; digging the last safe tile produces a win embed with time field and saves stats; collector `end` event when not yet won produces a lose embed; `end` when already won does not produce another `editReply`.
- **DB failure tests** — `saveData` with the second `findOneAndUpdate` returning `null` on both win and lose paths; asserts `writeToDatabase` is not called and the error is logged.

**`src/commands/minigames/minesweeper.ts`** — added `updateBoard`, `updatePlayer`, `generateText`, and `gameLoop` to `testingFuncs` exports.

### Tictactoe tests (`test/commands/minigames/tictactoe.test.ts`)

Five new `describe` blocks added:

- **`updateDisplay()` unit tests** — empty cell (Secondary style, blank emoji, not disabled), Player1 cell (Primary, X emoji, disabled), Player2 cell (Primary, O emoji, disabled).
- **`displayWinningPositions()` unit tests** — horizontal, vertical, negative diagonal, and positive diagonal wins each highlight the correct three buttons with Success style.
- **vs Bot integration** — initial embed verified; wrong-user button clicks ignored; `gameLoop` called directly for player1 wins, bot wins, and tie (all check the final embed description); game timeout via `collector.stop()` → `ranOutOfTime` embed with disabled buttons and stats saved.
- **vs User integration** — self-challenge rejected; bot-account challenge rejected; confirmation request embed sent with Yes/No buttons and player2 mention; player2 accepts (game board shown); player2 denies (denied embed shown); confirmation times out (not-accepted embed shown); third-party click on confirmation ignored; turn enforcement (player2 cannot move on player1's turn); player1 wins vs human; player2 wins vs human.
- **DB failure tests** — `saveData` called directly (exported from `testingFuncs`) with the second `findOneAndUpdate` returning `null`; asserts `writeToDatabase` not called. `getWinRate` with `findOne` returning `null` defaults `playerWinRate` to `0.5` (no crash). `getWinRate` with `totalBot == 0` also defaults to `0.5` (division-by-zero guard).

**`src/commands/minigames/tictactoe.ts`** — added `updateDisplay`, `displayWinningPositions`, `gameLoop`, and `saveData` to `testingFuncs` exports. Also fixed two source bugs (see below).

### Config DB failure tests (`test/commands/admin/config.test.ts`)

New `describe('/config — database failure tests')` block: when the second `findOneAndUpdate` (the config write) returns `null`, `editReply` contains `'Could not update the database'`.

### ReactionRole DB failure tests (`test/commands/admin/reactionrole.test.ts`)

New `describe('/reactionrole — database failure tests')` block covering all four subcommands:

- **create** — write returns `null` → `'Could not update the database'` in reply.
- **delete** — `findOne` mocked to find the target message, write returns `null` → error reply.
- **add** — full channel/message/role/embed setup required; write returns `null` → error reply. Embed mocked as a plain object `{ fields: [], toJSON: () => ({ fields: [] }) }` because `message.embeds` in discord.js returns `Embed` objects (which have `.fields` directly), not `EmbedBuilder` objects.
- **remove** — same setup as add; write returns `null` → error reply.

Also removed a stray `import { on } from 'node:cluster'` that caused a lint error.

### Source bugs fixed in `tictactoe.ts`

**Wrong Tie check in `gameEnded`**: The condition was `if (game.winner == 2)` to detect a tie, but `Winner.Tie == 3` and `Winner.Player2 == 2`. This meant a Player2 win was being treated as a tie and vice versa. Fixed to `if (game.winner == Winner.Tie)`.

**Missing `return` in `startGameUser` after denial**: After `deniedRequest(game, false)` was called (player2 declined), there was no `return`, so execution continued and the game started anyway. Added `return;` immediately after the call.

### Key technical notes

- `gameEnded` and `ranOutOfTime` call `saveData` without `await` (fire-and-forget). All integration tests that trigger a game end must call `await flushPromises()` (wrapping `setImmediate`) after the triggering action, otherwise pending saves bleed into subsequent tests and consume mock `Once` return values out of order.
- `clearMocks: true` in Jest 30 calls `mockClear()` before each test. `mockClear()` resets mock state and config (including the `specificMockImpls` Once queue). `mockReset()` is only needed additionally when you want to clear a non-Once default implementation (`mockResolvedValue`).
- The cleanest way to test `saveData` DB failures is to export the function from `testingFuncs` and call it directly, rather than triggering it indirectly through `gameLoop`, avoiding async pollution between tests.

---

*This document was generated by GitHub Copilot (Claude Sonnet 4.6) and may not be fully accurate.*
