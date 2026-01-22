import { Command } from 'commander';
import { getStorage } from '../data/storage.js';
import { Template, slugify, type TemplateExercise } from '../types.js';

function parseExerciseSpec(spec: string): TemplateExercise {
  const match = spec.match(/^([^:]+):(\d+)x(.+)$/);
  if (!match) {
    throw new Error(`Invalid exercise spec: ${spec}. Expected format: exercise:setsxreps`);
  }
  const [, exercise, sets, reps] = match;
  if (!exercise || !sets || !reps) {
    throw new Error(`Invalid exercise spec: ${spec}`);
  }
  return {
    exercise: exercise.trim(),
    sets: parseInt(sets, 10),
    reps: reps.trim(),
  };
}

export function createTemplatesCommand(): Command {
  const templates = new Command('templates').description('Manage workout templates');

  templates
    .command('list')
    .description('List all templates')
    .option('--json', 'Output as JSON')
    .action((options: { json?: boolean }) => {
      const storage = getStorage();
      const templateList = storage.getTemplates();

      if (options.json) {
        console.log(JSON.stringify(templateList, null, 2));
        return;
      }

      if (templateList.length === 0) {
        console.log('No templates found.');
        return;
      }

      for (const t of templateList) {
        const exerciseCount = t.exercises.length;
        console.log(`${t.id} - ${t.name} (${exerciseCount} exercises)`);
      }
    });

  templates
    .command('show <id>')
    .description('Show template details')
    .option('--json', 'Output as JSON')
    .action((id: string, options: { json?: boolean }) => {
      const storage = getStorage();
      const template = storage.getTemplate(id);

      if (!template) {
        console.error(`Template "${id}" not found.`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(template, null, 2));
        return;
      }

      console.log(`Name: ${template.name}`);
      console.log(`ID: ${template.id}`);
      if (template.description) {
        console.log(`Description: ${template.description}`);
      }
      console.log('\nExercises:');
      for (const e of template.exercises) {
        console.log(`  - ${e.exercise}: ${e.sets}x${e.reps}`);
      }
    });

  templates
    .command('create <name>')
    .description('Create a new template')
    .requiredOption(
      '-e, --exercises <exercises>',
      'Exercise specs (e.g., "bench-press:3x8-12, squat:4x5")'
    )
    .option('--id <id>', 'Custom ID (defaults to slugified name)')
    .option('-d, --description <description>', 'Template description')
    .action(
      (
        name: string,
        options: {
          exercises: string;
          id?: string;
          description?: string;
        }
      ) => {
        const storage = getStorage();
        const id = options.id ?? slugify(name);

        const exerciseSpecs = options.exercises.split(',').map((s) => s.trim());
        const exercises: TemplateExercise[] = [];

        for (const spec of exerciseSpecs) {
          try {
            exercises.push(parseExerciseSpec(spec));
          } catch (err) {
            console.error((err as Error).message);
            process.exit(1);
          }
        }

        const template = Template.parse({
          id,
          name,
          description: options.description,
          exercises,
        });

        try {
          storage.addTemplate(template);
          console.log(`Created template: ${template.name} (${template.id})`);
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      }
    );

  templates
    .command('delete <id>')
    .description('Delete a template')
    .action((id: string) => {
      const storage = getStorage();

      try {
        storage.deleteTemplate(id);
        console.log(`Deleted template: ${id}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  return templates;
}
