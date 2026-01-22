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
    totalSets += exerciseLog.sets.length;
    for (const set of exerciseLog.sets) {
      totalVolume += set.weight * set.reps;
    }
    const exercise = storage.getExercise(exerciseLog.exercise);
    if (exercise) {
      for (const muscle of exercise.muscles) {
        musclesSet.add(muscle);
      }
    }
  }

  return {
    totalSets,
    totalVolume,
    musclesWorked: Array.from(musclesSet),
  };
}

export function createStartCommand(): Command {
  return new Command('start')
    .description('Start a new workout session')
    .argument('[template]', 'Template ID to use')
    .option('--empty', 'Start an empty freestyle session')
    .option('--continue', 'Resume an interrupted session')
    .action((templateId: string | undefined, options: { empty?: boolean; continue?: boolean }) => {
      const storage = getStorage();

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

export function createLogCommand(): Command {
  return new Command('log')
    .description('Log a set')
    .argument('<exercise>', 'Exercise ID')
    .argument('<weight>', 'Weight (number or +/- for relative)')
    .argument('<reps>', 'Reps (single number or comma-separated for multiple sets)')
    .option('--rir <rir>', 'Reps in reserve (0-10)')
    .action((exerciseId: string, weightStr: string, repsStr: string, options: { rir?: string }) => {
      const storage = getStorage();
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

export function createStatusCommand(): Command {
  return new Command('status').description('Show current workout status').action(() => {
    const storage = getStorage();
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
    }
  });
}

export function createDoneCommand(): Command {
  return new Command('done').description('Finish current workout').action(() => {
    const storage = getStorage();
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

export function createCancelCommand(): Command {
  return new Command('cancel').description('Cancel current workout without saving').action(() => {
    const storage = getStorage();
    const workout = storage.getCurrentWorkout();

    if (!workout) {
      console.error('No active workout to cancel.');
      process.exit(1);
    }

    storage.clearCurrentWorkout();
    console.log(`Cancelled workout: ${workout.id}`);
  });
}
