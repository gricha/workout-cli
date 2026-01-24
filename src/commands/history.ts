import { Command } from 'commander';
import { getStorage } from '../data/storage.js';

export function createLastCommand(getProfile: () => string | undefined): Command {
  return new Command('last')
    .description('Show last workout')
    .option('--full', 'Show full details')
    .option('--json', 'Output as JSON')
    .action((options: { full?: boolean; json?: boolean }) => {
      const storage = getStorage(getProfile());
      const workout = storage.getLastWorkout();

      if (!workout) {
        console.log('No workouts found.');
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(workout, null, 2));
        return;
      }

      const config = storage.getConfig();
      const unit = config.units;

      console.log(`Workout: ${workout.id}`);
      console.log(`Date: ${workout.date}`);
      if (workout.template) {
        console.log(`Template: ${workout.template}`);
      }
      if (workout.stats) {
        console.log(
          `Sets: ${workout.stats.totalSets} | Volume: ${workout.stats.totalVolume}${unit}`
        );
      }

      if (options.full) {
        console.log('');
        console.log('Exercises:');
        for (const log of workout.exercises) {
          const exercise = storage.getExercise(log.exercise);
          const name = exercise?.name ?? log.exercise;
          console.log(`  ${name}:`);
          for (const set of log.sets) {
            const rirStr = set.rir !== null ? ` @${set.rir}RIR` : '';
            console.log(`    ${set.weight}${unit} x ${set.reps}${rirStr}`);
          }
          if (log.notes) {
            console.log(`    Note: ${log.notes}`);
          }
        }
        if (workout.notes.length > 0) {
          console.log('');
          console.log('Notes:');
          for (const note of workout.notes) {
            console.log(`  - ${note}`);
          }
        }
      } else {
        console.log('');
        for (const log of workout.exercises) {
          const exercise = storage.getExercise(log.exercise);
          const name = exercise?.name ?? log.exercise;
          const bestSet = log.sets.reduce(
            (best, set) => (set.weight * set.reps > best.weight * best.reps ? set : best),
            log.sets[0]!
          );
          if (bestSet) {
            console.log(
              `  ${name}: ${bestSet.weight}${unit} x ${bestSet.reps} (${log.sets.length} sets)`
            );
          }
        }
        if (workout.notes.length > 0) {
          console.log('');
          console.log('Notes:');
          for (const note of workout.notes) {
            console.log(`  - ${note}`);
          }
        }
      }
    });
}

export function createHistoryCommand(getProfile: () => string | undefined): Command {
  return new Command('history')
    .description('Show exercise history')
    .argument('<exercise>', 'Exercise ID')
    .option('-n, --last <count>', 'Show last N sessions', '10')
    .option('--json', 'Output as JSON')
    .action((exerciseId: string, options: { last: string; json?: boolean }) => {
      const storage = getStorage(getProfile());
      const exercise = storage.getExercise(exerciseId);

      if (!exercise) {
        console.error(`Exercise "${exerciseId}" not found.`);
        process.exit(1);
      }

      const history = storage.getExerciseHistory(exercise.id);
      const limit = parseInt(options.last, 10);
      const limited = history.slice(0, limit);

      if (options.json) {
        console.log(JSON.stringify(limited, null, 2));
        return;
      }

      if (limited.length === 0) {
        console.log(`No history for ${exercise.name}.`);
        return;
      }

      const config = storage.getConfig();
      const unit = config.units;

      console.log(`History for ${exercise.name} (last ${limited.length} sessions):`);
      console.log('');

      for (const { workout, log } of limited) {
        const bestSet = log.sets.reduce(
          (best, set) => (set.weight * set.reps > best.weight * best.reps ? set : best),
          log.sets[0]!
        );
        if (bestSet) {
          const setsStr = log.sets.map((s) => `${s.weight}x${s.reps}`).join(', ');
          console.log(
            `${workout.date}: ${setsStr} (best: ${bestSet.weight}${unit} x ${bestSet.reps})`
          );
        }
      }
    });
}
