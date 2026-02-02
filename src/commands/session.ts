import { Command } from 'commander';
import { getStorage } from '../data/storage.js';
import type { Workout, ExerciseLog, SetLog, WorkoutStats } from '../types.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function generateWorkoutId(date: string, template: string | null): string {
  const suffix = template ?? 'freestyle';
  return `${date}-${suffix}`;
}

function calculateStats(workout: Workout, storage: ReturnType<typeof getStorage>): WorkoutStats {
  let totalSets = 0;
  let totalVolume = 0;
  const musclesSet = new Set<string>();

  for (const exerciseLog of workout.exercises) {
    const exercise = storage.getExercise(exerciseLog.exercise);
    if (!exercise) continue;

    totalSets += exerciseLog.sets.length;
    const multiplier = exercise.weightInput === 'per-side' ? 2 : 1;
    for (const set of exerciseLog.sets) {
      totalVolume += set.weight * set.reps * multiplier;
    }
    for (const muscle of exercise.muscles) {
      musclesSet.add(muscle);
    }
  }

  return {
    totalSets,
    totalVolume,
    musclesWorked: Array.from(musclesSet),
  };
}

export function createStartCommand(getProfile: () => string | undefined): Command {
  return new Command('start')
    .description('Start a new workout session')
    .argument('[template]', 'Template ID to use')
    .option('--empty', 'Start an empty freestyle session')
    .option('--continue', 'Resume an interrupted session')
    .action((templateId: string | undefined, options: { empty?: boolean; continue?: boolean }) => {
      const storage = getStorage(getProfile());

      if (options.continue) {
        const current = storage.getCurrentWorkout();
        if (!current) {
          console.error('No active workout to continue.');
          process.exit(1);
        }
        console.log(`Resuming workout: ${current.id}`);
        console.log(`Started: ${current.startTime}`);
        console.log(`Exercises logged: ${current.exercises.length}`);
        return;
      }

      const existing = storage.getCurrentWorkout();
      if (existing) {
        console.error(`Already have an active workout: ${existing.id}`);
        console.error('Use "workout done" to finish or "workout cancel" to abort.');
        process.exit(1);
      }

      const now = new Date();
      const date = formatDate(now);
      let exercises: ExerciseLog[] = [];

      if (!options.empty && templateId) {
        const template = storage.getTemplate(templateId);
        if (!template) {
          console.error(`Template "${templateId}" not found.`);
          process.exit(1);
        }
        exercises = template.exercises.map((e) => ({
          exercise: e.exercise,
          sets: [],
        }));
      }

      const workout: Workout = {
        id: generateWorkoutId(date, options.empty ? null : (templateId ?? null)),
        date,
        template: options.empty ? null : (templateId ?? null),
        startTime: now.toISOString(),
        endTime: null,
        exercises,
        notes: [],
      };

      storage.saveCurrentWorkout(workout);
      console.log(`Started workout: ${workout.id}`);
      if (templateId && !options.empty) {
        console.log(`Template: ${templateId}`);
        console.log(`Exercises: ${exercises.map((e) => e.exercise).join(', ')}`);
      } else {
        console.log('Freestyle session - add exercises with "workout log"');
      }
    });
}

export function createLogCommand(getProfile: () => string | undefined): Command {
  return new Command('log')
    .description('Log a set')
    .argument('<exercise>', 'Exercise ID')
    .argument('<weight>', 'Weight (number or +/- for relative)')
    .argument('<reps>', 'Reps (single number or comma-separated for multiple sets)')
    .option('--rir <rir>', 'Reps in reserve (0-10)')
    .action((exerciseId: string, weightStr: string, repsStr: string, options: { rir?: string }) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const exercise = storage.getExercise(exerciseId);
      if (!exercise) {
        console.error(`Exercise "${exerciseId}" not found.`);
        process.exit(1);
      }

      let weight: number;
      if (weightStr.startsWith('+') || weightStr.startsWith('-')) {
        const history = storage.getExerciseHistory(exercise.id);
        if (history.length === 0) {
          console.error(`No history for "${exercise.id}" to calculate relative weight.`);
          process.exit(1);
        }
        const lastLog = history[0]?.log;
        const lastSet = lastLog?.sets[lastLog.sets.length - 1];
        if (!lastSet) {
          console.error(`No previous sets for "${exercise.id}".`);
          process.exit(1);
        }
        weight = lastSet.weight + parseFloat(weightStr);
      } else {
        weight = parseFloat(weightStr);
      }

      const repsList = repsStr.split(',').map((r) => parseInt(r.trim(), 10));
      const rir = options.rir ? parseInt(options.rir, 10) : null;

      let exerciseLog = workout.exercises.find((e) => e.exercise === exercise.id);
      if (!exerciseLog) {
        exerciseLog = { exercise: exercise.id, sets: [] };
        workout.exercises.push(exerciseLog);
      }

      const newSets: SetLog[] = repsList.map((reps) => ({
        weight,
        reps,
        rir,
      }));

      exerciseLog.sets.push(...newSets);
      storage.saveCurrentWorkout(workout);

      const setCount = newSets.length;
      const config = storage.getConfig();
      const unit = config.units;
      console.log(
        `Logged ${setCount} set${setCount > 1 ? 's' : ''}: ${exercise.name} @ ${weight}${unit} x ${repsList.join(', ')}`
      );
    });
}

