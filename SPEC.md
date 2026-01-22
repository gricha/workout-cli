# Workout CLI Spec

A command-line tool for tracking workouts, managing exercises, and querying training history.

## Goals

- Fast set logging (one command per set)
- Predefined exercise library with muscle group tagging
- Workout templates (Push, Pull, Legs, etc.)
- Progression tracking and PR detection
- Data export for visualization
- Natural querying of history

---

## CLI Commands

### Exercise Library

```bash
# List all exercises
workout exercises list
workout exercises list --muscle back
workout exercises list --type compound

# Add new exercise
workout exercises add "lat-pulldown" \
  --muscles lats,back \
  --type isolation \
  --equipment cable

# Get exercise details
workout exercises show lat-pulldown

# Edit exercise
workout exercises edit lat-pulldown --add-alias "lat pull"
```

### Templates

```bash
# List templates
workout templates list

# Show template details
workout templates show pull-a

# Create template
workout templates create pull-b \
  --exercises "lat-pulldown:3x8-12, cable-row:3x8-12, face-pulls:3x15-20"

# Clone and modify
workout templates create pull-b --from pull-a --remove deadlift --add shrugs

# Delete template
workout templates delete pull-b
```

### Workout Session (Hot Path)

```bash
# Start workout
workout start pull-a                     # from template
workout start --empty                    # freestyle session
workout start --continue                 # resume interrupted session

# Check current status
workout status                           # shows current workout, exercises done/remaining

# Log sets (most frequent operation)
workout log lat-pulldown 100 8           # exercise weight reps
workout log lat-pulldown 100 10 --rir 2  # with RIR
workout log lat-pulldown 100 8,10,10     # batch multiple sets
workout log lat-pulldown +5 10           # relative weight (+5 from last)

# Mid-workout modifications
workout swap face-pulls reverse-pec-deck # swap exercise
workout add shrugs                       # add exercise not in template
workout skip deadlift                    # skip exercise (log reason optional)
workout reorder                          # interactive reorder

# Notes
workout note "elbow pain on curls"       # session-level note
workout note lat-pulldown "went lighter" # exercise-level note

# Finish
workout done                             # end session, calculate stats
workout cancel                           # abort without saving
```

### History & Queries

```bash
# Last workout
workout last                             # summary of last session
workout last --full                      # detailed view

# Exercise history
workout history lat-pulldown             # all-time progression
workout history lat-pulldown --last 10   # last 10 sessions
workout history lat-pulldown --graph     # ASCII chart

# Personal records
workout pr                               # all PRs
workout pr lat-pulldown                  # PR for specific exercise
workout pr --muscle back                 # PRs by muscle group

# Volume analysis
workout volume                           # this week
workout volume --week                    # current week
workout volume --month                   # current month
workout volume --by muscle               # breakdown by muscle group

# Search/query
workout search "back workouts january"   # natural language search
workout workouts --from 2026-01-01 --to 2026-01-31
workout workouts --type pull
```

### Export & Sync

```bash
# Export data
workout export --format json > workouts.json
workout export --format csv > workouts.csv
workout export --format markdown > workouts.md

# Backup/restore
workout backup                           # creates timestamped backup
workout restore backup-2026-01-22.tar.gz
```

---

## Data Model

### Exercise
```json
{
  "id": "lat-pulldown",
  "name": "Lat Pulldown",
  "aliases": ["lat pull", "pulldown"],
  "muscles": ["lats", "back", "biceps"],
  "type": "isolation",
  "equipment": "cable",
  "notes": "Keep chest up, pull to upper chest"
}
```

### Template
```json
{
  "id": "pull-a",
  "name": "Pull A",
  "description": "Pull day with deadlifts",
  "exercises": [
    {"exercise": "deadlift", "sets": 3, "reps": "5-8"},
    {"exercise": "lat-pulldown", "sets": 3, "reps": "8-12"},
    {"exercise": "cable-row", "sets": 3, "reps": "8-12"},
    {"exercise": "face-pulls", "sets": 3, "reps": "15-20"},
    {"exercise": "bayesian-cable-curl", "sets": 2, "reps": "10-12"},
    {"exercise": "hammer-curl", "sets": 2, "reps": "10-12"}
  ]
}
```

