import { Command } from 'commander';
import { getStorage } from '../data/storage.js';

interface PR {
  exercise: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
  workoutId: string;
}

function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function findPRs(storage: ReturnType<typeof getStorage>): Map<string, PR> {
  const workouts = storage.getAllWorkouts();
  const prs = new Map<string, PR>();

  for (const workout of workouts) {
    for (const log of workout.exercises) {
      const exercise = storage.getExercise(log.exercise);
      if (!exercise) continue;

      for (const set of log.sets) {
        const e1rm = calculateE1RM(set.weight, set.reps);
        const existing = prs.get(exercise.id);

        if (!existing || e1rm > existing.e1rm) {
          prs.set(exercise.id, {
            exercise: exercise.id,
            exerciseName: exercise.name,
            weight: set.weight,
            reps: set.reps,
            e1rm,
            date: workout.date,
            workoutId: workout.id,
          });
        }
      }
    }
  }

  return prs;
}

export function createPRCommand(getProfile: () => string | undefined): Command {
  return new Command('pr')
    .description('Show personal records')
    .argument('[exercise]', 'Exercise ID (optional, shows all if omitted)')
    .option('-m, --muscle <muscle>', 'Filter by muscle group')
    .option('--json', 'Output as JSON')
    .action((exerciseId: string | undefined, options: { muscle?: string; json?: boolean }) => {
      const storage = getStorage(getProfile());
      const config = storage.getConfig();
      const unit = config.units;
      const prs = findPRs(storage);

      let prList = Array.from(prs.values());

      if (exerciseId) {
        const exercise = storage.getExercise(exerciseId);
        if (!exercise) {
          console.error(`Exercise "${exerciseId}" not found.`);
          process.exit(1);
        }
        prList = prList.filter((pr) => pr.exercise === exercise.id);
      }

      if (options.muscle) {
        const exercises = storage.getExercises();
        const muscleExerciseIds = new Set(
          exercises
            .filter((e) =>
              e.muscles.some((m) => m.toLowerCase().includes(options.muscle!.toLowerCase()))
            )
            .map((e) => e.id)
        );
        prList = prList.filter((pr) => muscleExerciseIds.has(pr.exercise));
      }

      prList.sort((a, b) => b.e1rm - a.e1rm);

      if (options.json) {
        console.log(JSON.stringify(prList, null, 2));
        return;
      }

      if (prList.length === 0) {
        console.log('No personal records found.');
        return;
      }

      console.log('Personal Records:');
      console.log('');
      for (const pr of prList) {
        console.log(
          `${pr.exerciseName}: ${pr.weight}${unit} x ${pr.reps} (est. 1RM: ${pr.e1rm}${unit}) - ${pr.date}`
        );
      }
    });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  return `${startStr} to ${endStr}`;
}

