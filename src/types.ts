import { z } from 'zod';

export const MuscleGroup = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'traps',
  'lats',
  'rear-delts',
  'side-delts',
  'front-delts',
]);
export type MuscleGroup = z.infer<typeof MuscleGroup>;

export const ExerciseType = z.enum(['compound', 'isolation']);
export type ExerciseType = z.infer<typeof ExerciseType>;

export const Equipment = z.enum([
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
]);
export type Equipment = z.infer<typeof Equipment>;

export const WeightInput = z.enum(['total', 'per-side']);
export type WeightInput = z.infer<typeof WeightInput>;

export const Exercise = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  muscles: z.array(MuscleGroup),
  type: ExerciseType,
  equipment: Equipment,
  weightInput: WeightInput.default('total'),
  notes: z.string().optional(),
});
export type Exercise = z.infer<typeof Exercise>;
export type ExerciseInput = z.input<typeof Exercise>;

export const TemplateExercise = z.object({
  exercise: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
});
export type TemplateExercise = z.infer<typeof TemplateExercise>;

export const Template = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  exercises: z.array(TemplateExercise),
});
export type Template = z.infer<typeof Template>;

export const SetLog = z.object({
  weight: z.number(),
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10).nullable().default(null),
});
export type SetLog = z.infer<typeof SetLog>;

export const ExerciseLog = z.object({
  exercise: z.string(),
  sets: z.array(SetLog),
  notes: z.string().optional(),
});
export type ExerciseLog = z.infer<typeof ExerciseLog>;

export const WorkoutStats = z.object({
  totalSets: z.number().int(),
  totalVolume: z.number(),
  musclesWorked: z.array(z.string()),
});
export type WorkoutStats = z.infer<typeof WorkoutStats>;

export const Workout = z.object({
  id: z.string(),
  date: z.string(),
  template: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  exercises: z.array(ExerciseLog),
  notes: z.array(z.string()).default([]),
  stats: WorkoutStats.optional(),
});
export type Workout = z.infer<typeof Workout>;

export const Units = z.enum(['lbs', 'kg']);
export type Units = z.infer<typeof Units>;

export const Config = z.object({
  units: Units.default('lbs'),
  dataDir: z.string().default('~/.workout'),
});
export type Config = z.infer<typeof Config>;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
