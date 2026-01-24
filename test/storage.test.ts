import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage, resetStorage, getStorage } from '../src/data/storage.js';
import { createProfile } from '../src/data/profiles.js';

const originalHome = process.env.HOME;
let testHome: string;

describe('Storage', () => {
  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('test');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  function getTestStorage(): Storage {
    return getStorage('test');
  }

  describe('config', () => {
    it('returns default config when none exists', () => {
      const storage = getTestStorage();
      const config = storage.getConfig();
      expect(config.units).toBe('lbs');
    });

    it('saves and retrieves config', () => {
      const storage = getTestStorage();
      storage.saveConfig({ units: 'kg', dataDir: '~/.workout' });
      const config = storage.getConfig();
      expect(config.units).toBe('kg');
    });
  });

  describe('exercises', () => {
    it('initializes with default exercises', () => {
      const storage = getTestStorage();
      const exercises = storage.getExercises();
      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises.find((e) => e.id === 'bench-press')).toBeDefined();
    });

    it('finds exercise by id', () => {
      const storage = getTestStorage();
      const exercise = storage.getExercise('bench-press');
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Bench Press');
    });

    it('finds exercise by alias', () => {
      const storage = getTestStorage();
      const exercise = storage.getExercise('bench');
      expect(exercise).toBeDefined();
      expect(exercise?.id).toBe('bench-press');
    });

    it('adds a new exercise', () => {
      const storage = getTestStorage();
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
      const storage = getTestStorage();
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
      const storage = getTestStorage();
      storage.updateExercise('bench-press', { name: 'Updated Bench' });
      const exercise = storage.getExercise('bench-press');
      expect(exercise?.name).toBe('Updated Bench');
    });

    it('deletes an exercise', () => {
      const storage = getTestStorage();
      storage.deleteExercise('bench-press');
      const exercise = storage.getExercise('bench-press');
      expect(exercise).toBeUndefined();
    });
  });

  describe('templates', () => {
    it('starts with empty templates', () => {
      const storage = getTestStorage();
      const templates = storage.getTemplates();
      expect(templates).toEqual([]);
    });

    it('adds and retrieves a template', () => {
      const storage = getTestStorage();
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
      const storage = getTestStorage();
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
      const storage = getTestStorage();
      const current = storage.getCurrentWorkout();
      expect(current).toBeNull();
    });

    it('saves and retrieves current workout', () => {
      const storage = getTestStorage();
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
      const storage = getTestStorage();
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
      const storage = getTestStorage();
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
      const storage = getTestStorage();
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

  describe('profile isolation', () => {
    it('templates are isolated per profile', () => {
      createProfile('user1');
      createProfile('user2');

      const storage1 = getStorage('user1');
      const storage2 = getStorage('user2');

      storage1.addTemplate({
        id: 'template1',
        name: 'Template 1',
        exercises: [],
      });

      expect(storage1.getTemplate('template1')).toBeDefined();
      expect(storage2.getTemplate('template1')).toBeUndefined();
    });

    it('workouts are isolated per profile', () => {
      createProfile('user1');
      createProfile('user2');

      const storage1 = getStorage('user1');
      const storage2 = getStorage('user2');

      storage1.finishWorkout({
        id: '2026-01-22-test',
        date: '2026-01-22',
        template: null,
        startTime: '2026-01-22T10:00:00Z',
        endTime: '2026-01-22T11:00:00Z',
        exercises: [],
        notes: [],
      });

      expect(storage1.getAllWorkouts()).toHaveLength(1);
      expect(storage2.getAllWorkouts()).toHaveLength(0);
    });

    it('exercises are shared across profiles', () => {
      createProfile('user1');
      createProfile('user2');

      const storage1 = getStorage('user1');
      const storage2 = getStorage('user2');

      storage1.addExercise({
        id: 'shared-exercise',
        name: 'Shared Exercise',
        aliases: [],
        muscles: ['chest'],
        type: 'isolation',
        equipment: 'cable',
      });

      expect(storage1.getExercise('shared-exercise')).toBeDefined();
      expect(storage2.getExercise('shared-exercise')).toBeDefined();
    });
  });
});
