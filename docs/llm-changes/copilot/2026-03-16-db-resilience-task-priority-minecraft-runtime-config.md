# Database Resilience, Task Priority, and Minecraft Runtime Config Migration

**Related commits / PR:** <!-- paste link here -->

---

## Summary

This change set improves startup reliability and configuration flexibility by introducing deterministic startup task ordering, robust MongoDB connection retries with clear fatal behavior, and migration of Minecraft settings into bot-level database config with a TTL cache so values can be changed without restarting the bot. Command/status consumers were migrated to the new runtime config source, and tests were updated to validate retry behavior and runtime config reads.

---

## Changes

### 1) Startup task ordering is now explicit and deterministic

- Updated `TaskExecute` type to allow async execution (`void | Promise<void>`).
- Added `priority?: number` to `TaskOnce` in `src/util/types/task.ts`.
- Refactored `src/tasks.ts` startup flow:
- Separates `ONCE` tasks from recurring tasks.
- Sorts `ONCE` tasks by descending priority.
- Awaits each `ONCE` task sequentially.
- Keeps `INTERVAL`/`TIME` tasks scheduling behavior intact.
- `INTERVAL` task initial run and interval callbacks now use `void task.execute(...)` to avoid unhandled promise warnings in scheduling paths.

### 2) MongoDB connection task is now resilient with bounded retries

- Updated `src/tasks/databaseConnection.ts`:
- Added constants for retry behavior:
- `MAX_CONNECTION_ATTEMPTS = 5`
- `INITIAL_RETRY_DELAY_MS = 1000`
- `MAX_RETRY_DELAY_MS = 30000`
- Added exponential backoff retry loop around `mongoose.connect(...)`.
- Added per-attempt structured logs with attempt/max metadata.
- Added retry-delay warning logs before each retry.
- Added fatal startup behavior:
- Missing `process.env.mongoDB` now logs and exits with `process.exit(1)`.
- Exhausted retries also logs fatal and exits with `process.exit(1)`.
- Marked database task with highest startup priority (`priority: 100`).
- Set `updateCommands` task priority to `50` so it still runs early, but after DB init.

### 3) Bot config schema now stores Minecraft runtime settings

- Extended `src/schemas/botConfigs.schema.ts` with optional fields:
- `mcServerIP`
- `mcServerSeed`
- `mcServerPort`
- `mcServerVersion`
- Kept these fields on `botConfigs` (bot-wide ownership), matching desired scope.

### 4) Added DB-backed runtime config utility with TTL caching

- Added new file: `src/util/runtimeConfig.ts`.
- Introduced `MinecraftRuntimeConfig` typed shape.
- Added in-memory cache with 60s TTL:
- `getMinecraftRuntimeConfig(forceRefresh?)`
- `invalidateMinecraftRuntimeConfigCache()`
- Runtime config loader behavior:
- Reads by `botID` using `process.env.clientID`.
- If bot config does not exist, creates one and seeds Minecraft values from legacy env/config.
- If bot config exists but Minecraft fields are missing, fills missing values from legacy defaults.
- Uses `database.writeToDatabase(...)` when creating/updating bot config during migration/seed.
- Validates required runtime values and throws with clear logs when missing.

### 5) Migrated Minecraft consumers to runtime config

- Updated `src/commands/minecraft/server.ts`:
- Removed direct use of `config.json` Minecraft values in command flows.
- Replaced direct `process.env` Minecraft usage with `await getMinecraftRuntimeConfig()`.
- Updated subcommand handlers (`status`, `ip`, `seed`, `map`) to async and await runtime config.
- Updated wakeup URL generation to use runtime config IP.
- Updated `src/status/displayServer.ts`:
- Removed direct `config.json`/env reads for Minecraft settings.
- Uses `await getMinecraftRuntimeConfig()` and handles lookup failures with logging + early return.

### 6) Updated tests for new behavior

- Updated `test/tasks/databaseConnection.test.ts`:
- Added process-exit assertions for missing env and exhausted retries.
- Added retry success path test (fails twice then succeeds).
- Added max-attempt failure test (expects 5 attempts and exit).
- Updated tests to await async `execute` behavior.
- Updated `test/commands/minecraft/server.test.ts`:
- Mocked `getMinecraftRuntimeConfig()` and validated command behavior against runtime-config values.
- Removed dependency on direct Minecraft env vars in these test flows.
- Updated `test/status/displayServer.test.ts`:
- Mocked runtime config utility.
- Added failure-path test for runtime config lookup rejection.
- Added new `test/util/runtimeConfig.test.ts`:
- Verifies cache behavior (second read served from cache).
- Verifies seed/create path when bot config is missing.

### 7) Environment/docs alignment

- Updated `.env.example`:
- Removed `mcServerIP` and `mcServerSeed` from required env keys since these are now DB-backed runtime settings.
- Kept secrets and required runtime env entries (`token`, `clientID`, `mongoDB`, `valorantToken`) unchanged.

### 8) Validation and final state

- Ran formatting, linting, build, and test suite.
- Final verification command passed:
- `npm run lint`
- `npm run build`
- `npm run test`
- Existing functionality is preserved while startup behavior is safer and Minecraft config ownership is moved into MongoDB with runtime-refresh capability.

---

*This document was generated by GitHub Copilot (GPT 5.3 Codex) and may not be fully accurate.*
