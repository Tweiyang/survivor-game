# Multiplayer Bugfix — Post-Coop Stabilization

**Archived:** 2026-04-02  
**Parent Change:** 2026-03-31-multiplayer-coop  
**Type:** Hotfix / Bug Stabilization

---

## Overview

A series of critical bug fixes applied after the initial multiplayer co-op system was archived. These issues surfaced during integration testing of the full single-player ↔ multiplayer flow and multi-level progression.

---

## Bugs Fixed

### 1. Scene Data Leaking Between Modes
**Symptom:** Playing single-player, completing Level 1, then switching to multiplayer caused the client to load Level 2 visuals while the server started on Level 1.  
**Root Cause:** `sceneData.levelId` was set to `'level_2'` by `LevelCompleteUI` during single-player and never cleared when switching modes.  
**Fix:** Added `delete sceneData.levelId` and `delete sceneData.isOnline` at all mode-transition entry points:
- `CharacterSelectScene._confirm()`
- `LobbyScene._startSinglePlayer()`
- `LobbyScene._startBattle()`
- `LevelCompleteUI._handleClick('select')`

### 2. Double Character (Local Player Duplicated as Remote Entity)
**Symptom:** Two overlapping player sprites at the same position — the local player plus a "remote" duplicate.  
**Root Cause:** `StateSynchronizer._onPlayerAdd()` used strict `===` comparison for `sessionId`, which could fail if types differed.  
**Fix:**
- Changed to `String(sessionId) === String(this._localSessionId)` for robust matching
- Added duplicate-creation guard checking `_networkEntities.has(sessionId)`
- Added debug logging for session ID matching

### 3. Level Complete UI — No "Next Level" Button in Online Mode
**Symptom:** First-level completion popup appeared in multiplayer but had no "Next Level" button, showing "全部通关" (All Complete) style instead.  
**Root Cause:** Online intermediate level completions passed `nextLevelId: null`, which `LevelCompleteUI` interpreted as "all levels done."  
**Fix:**
- Introduced `nextLevelId: '__auto__'` sentinel for online intermediate completions
- `LevelCompleteUI.render()` now shows `⏳ 即将进入下一关...` (auto-transition message) for `__auto__` mode
- Replaced broken `_onlineBanner` anti-duplicate logic with `levelCompleteUI.isShowing` check

### 4. Second Level Boss Never Spawned
**Symptom:** After completing Level 1 and transitioning to Level 2, killing the required monsters opened the Boss gate, but the Boss was never encountered. Players died to regular monsters with `Game Over — all players dead`.  
**Root Cause:** `ServerSpawner.loadLevel()` added ALL rooms' spawns (including boss room) to the queue at level start. Boss room monsters spawned behind closed doors, possibly exhausting their spawn counts before the gate opened.  
**Fix:**
- `ServerSpawner.loadLevel()` now separates boss room spawns (`room.type === 'boss'`) into `_bossRoomQueue`
- New `activateBossRoom()` method moves deferred spawns into the active queue
- `BattleRoom._checkLevelProgress()` calls `spawner.activateBossRoom()` when the boss gate opens

### 5. Players Not Healed Between Levels
**Symptom:** Players entered Level 2 with residual HP from Level 1, dying quickly.  
**Root Cause:** `_loadNextLevel()` set `p.alive = true` but did not restore HP.  
**Fix:** Added `p.hp = p.maxHp` in `_loadNextLevel()` player reset loop.

### 6. Boss Gate Not Initialized on Level Transition (Client)
**Symptom:** Boss gate wall tiles not properly set up when transitioning to a new level in online mode.  
**Root Cause:** `_onNetLevelChangeHandler` rebuilt the tilemap but didn't call `_initBossGate()`.  
**Fix:** Added `this._initBossGate()` call in the online level change handler.

---

## Files Modified

### Client
| File | Changes |
|------|---------|
| `src/scenes/CharacterSelectScene.js` | Clear `levelId` and `isOnline` from sceneData on confirm |
| `src/scenes/LobbyScene.js` | Clear `levelId` in `_startSinglePlayer()` and `_startBattle()` |
| `src/scenes/BattleScene.js` | `__auto__` nextLevelId for online mid-level; `isShowing` anti-duplicate; `_initBossGate()` on net level change; clear `_data` on UI close |
| `src/ui/LevelCompleteUI.js` | `__auto__` render branch with `⏳ 即将进入下一关...`; clear `levelId` on "返回选角" |
| `src/systems/StateSynchronizer.js` | `String()` comparison for sessionId; duplicate entity guard; debug logging |

### Server
| File | Changes |
|------|---------|
| `server/src/systems/ServerSpawner.ts` | `_bossRoomQueue` deferred spawn; `activateBossRoom()` method; boss/normal room separation in `loadLevel()` |
| `server/src/rooms/BattleRoom.ts` | Call `spawner.activateBossRoom()` on gate open; `p.hp = p.maxHp` in `_loadNextLevel()`; enhanced debug logging |

---

## Testing Verification

- [x] Single-player: Level 1 → Level 2 → Victory — works correctly
- [x] Single-player → return to select → Multiplayer: starts from Level 1 (no residual data)
- [x] Multiplayer Level 1: Boss gate opens → Boss spawns → Boss killed → "⏳ 即将进入下一关..." → auto-transition
- [x] Multiplayer Level 2: Players spawn with full HP → Boss gate opens → Boss spawns → Boss killed → "全部通关" popup
- [x] No duplicate player entities in multiplayer