export function createStatusCommand(getProfile: () => string | undefined): Command {
  return new Command('status').description('Show current workout status').action(() => {
    const storage = getStorage(getProfile());
    const workout = storage.getCurrentWorkout();

    if (!workout) {
      console.log('No active workout.');
      return;
    }

    const config = storage.getConfig();
    const unit = config.units;

    console.log(`Workout: ${workout.id}`);
    console.log(`Started: ${workout.startTime}`);
    if (workout.template) {
      console.log(`Template: ${workout.template}`);
    }
    console.log('');

    if (workout.exercises.length === 0) {
      console.log('No exercises logged yet.');
      return;
    }

    console.log('Exercises:');
    for (const log of workout.exercises) {
      const exercise = storage.getExercise(log.exercise);
      const name = exercise?.name ?? log.exercise;
      if (log.sets.length === 0) {
        console.log(`  ${name}: (no sets)`);
      } else {
        const setsStr = log.sets.map((s) => `${s.weight}${unit}x${s.reps}`).join(', ');
        console.log(`  ${name}: ${setsStr}`);
      }
      if (log.notes) {
        console.log(`    Note: ${log.notes}`);
      }
    }

    if (workout.notes.length > 0) {
      console.log('');
      console.log('Session Notes:');
      for (const note of workout.notes) {
        console.log(`  - ${note}`);
      }
    }
  });
}

export function createDoneCommand(getProfile: () => string | undefined): Command {
  return new Command('done').description('Finish current workout').action(() => {
    const storage = getStorage(getProfile());
    const workout = storage.getCurrentWorkout();

    if (!workout) {
      console.error('No active workout to finish.');
      process.exit(1);
    }

    workout.endTime = new Date().toISOString();
    const stats = calculateStats(workout, storage);
    workout.stats = stats;

    storage.finishWorkout(workout);

    const config = storage.getConfig();
    const unit = config.units;

    console.log(`Workout complete: ${workout.id}`);
    console.log(
      `Duration: ${Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60000)} minutes`
    );
    console.log(`Total sets: ${stats.totalSets}`);
    console.log(`Total volume: ${stats.totalVolume}${unit}`);
    console.log(`Muscles worked: ${stats.musclesWorked.join(', ')}`);
  });
}

export function createCancelCommand(getProfile: () => string | undefined): Command {
  return new Command('cancel').description('Cancel current workout without saving').action(() => {
    const storage = getStorage(getProfile());
    const workout = storage.getCurrentWorkout();

    if (!workout) {
      console.error('No active workout to cancel.');
      process.exit(1);
    }

    storage.clearCurrentWorkout();
    console.log(`Cancelled workout: ${workout.id}`);
  });
}