### Workout Session
```json
{
  "id": "2026-01-22-pull",
  "date": "2026-01-22",
  "template": "pull-a",
  "startTime": "2026-01-22T19:41:00Z",
  "endTime": "2026-01-22T20:26:00Z",
  "duration": 45,
  "exercises": [
    {
      "exercise": "lat-pulldown",
      "sets": [
        {"weight": 100, "reps": 8, "rir": null},
        {"weight": 100, "reps": 10, "rir": null},
        {"weight": 100, "reps": 10, "rir": null}
      ],
      "notes": "dropped from 120 due to elbow"
    }
  ],
  "notes": ["No deadlifts - heel injury", "Left elbow pain on pulling"],
  "stats": {
    "totalSets": 18,
    "totalVolume": 12500,
    "musclesWorked": ["back", "biceps", "rear delts", "traps"]
  }
}
```

---

## Storage

```
~/.workout/
├── config.json          # user preferences
├── exercises.json       # exercise library (ships with defaults)
├── templates.json       # workout templates
├── current.json         # active session (if workout in progress)
└── workouts/
    ├── 2026-01-22.json
    ├── 2026-01-21.json
    └── ...
```

Primary storage: JSON files (human-readable, git-friendly)

### Config Schema

```json
{
  "units": "lbs",         // "lbs" (default) or "kg"
  "dataDir": "~/.workout" // override data location
}
```

---

## Implementation Notes

### Language
TypeScript/Bun for fast iteration.

### Key Design Decisions

1. **JSON-only storage** — No SQLite; JSON files are fast enough for personal workout history
2. **Offline-first** — No network required, all local
3. **Fast logging** — `workout log` must be <100ms
4. **Forgiving input** — `workout log lat-pull 100 8` should fuzzy-match "lat-pulldown"
5. **Sensible defaults** — `workout start` with no args prompts for template or uses last
6. **Active session in separate file** — `~/.workout/current.json` holds in-progress workout; moved to `workouts/` on `workout done`
7. **Auto-generated exercise IDs** — Slugified from name ("Lat Pulldown" → "lat-pulldown"), can override
8. **Pre-populated exercise library** — Ships with common exercises; user can add/edit/delete
9. **Configurable units** — Default to pounds (lbs), configurable in `config.json`

### Integration with Clawdbot

Clawdbot can call workout CLI directly:
```bash
workout start pull-a
workout log lat-pulldown 100 8
workout log lat-pulldown 100 10
workout done
workout history lat-pulldown --last 3 --json
```

The `--json` flag on queries returns structured data for the agent to parse.

---

## Future Ideas

- **Plate calculator** — `workout plates 135` shows plate breakdown
- **Rest timer** — `workout rest 90` starts countdown
- **Watch/phone companion** — quick logging from wrist
- **AI suggestions** — "You hit 100x10 last time, try 105 today"
- **Supersets** — `workout log -ss bench-press 135 10 / cable-fly 30 12`
- **RPE/RIR tracking** — Already supported, could add trends

---

## MVP Scope

Phase 1:
- [ ] `workout exercises list/add/show/edit/delete`
- [ ] `workout templates list/show/create/delete`
- [ ] `workout start/log/done/status/cancel`
- [ ] `workout history <exercise>`
- [ ] `workout last`
- [ ] JSON storage with pre-populated exercise library
- [ ] Configurable units (lbs/kg)

Phase 2:
- [ ] `workout pr`, `workout volume`
- [ ] Export commands
- [ ] Fuzzy matching

Phase 3:
- [ ] Natural language queries
- [ ] Visualization helpers
- [ ] Sync/backup
