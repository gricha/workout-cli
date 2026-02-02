import { Command } from 'commander';
import { getSharedStorage } from '../data/storage.js';
import {
  Exercise,
  slugify,
  type MuscleGroup,
  type ExerciseType,
  type Equipment,
  type WeightInput,
} from '../types.js';

export function createExercisesCommand(_getProfile: () => string | undefined): Command {
  const exercises = new Command('exercises').description('Manage exercise library');

  exercises
    .command('list')
    .description('List all exercises')
    .option('-m, --muscle <muscle>', 'Filter by muscle group')
    .option('-t, --type <type>', 'Filter by exercise type (compound/isolation)')
    .option('--json', 'Output as JSON')
    .action((options: { muscle?: string; type?: string; json?: boolean }) => {
      const storage = getSharedStorage();
      let exerciseList = storage.getExercises();

      if (options.muscle) {
        exerciseList = exerciseList.filter((e) =>
          e.muscles.some((m) => m.toLowerCase().includes(options.muscle!.toLowerCase()))
        );
      }

      if (options.type) {
        exerciseList = exerciseList.filter((e) => e.type === options.type);
      }

      if (options.json) {
        console.log(JSON.stringify(exerciseList, null, 2));
        return;
      }

      if (exerciseList.length === 0) {
        console.log('No exercises found.');
        return;
      }

      for (const e of exerciseList) {
        console.log(`${e.id} - ${e.name} (${e.type}, ${e.muscles.join(', ')})`);
      }
    });

  exercises
    .command('show <id>')
    .description('Show exercise details')
    .option('--json', 'Output as JSON')
    .action((id: string, options: { json?: boolean }) => {
      const storage = getSharedStorage();
      const exercise = storage.getExercise(id);

      if (!exercise) {
        console.error(`Exercise "${id}" not found.`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(exercise, null, 2));
        return;
      }

      console.log(`Name: ${exercise.name}`);
      console.log(`ID: ${exercise.id}`);
      console.log(`Type: ${exercise.type}`);
      console.log(`Equipment: ${exercise.equipment}`);
      console.log(`Weight input: ${exercise.weightInput}`);
      console.log(`Muscles: ${exercise.muscles.join(', ')}`);
      if (exercise.aliases.length > 0) {
        console.log(`Aliases: ${exercise.aliases.join(', ')}`);
      }
      if (exercise.notes) {
        console.log(`Notes: ${exercise.notes}`);
      }
    });

  exercises
    .command('add <name>')
    .description('Add a new exercise')
    .requiredOption('--muscles <muscles>', 'Comma-separated muscle groups')
    .requiredOption('--type <type>', 'Exercise type (compound/isolation)')
    .requiredOption('--equipment <equipment>', 'Equipment type')
    .option('--id <id>', 'Custom ID (defaults to slugified name)')
    .option('--aliases <aliases>', 'Comma-separated aliases')
    .option('--weight-input <type>', 'Weight input type (total or per-side)', 'total')
    .option('--notes <notes>', 'Exercise notes')
    .action(
      (
        name: string,
        options: {
          muscles: string;
          type: string;
          equipment: string;
          id?: string;
          aliases?: string;
          weightInput?: string;
          notes?: string;
        }
      ) => {
        const storage = getSharedStorage();
        const id = options.id ?? slugify(name);
        const muscles = options.muscles.split(',').map((m) => m.trim()) as MuscleGroup[];
        const aliases = options.aliases ? options.aliases.split(',').map((a) => a.trim()) : [];

        const exercise = Exercise.parse({
          id,
          name,
          aliases,
          muscles,
          type: options.type as ExerciseType,
          equipment: options.equipment as Equipment,
          weightInput: options.weightInput as WeightInput,
          notes: options.notes,
        });

        try {
          storage.addExercise(exercise);
          console.log(`Added exercise: ${exercise.name} (${exercise.id})`);
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      }
    );

  exercises
    .command('edit <id>')
    .description('Edit an exercise')
    .option('--name <name>', 'New name')
    .option('--muscles <muscles>', 'New muscle groups (comma-separated)')
    .option('--type <type>', 'New type')
    .option('--equipment <equipment>', 'New equipment')
    .option('--add-alias <alias>', 'Add an alias')
    .option('--remove-alias <alias>', 'Remove an alias')
    .option('--weight-input <type>', 'Weight input type (total or per-side)')
    .option('--notes <notes>', 'New notes')
    .action(
      (
        id: string,
        options: {
          name?: string;
          muscles?: string;
          type?: string;
          equipment?: string;
          weightInput?: string;
          addAlias?: string;
          removeAlias?: string;
          notes?: string;
        }
      ) => {
        const storage = getSharedStorage();
        const exercise = storage.getExercise(id);

        if (!exercise) {
          console.error(`Exercise "${id}" not found.`);
          process.exit(1);
        }

        const updates: Partial<typeof exercise> = {};

        if (options.name) {
          updates.name = options.name;
        }
        if (options.muscles) {
          updates.muscles = options.muscles.split(',').map((m) => m.trim()) as MuscleGroup[];
        }
        if (options.type) {
          updates.type = options.type as ExerciseType;
        }
        if (options.equipment) {
          updates.equipment = options.equipment as Equipment;
        }
        if (options.weightInput) {
          updates.weightInput = options.weightInput as WeightInput;
        }
        if (options.notes) {
          updates.notes = options.notes;
        }
        if (options.addAlias) {
          updates.aliases = [...exercise.aliases, options.addAlias];
        }
        if (options.removeAlias) {
          updates.aliases = exercise.aliases.filter((a) => a !== options.removeAlias);
        }

        try {
          storage.updateExercise(id, updates);
          console.log(`Updated exercise: ${id}`);
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      }
    );

  exercises
    .command('delete <id>')
    .description('Delete an exercise')
    .action((id: string) => {
      const storage = getSharedStorage();

      try {
        storage.deleteExercise(id);
        console.log(`Deleted exercise: ${id}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  return exercises;
}
