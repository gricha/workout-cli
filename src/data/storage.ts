import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  Config,
  Exercise,
  Template,
  Workout,
  type Config as ConfigType,
  type Exercise as ExerciseType,
  type Template as TemplateType,
  type Workout as WorkoutType,
} from '../types.js';
import { defaultExercises } from '../exercises.js';

function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export class Storage {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = expandPath(dataDir ?? '~/.workout');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    const workoutsDir = path.join(this.dataDir, 'workouts');
    if (!fs.existsSync(workoutsDir)) {
      fs.mkdirSync(workoutsDir, { recursive: true });
    }
  }

  private configPath(): string {
    return path.join(this.dataDir, 'config.json');
  }

  private exercisesPath(): string {
    return path.join(this.dataDir, 'exercises.json');
  }

  private templatesPath(): string {
    return path.join(this.dataDir, 'templates.json');
  }

  private currentPath(): string {
    return path.join(this.dataDir, 'current.json');
  }

  private workoutPath(date: string): string {
    return path.join(this.dataDir, 'workouts', `${date}.json`);
  }

  getConfig(): ConfigType {
    this.ensureDir();
    const configPath = this.configPath();
    if (!fs.existsSync(configPath)) {
      const defaultConfig = Config.parse({});
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return Config.parse(raw);
  }

  saveConfig(config: ConfigType): void {
    this.ensureDir();
    fs.writeFileSync(this.configPath(), JSON.stringify(config, null, 2));
  }

  getExercises(): ExerciseType[] {
    this.ensureDir();
    const exercisesPath = this.exercisesPath();
    if (!fs.existsSync(exercisesPath)) {
      fs.writeFileSync(exercisesPath, JSON.stringify(defaultExercises, null, 2));
      return defaultExercises;
    }
    const raw = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));
    return raw.map((e: unknown) => Exercise.parse(e));
  }

  saveExercises(exercises: ExerciseType[]): void {
    this.ensureDir();
    fs.writeFileSync(this.exercisesPath(), JSON.stringify(exercises, null, 2));
  }

  getExercise(id: string): ExerciseType | undefined {
    const exercises = this.getExercises();
    return exercises.find((e) => e.id === id || e.aliases.includes(id));
  }

  addExercise(exercise: ExerciseType): void {
    const exercises = this.getExercises();
    const existing = exercises.find((e) => e.id === exercise.id);
    if (existing) {
      throw new Error(`Exercise "${exercise.id}" already exists`);
    }
    exercises.push(exercise);
    this.saveExercises(exercises);
  }

  updateExercise(id: string, updates: Partial<ExerciseType>): void {
    const exercises = this.getExercises();
    const index = exercises.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Exercise "${id}" not found`);
    }
    const current = exercises[index];
    if (!current) {
      throw new Error(`Exercise "${id}" not found`);
    }
    exercises[index] = { ...current, ...updates };
    this.saveExercises(exercises);
  }

  deleteExercise(id: string): void {
    const exercises = this.getExercises();
    const index = exercises.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Exercise "${id}" not found`);
    }
    exercises.splice(index, 1);
    this.saveExercises(exercises);
  }

  getTemplates(): TemplateType[] {
    this.ensureDir();
    const templatesPath = this.templatesPath();
    if (!fs.existsSync(templatesPath)) {
      fs.writeFileSync(templatesPath, JSON.stringify([], null, 2));
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
    return raw.map((t: unknown) => Template.parse(t));
  }

  saveTemplates(templates: TemplateType[]): void {
    this.ensureDir();
    fs.writeFileSync(this.templatesPath(), JSON.stringify(templates, null, 2));
  }

  getTemplate(id: string): TemplateType | undefined {
    const templates = this.getTemplates();
    return templates.find((t) => t.id === id);
  }

  addTemplate(template: TemplateType): void {
    const templates = this.getTemplates();
    const existing = templates.find((t) => t.id === template.id);
    if (existing) {
      throw new Error(`Template "${template.id}" already exists`);
    }
    templates.push(template);
    this.saveTemplates(templates);
  }

  deleteTemplate(id: string): void {
    const templates = this.getTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Template "${id}" not found`);
    }
    templates.splice(index, 1);
    this.saveTemplates(templates);
  }

  getCurrentWorkout(): WorkoutType | null {
    this.ensureDir();
    const currentPath = this.currentPath();
    if (!fs.existsSync(currentPath)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
    return Workout.parse(raw);
  }

  saveCurrentWorkout(workout: WorkoutType): void {
    this.ensureDir();
    fs.writeFileSync(this.currentPath(), JSON.stringify(workout, null, 2));
  }

  clearCurrentWorkout(): void {
    const currentPath = this.currentPath();
    if (fs.existsSync(currentPath)) {
      fs.unlinkSync(currentPath);
    }
  }

  finishWorkout(workout: WorkoutType): void {
    this.ensureDir();
    const workoutPath = this.workoutPath(workout.date);
    fs.writeFileSync(workoutPath, JSON.stringify(workout, null, 2));
    this.clearCurrentWorkout();
  }

  getWorkout(date: string): WorkoutType | null {
    const workoutPath = this.workoutPath(date);
    if (!fs.existsSync(workoutPath)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(workoutPath, 'utf-8'));
    return Workout.parse(raw);
  }

  getAllWorkouts(): WorkoutType[] {
    this.ensureDir();
    const workoutsDir = path.join(this.dataDir, 'workouts');
    if (!fs.existsSync(workoutsDir)) {
      return [];
    }
    const files = fs.readdirSync(workoutsDir).filter((f) => f.endsWith('.json'));
    return files
      .map((f) => {
        const raw = JSON.parse(fs.readFileSync(path.join(workoutsDir, f), 'utf-8'));
        return Workout.parse(raw);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  getLastWorkout(): WorkoutType | null {
    const workouts = this.getAllWorkouts();
    return workouts[0] ?? null;
  }

  getExerciseHistory(
    exerciseId: string
  ): { workout: WorkoutType; log: WorkoutType['exercises'][0] }[] {
    const workouts = this.getAllWorkouts();
    const history: { workout: WorkoutType; log: WorkoutType['exercises'][0] }[] = [];
    for (const workout of workouts) {
      const log = workout.exercises.find((e) => e.exercise === exerciseId);
      if (log) {
        history.push({ workout, log });
      }
    }
    return history;
  }
}

let storageInstance: Storage | null = null;

export function getStorage(dataDir?: string): Storage {
  if (!storageInstance || dataDir) {
    storageInstance = new Storage(dataDir);
  }
  return storageInstance;
}

export function resetStorage(): void {
  storageInstance = null;
}
