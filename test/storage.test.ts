import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage, resetStorage } from '../src/data/storage.js';

describe('Storage', () => {
  let testDir: string;
  let storage: Storage;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    resetStorage();
    storage = new Storage(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('config', () => {
    it('returns default config when none exists', () => {
      const config = storage.getConfig();
      expect(config.units).toBe('lbs');
    });

    it('saves and retrieves config', () => {
      storage.saveConfig({ units: 'kg', dataDir: testDir });
      const config = storage.getConfig();
      expect(config.units).toBe('kg');
    });
  });

  describe('exercises', () => {
    it('initializes with default exercises', () => {
      const exercises = storage.getExercises();
      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises.find((e) => e.id === 'bench-press')).toBeDefined();
    });

    it('finds exercise by id', () => {
      const exercise = storage.getExercise('bench-press');
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Bench Press');
    });

    it('finds exercise by alias', () => {
      const exercise = storage.getExercise('bench');
      expect(exercise).toBeDefined();
      expect(exercise?.id).toBe('bench-press');
    });

    it('adds a new exercise', () => {
      storage.addExercise({
        id: 'custom-exercise',
        name: 'Custom Exercise',
        aliases: [],
        muscles: ['chest'],
        type: 'isolation',
        equipment: 'cable',
      });
      const exercise = storage.getExercise('custom-exercise');
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Custom Exercise');
    });

    it('throws when adding duplicate exercise', () => {
      expect(() =>
        storage.addExercise({
          id: 'bench-press',
          name: 'Duplicate',
          aliases: [],
          muscles: ['chest'],
          type: 'compound',
          equipment: 'barbell',
        })
      ).toThrow('already exists');
    });

    it('updates an exercise', () => {
      storage.updateExercise('bench-press', { name: 'Updated Bench' });
      const exercise = storage.getExercise('bench-press');
      expect(exercise?.name).toBe('Updated Bench');
    });

    it('deletes an exercise', () => {
      storage.deleteExercise('bench-press');
      const exercise = storage.getExercise('bench-press');
      expect(exercise).toBeUndefined();
    });
  });

  describe('templates', () => {
    it('starts with empty templates', () => {
      const templates = storage.getTemplates();
      expect(templates).toEqual([]);
    });

    it('adds and retrieves a template', () => {
      storage.addTemplate({
        id: 'push-a',
        name: 'Push A',
        exercises: [{ exercise: 'bench-press', sets: 3, reps: '8-12' }],
      });
      const template = storage.getTemplate('push-a');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Push A');
      expect(template?.exercises).toHaveLength(1);
    });

    it('deletes a template', () => {
      storage.addTemplate({
        id: 'to-delete',
        name: 'To Delete',
        exercises: [],
      });
      storage.deleteTemplate('to-delete');
      const template = storage.getTemplate('to-delete');
      expect(template).toBeUndefined();
    });
  });

  describe('workouts', () => {
    it('returns null when no current workout', () => {
      const current = storage.getCurrentWorkout();
      expect(current).toBeNull();
    });

    it('saves and retrieves current workout', () => {
      const workout = {
        id: '2026-01-22-test',
        date: '2026-01-22',
        template: null,
        startTime: '2026-01-22T10:00:00Z',
        endTime: null,
        exercises: [],
        notes: [],
      };
      storage.saveCurrentWorkout(workout);
      const current = storage.getCurrentWorkout();
      expect(current).toBeDefined();
      expect(current?.id).toBe('2026-01-22-test');
    });

    it('finishes workout and moves to workouts folder', () => {
      const workout = {
        id: '2026-01-22-test',
        date: '2026-01-22',
        template: null,
        startTime: '2026-01-22T10:00:00Z',
        endTime: '2026-01-22T11:00:00Z',
        exercises: [],
        notes: [],
      };
      storage.saveCurrentWorkout(workout);
      storage.finishWorkout(workout);

      expect(storage.getCurrentWorkout()).toBeNull();
      expect(storage.getWorkout('2026-01-22')).toBeDefined();
    });

    it('gets all workouts sorted by date descending', () => {
      storage.finishWorkout({
        id: '2026-01-20-test',
        date: '2026-01-20',
        template: null,
        startTime: '2026-01-20T10:00:00Z',
        endTime: '2026-01-20T11:00:00Z',
        exercises: [],
        notes: [],
      });
      storage.finishWorkout({
        id: '2026-01-22-test',
        date: '2026-01-22',
        template: null,
        startTime: '2026-01-22T10:00:00Z',
        endTime: '2026-01-22T11:00:00Z',
        exercises: [],
        notes: [],
      });

      const workouts = storage.getAllWorkouts();
      expect(workouts).toHaveLength(2);
      expect(workouts[0]?.date).toBe('2026-01-22');
      expect(workouts[1]?.date).toBe('2026-01-20');
    });

    it('gets exercise history', () => {
      storage.finishWorkout({
        id: '2026-01-20-test',
        date: '2026-01-20',
        template: null,
        startTime: '2026-01-20T10:00:00Z',
        endTime: '2026-01-20T11:00:00Z',
        exercises: [
          {
            exercise: 'bench-press',
            sets: [{ weight: 135, reps: 10, rir: null }],
          },
        ],
        notes: [],
      });
      storage.finishWorkout({
        id: '2026-01-22-test',
        date: '2026-01-22',
        template: null,
        startTime: '2026-01-22T10:00:00Z',
        endTime: '2026-01-22T11:00:00Z',
        exercises: [
          {
            exercise: 'bench-press',
            sets: [{ weight: 140, reps: 8, rir: null }],
          },
        ],
        notes: [],
      });

      const history = storage.getExerciseHistory('bench-press');
      expect(history).toHaveLength(2);
      expect(history[0]?.log.sets[0]?.weight).toBe(140);
      expect(history[1]?.log.sets[0]?.weight).toBe(135);
    });
  });
});