export function createNoteCommand(getProfile: () => string | undefined): Command {
  return new Command('note')
    .description('Add a note to the current workout')
    .argument('<text...>', 'Note text (or exercise ID followed by note text)')
    .action((textParts: string[]) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const firstArg = textParts[0]!;
      const exercise = storage.getExercise(firstArg);

      if (exercise && textParts.length > 1) {
        const noteText = textParts.slice(1).join(' ');
        let exerciseLog = workout.exercises.find((e) => e.exercise === exercise.id);
        if (!exerciseLog) {
          exerciseLog = { exercise: exercise.id, sets: [] };
          workout.exercises.push(exerciseLog);
        }
        exerciseLog.notes = exerciseLog.notes ? `${exerciseLog.notes}; ${noteText}` : noteText;
        storage.saveCurrentWorkout(workout);
        console.log(`Added note to ${exercise.name}: ${noteText}`);
      } else {
        const noteText = textParts.join(' ');
        workout.notes.push(noteText);
        storage.saveCurrentWorkout(workout);
        console.log(`Added session note: ${noteText}`);
      }
    });
}

export function createSwapCommand(getProfile: () => string | undefined): Command {
  return new Command('swap')
    .description('Swap an exercise in the current workout with another')
    .argument('<old-exercise>', 'Exercise ID to replace')
    .argument('<new-exercise>', 'Exercise ID to swap in')
    .action((oldExerciseId: string, newExerciseId: string) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const oldExercise = storage.getExercise(oldExerciseId);
      if (!oldExercise) {
        console.error(`Exercise "${oldExerciseId}" not found.`);
        process.exit(1);
      }

      const newExercise = storage.getExercise(newExerciseId);
      if (!newExercise) {
        console.error(`Exercise "${newExerciseId}" not found.`);
        process.exit(1);
      }

      const exerciseLogIndex = workout.exercises.findIndex((e) => e.exercise === oldExercise.id);
      if (exerciseLogIndex === -1) {
        console.error(`Exercise "${oldExercise.name}" is not in the current workout.`);
        process.exit(1);
      }

      const existingNewLog = workout.exercises.find((e) => e.exercise === newExercise.id);
      if (existingNewLog) {
        console.error(`Exercise "${newExercise.name}" is already in the current workout.`);
        process.exit(1);
      }

      const exerciseLog = workout.exercises[exerciseLogIndex]!;
      const setsCount = exerciseLog.sets.length;
      exerciseLog.exercise = newExercise.id;

      storage.saveCurrentWorkout(workout);
      console.log(`Swapped ${oldExercise.name} → ${newExercise.name}`);
      if (setsCount > 0) {
        console.log(`Moved ${setsCount} set${setsCount > 1 ? 's' : ''} to ${newExercise.name}`);
      }
    });
}

export function createAddCommand(getProfile: () => string | undefined): Command {
  return new Command('add')
    .description('Add an exercise to the current workout')
    .argument('<exercise>', 'Exercise ID to add')
    .action((exerciseId: string) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const exercise = storage.getExercise(exerciseId);
      if (!exercise) {
        console.error(`Exercise "${exerciseId}" not found.`);
        process.exit(1);
      }

      const existingLog = workout.exercises.find((e) => e.exercise === exercise.id);
      if (existingLog) {
        console.error(`Exercise "${exercise.name}" is already in the current workout.`);
        process.exit(1);
      }

      workout.exercises.push({ exercise: exercise.id, sets: [] });
      storage.saveCurrentWorkout(workout);
      console.log(`Added ${exercise.name} to workout`);
    });
}

export function createUndoCommand(getProfile: () => string | undefined): Command {
  return new Command('undo')
    .description('Remove the last logged set')
    .argument('[exercise]', 'Exercise ID (defaults to last exercise with sets)')
    .action((exerciseId: string | undefined) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const config = storage.getConfig();
      const unit = config.units;

      let exerciseLog: ExerciseLog | undefined;
      let exerciseName: string;

      if (exerciseId) {
        const exercise = storage.getExercise(exerciseId);
        if (!exercise) {
          console.error(`Exercise "${exerciseId}" not found.`);
          process.exit(1);
        }
        exerciseLog = workout.exercises.find((e) => e.exercise === exercise.id);
        exerciseName = exercise.name;
        if (!exerciseLog) {
          console.error(`Exercise "${exercise.name}" is not in the current workout.`);
          process.exit(1);
        }
      } else {
        for (let i = workout.exercises.length - 1; i >= 0; i--) {
          const log = workout.exercises[i]!;
          if (log.sets.length > 0) {
            exerciseLog = log;
            break;
          }
        }
        if (!exerciseLog) {
          console.error('No sets to undo.');
          process.exit(1);
        }
        const exercise = storage.getExercise(exerciseLog.exercise);
        exerciseName = exercise?.name ?? exerciseLog.exercise;
      }

      if (exerciseLog.sets.length === 0) {
        console.error(`No sets to undo for ${exerciseName}.`);
        process.exit(1);
      }

      const removedSet = exerciseLog.sets.pop()!;
      storage.saveCurrentWorkout(workout);
      console.log(
        `Removed set: ${removedSet.weight}${unit} x ${removedSet.reps} from ${exerciseName}`
      );
    });
}