export function createVolumeCommand(getProfile: () => string | undefined): Command {
  return new Command('volume')
    .description('Analyze training volume')
    .option('-w, --week', 'Show current week')
    .option('-m, --month', 'Show current month')
    .option('--last-weeks <n>', 'Show last N weeks', '4')
    .option('--by <grouping>', 'Group by: muscle, exercise, day')
    .option('--json', 'Output as JSON')
    .action(
      (options: {
        week?: boolean;
        month?: boolean;
        lastWeeks?: string;
        by?: string;
        json?: boolean;
      }) => {
        const storage = getStorage(getProfile());
        const config = storage.getConfig();
        const unit = config.units;
        const workouts = storage.getAllWorkouts();

        if (workouts.length === 0) {
          console.log('No workouts found.');
          return;
        }

        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;
        let periodLabel: string;

        if (options.week) {
          startDate = getWeekStart(now);
          periodLabel = 'This week';
        } else if (options.month) {
          startDate = getMonthStart(now);
          periodLabel = 'This month';
        } else {
          const weeks = parseInt(options.lastWeeks ?? '4', 10);
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - weeks * 7);
          periodLabel = `Last ${weeks} weeks`;
        }

        const filteredWorkouts = workouts.filter((w) => {
          const d = new Date(w.date);
          return d >= startDate && d <= endDate;
        });

        if (filteredWorkouts.length === 0) {
          console.log(`No workouts in period: ${periodLabel}`);
          return;
        }

        let totalSets = 0;
        let totalVolume = 0;
        const muscleVolume = new Map<string, number>();
        const exerciseVolume = new Map<string, { sets: number; volume: number; name: string }>();

        for (const workout of filteredWorkouts) {
          for (const log of workout.exercises) {
            const exercise = storage.getExercise(log.exercise);
            if (!exercise) continue;

            let exerciseSets = 0;
            let exerciseVol = 0;

            for (const set of log.sets) {
              const vol = set.weight * set.reps;
              totalSets++;
              totalVolume += vol;
              exerciseSets++;
              exerciseVol += vol;

              for (const muscle of exercise.muscles) {
                muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + vol);
              }
            }

            const existing = exerciseVolume.get(exercise.id);
            if (existing) {
              existing.sets += exerciseSets;
              existing.volume += exerciseVol;
            } else {
              exerciseVolume.set(exercise.id, {
                sets: exerciseSets,
                volume: exerciseVol,
                name: exercise.name,
              });
            }
          }
        }

        if (options.json) {
          const result = {
            period: periodLabel,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            workouts: filteredWorkouts.length,
            totalSets,
            totalVolume,
            byMuscle: Object.fromEntries(muscleVolume),
            byExercise: Object.fromEntries(exerciseVolume),
          };
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(`Volume Analysis: ${periodLabel}`);
        console.log(`(${formatDateRange(startDate, endDate)})`);
        console.log('');
        console.log(`Workouts: ${filteredWorkouts.length}`);
        console.log(`Total sets: ${totalSets}`);
        console.log(`Total volume: ${totalVolume.toLocaleString()}${unit}`);
        console.log('');

        if (options.by === 'muscle') {
          console.log('By Muscle Group:');
          const sorted = Array.from(muscleVolume.entries()).sort((a, b) => b[1] - a[1]);
          for (const [muscle, vol] of sorted) {
            console.log(`  ${muscle}: ${vol.toLocaleString()}${unit}`);
          }
        } else if (options.by === 'exercise') {
          console.log('By Exercise:');
          const sorted = Array.from(exerciseVolume.entries()).sort(
            (a, b) => b[1].volume - a[1].volume
          );
          for (const [, data] of sorted) {
            console.log(
              `  ${data.name}: ${data.sets} sets, ${data.volume.toLocaleString()}${unit}`
            );
          }
        } else {
          console.log('Top Muscles:');
          const sortedMuscles = Array.from(muscleVolume.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          for (const [muscle, vol] of sortedMuscles) {
            console.log(`  ${muscle}: ${vol.toLocaleString()}${unit}`);
          }
        }
      }
    );
}

export function createProgressionCommand(getProfile: () => string | undefined): Command {
  return new Command('progression')
    .description('Show progression over time for an exercise')
    .argument('<exercise>', 'Exercise ID')
    .option('-n, --last <count>', 'Show last N sessions', '10')
    .option('--json', 'Output as JSON')
    .action((exerciseId: string, options: { last: string; json?: boolean }) => {
      const storage = getStorage(getProfile());
      const config = storage.getConfig();
      const unit = config.units;
      const exercise = storage.getExercise(exerciseId);

      if (!exercise) {
        console.error(`Exercise "${exerciseId}" not found.`);
        process.exit(1);
      }

      const history = storage.getExerciseHistory(exercise.id);
      const limit = parseInt(options.last, 10);
      const limited = history.slice(0, limit).reverse();

      if (limited.length === 0) {
        console.log(`No history for ${exercise.name}.`);
        return;
      }

      const progressionData = limited.map(({ workout, log }) => {
        const bestSet = log.sets.reduce((best, set) => {
          const e1rm = calculateE1RM(set.weight, set.reps);
          const bestE1rm = calculateE1RM(best.weight, best.reps);
          return e1rm > bestE1rm ? set : best;
        }, log.sets[0]!);

        const totalVolume = log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const e1rm = calculateE1RM(bestSet.weight, bestSet.reps);

        return {
          date: workout.date,
          sets: log.sets.length,
          bestWeight: bestSet.weight,
          bestReps: bestSet.reps,
          e1rm,
          totalVolume,
        };
      });

      if (options.json) {
        console.log(
          JSON.stringify({ exercise: exercise.name, progression: progressionData }, null, 2)
        );
        return;
      }

      console.log(`Progression for ${exercise.name}:`);
      console.log('');

      const first = progressionData[0];
      const last = progressionData[progressionData.length - 1];

      if (first && last && progressionData.length > 1) {
        const e1rmChange = last.e1rm - first.e1rm;
        const sign = e1rmChange >= 0 ? '+' : '';
        console.log(`Est. 1RM change: ${sign}${e1rmChange}${unit} (${first.e1rm} → ${last.e1rm})`);
        console.log('');
      }

      console.log('Date       | Best Set         | Est 1RM | Volume');
      console.log('-----------|------------------|---------|--------');
      for (const entry of progressionData) {
        const bestStr = `${entry.bestWeight}${unit} x ${entry.bestReps}`.padEnd(16);
        const e1rmStr = `${entry.e1rm}${unit}`.padEnd(7);
        console.log(
          `${entry.date} | ${bestStr} | ${e1rmStr} | ${entry.totalVolume.toLocaleString()}${unit}`
        );
      }
    });
}
