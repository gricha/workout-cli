# workout-cli

A command-line tool for tracking workouts, managing exercises, and analyzing training progress.

## Installation

```bash
# Clone and build
git clone https://github.com/anomalyco/workout-cli.git
cd workout-cli
bun install
bun run build

# The CLI is now available as 'workout'
workout --help
```

**Requirements:** [Bun](https://bun.sh) >= 1.3.5

## Quick Start

```bash
# Create a workout template
workout templates create "Push Day" -e "bench-press:4x8-12, overhead-press:3x8-10, lateral-raise:3x12-15"

# Start a workout
workout start push-day

# Log sets
workout log bench-press 135 8,8,7,6
workout log overhead-press 95 10,9,8

# Finish and see summary
workout done
```

## Commands

### Workout Sessions

#### `workout start [template]`
Start a new workout session.

```bash
# Start from a template
workout start push-day

# Start empty freestyle session
workout start --empty

# Resume an interrupted session
workout start --continue
```

#### `workout log <exercise> <weight> <reps>`
Log sets for an exercise.

```bash
# Log a single set
workout log bench-press 185 8

# Log multiple sets at once
workout log squat 225 5,5,5,5,5

# Use relative weight from last session
workout log deadlift +10 5    # 10 lbs more than last time
workout log bench-press -5 8  # 5 lbs less

# Track reps in reserve (RIR)
workout log bench-press 185 8 --rir 2
```

#### `workout status`
Show current workout progress.

```bash
workout status
# Output:
# Workout: 2026-01-23-push-day
# Started: 2026-01-23T10:00:00.000Z
# Template: push-day
#
# Exercises:
#   Bench Press: 185kgx8, 185kgx8, 185kgx7
#   Overhead Press: (no sets)
```

#### `workout note <text...>`
Add notes to your session or specific exercises.

```bash
# Add a session note
workout note "Felt strong today, good sleep last night"

# Add a note to a specific exercise
workout note bench-press "Tried wider grip, felt better on shoulders"
```

#### `workout swap <old-exercise> <new-exercise>`
Swap an exercise in the current workout with another.

```bash
# Equipment busy? Swap to an alternative
workout swap bench-press dumbbell-bench-press
# Output: Swapped Bench Press -> Dumbbell Bench Press
#         Moved 3 sets to Dumbbell Bench Press
```

#### `workout add <exercise>`
Add an exercise to the current workout.

```bash
# Add an extra exercise not in your template
workout add face-pulls
```

#### `workout done`
Finish the current workout and save it.

```bash
workout done
# Output:
# Workout complete: 2026-01-23-push-day
# Duration: 65 minutes
# Total sets: 18
# Total volume: 24,500kg
# Muscles worked: chest, triceps, front-delts, shoulders
```

#### `workout cancel`
Discard the current workout without saving.

```bash
workout cancel
```

---

### Exercise Library

#### `workout exercises list`
List all exercises in your library.

```bash
# List all exercises
workout exercises list

# Filter by muscle group
workout exercises list --muscle chest

# Filter by type
workout exercises list --type compound

# JSON output
workout exercises list --json
```

#### `workout exercises show <id>`
Show details for an exercise.

```bash
workout exercises show bench-press
# Output:
# Name: Bench Press
# ID: bench-press
# Type: compound
# Equipment: barbell
# Muscles: chest, triceps, front-delts
# Aliases: bench, flat bench
```

#### `workout exercises add <name>`
Add a custom exercise.

```bash
workout exercises add "Incline Dumbbell Curl" \
  --muscles biceps \
  --type isolation \
  --equipment dumbbell \
  --aliases "incline curl"
```

#### `workout exercises edit <id>`
Edit an existing exercise.

```bash
workout exercises edit bench-press --add-alias "flat bench press"
workout exercises edit squat --notes "Keep core tight, break at hips first"
```

#### `workout exercises delete <id>`
Remove an exercise from the library.

```bash
workout exercises delete my-custom-exercise
```

---

### Workout Templates

#### `workout templates list`
List all templates.

```bash
workout templates list
# Output:
# push-day - Push Day (5 exercises)
# pull-day - Pull Day (5 exercises)
# leg-day - Leg Day (4 exercises)
```

#### `workout templates show <id>`
Show template details.

```bash
workout templates show push-day
# Output:
# Name: Push Day
# ID: push-day
# Description: Chest, shoulders, and triceps
#
# Exercises:
#   - bench-press: 4x8-12
#   - overhead-press: 3x8-10
#   - lateral-raise: 3x12-15
```

#### `workout templates create <name>`
Create a new template.

```bash
workout templates create "Upper Body" \
  -e "bench-press:4x8, barbell-row:4x8, overhead-press:3x10, pull-up:3x8" \
  -d "Upper body push/pull workout"
```

#### `workout templates delete <id>`
Delete a template.

```bash
workout templates delete upper-body
```

---

### History & Analytics

#### `workout last`
Show your most recent workout.

```bash
# Summary view
workout last

# Full details
workout last --full

# JSON output
workout last --json
```

#### `workout history <exercise>`
View history for a specific exercise.

```bash
workout history bench-press
# Output:
# History for Bench Press (last 10 sessions):
#
# 2026-01-23: 185x8, 185x8, 185x7 (best: 185kg x 8)
# 2026-01-20: 180x8, 180x8, 180x8 (best: 180kg x 8)
# ...

# Show more sessions
workout history squat --last 20
```

#### `workout pr [exercise]`
Show personal records.

```bash
# All PRs
workout pr

# Specific exercise
workout pr bench-press

# Filter by muscle group
workout pr --muscle chest

# JSON output
workout pr --json
```

**Output:**
```
Personal Records:

Deadlift: 200kg x 5 (est. 1RM: 233kg) - 2026-01-15
Squat: 180kg x 5 (est. 1RM: 210kg) - 2026-01-18
Bench Press: 140kg x 6 (est. 1RM: 168kg) - 2026-01-20
```

#### `workout volume`
Analyze training volume over time.

```bash
# Last 4 weeks (default)
workout volume

# This week
workout volume --week

# This month
workout volume --month

# Group by muscle or exercise
workout volume --by muscle
workout volume --by exercise
```

**Output:**
```
Volume Analysis: Last 4 weeks
(2025-12-26 to 2026-01-23)

Workouts: 12
Total sets: 216
Total volume: 158,400kg

Top Muscles:
  chest: 32,000kg
  quads: 28,500kg
  back: 25,200kg
```

#### `workout progression <exercise>`
Track strength progression over time.

```bash
workout progression bench-press
```

**Output:**
```
Progression for Bench Press:

Est. 1RM change: +12kg (156 -> 168)

Date       | Best Set         | Est 1RM | Volume
-----------|------------------|---------|--------
2026-01-05 | 130kg x 8        | 156kg   | 4,160kg
2026-01-10 | 135kg x 7        | 162kg   | 3,780kg
2026-01-15 | 137.5kg x 7      | 165kg   | 3,850kg
2026-01-20 | 140kg x 6        | 168kg   | 3,360kg
```

---

## Built-in Exercises

The CLI comes with 30+ pre-populated exercises covering all major muscle groups:

| Category | Exercises |
|----------|-----------|
| **Chest** | Bench Press, Incline Bench Press, Dumbbell Bench Press, Cable Fly, Pec Deck |
| **Back** | Deadlift, Barbell Row, Pull Up, Lat Pulldown, Cable Row |
| **Shoulders** | Overhead Press, Dumbbell Shoulder Press, Lateral Raise, Face Pulls, Rear Delt Fly |
| **Legs** | Squat, Front Squat, Romanian Deadlift, Leg Press, Leg Curl, Leg Extension, Hip Thrust, Lunges, Calf Raise |
| **Arms** | Bicep Curl, Barbell Curl, Hammer Curl, Tricep Pushdown, Skull Crusher, Dips |
| **Core** | Plank, Cable Crunch |

## Data Storage

All data is stored locally in `~/.workout/`:

```
~/.workout/
  config.json      # User preferences
  exercises.json   # Custom exercises
  templates.json   # Workout templates  
  history/         # Completed workouts
  current.json     # Active workout (if any)
```

## JSON Output

All commands support `--json` for machine-readable output, making it easy to integrate with other tools:

```bash
workout pr --json | jq '.[] | select(.exerciseName == "Bench Press")'
workout volume --week --json
workout history squat --json
```

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun run test

# Lint and format
bun run check

# Full validation (lint + test + build)
bun run validate
```

## License

MIT