export function createEditCommand(getProfile: () => string | undefined): Command {
  return new Command('edit')
    .description('Edit a specific set')
    .argument('<exercise>', 'Exercise ID')
    .argument('<set>', 'Set number (1-indexed)')
    .argument('[weight]', 'New weight')
    .argument('[reps]', 'New reps')
    .option('--reps <reps>', 'New reps (alternative to positional)')
    .option('--rir <rir>', 'New RIR value')
    .action(
      (
        exerciseId: string,
        setNum: string,
        weightStr: string | undefined,
        repsStr: string | undefined,
        options: { reps?: string; rir?: string }
      ) => {
        const storage = getStorage(getProfile());
        const workout = storage.getCurrentWorkout();

        if (!workout) {
          console.error('No active workout. Start one with "workout start".');
          process.exit(1);
        }

        const exercise = storage.getExercise(exerciseId);
        if (!exercise) {
          console.error(`Exercise "${exerciseId}" not found.`);
          process.exit(1);
        }

        const exerciseLog = workout.exercises.find((e) => e.exercise === exercise.id);
        if (!exerciseLog) {
          console.error(`Exercise "${exercise.name}" is not in the current workout.`);
          process.exit(1);
        }

        const setIndex = parseInt(setNum, 10) - 1;
        if (isNaN(setIndex) || setIndex < 0 || setIndex >= exerciseLog.sets.length) {
          console.error(
            `Invalid set number. ${exercise.name} has ${exerciseLog.sets.length} set(s).`
          );
          process.exit(1);
        }

        const set = exerciseLog.sets[setIndex]!;
        const config = storage.getConfig();
        const unit = config.units;
        const before = `${set.weight}${unit}x${set.reps}`;

        if (weightStr !== undefined) {
          set.weight = parseFloat(weightStr);
        }

        const repsValue = repsStr ?? options.reps;
        if (repsValue !== undefined) {
          set.reps = parseInt(repsValue, 10);
        }

        if (options.rir !== undefined) {
          set.rir = parseInt(options.rir, 10);
        }

        storage.saveCurrentWorkout(workout);
        const after = `${set.weight}${unit}x${set.reps}`;
        console.log(`Updated set ${setNum}: ${before} → ${after}`);
      }
    );
}

export function createDeleteCommand(getProfile: () => string | undefined): Command {
  return new Command('delete')
    .description('Delete a specific set')
    .argument('<exercise>', 'Exercise ID')
    .argument('<set>', 'Set number (1-indexed)')
    .action((exerciseId: string, setNum: string) => {
      const storage = getStorage(getProfile());
      const workout = storage.getCurrentWorkout();

      if (!workout) {
        console.error('No active workout. Start one with "workout start".');
        process.exit(1);
      }

      const exercise = storage.getExercise(exerciseId);
      if (!exercise) {
        console.error(`Exercise "${exerciseId}" not found.`);
        process.exit(1);
      }

      const exerciseLog = workout.exercises.find((e) => e.exercise === exercise.id);
      if (!exerciseLog) {
        console.error(`Exercise "${exercise.name}" is not in the current workout.`);
        process.exit(1);
      }

      const setIndex = parseInt(setNum, 10) - 1;
      if (isNaN(setIndex) || setIndex < 0 || setIndex >= exerciseLog.sets.length) {
        console.error(
          `Invalid set number. ${exercise.name} has ${exerciseLog.sets.length} set(s).`
        );
        process.exit(1);
      }

      const config = storage.getConfig();
      const unit = config.units;
      const [removedSet] = exerciseLog.sets.splice(setIndex, 1);
      storage.saveCurrentWorkout(workout);
      console.log(
        `Deleted set ${setNum}: ${removedSet!.weight}${unit} x ${removedSet!.reps} from ${exercise.name}`
      );
    });
}
