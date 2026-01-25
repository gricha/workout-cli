import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage, resetStorage, getStorage } from '../src/data/storage.js';
import { createProfile } from '../src/data/profiles.js';

const originalHome = process.env.HOME;

describe('workout session flow', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('test');
    storage = getStorage('test');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('complete workout flow: start -> log -> done', () => {
    storage.addTemplate({
      id: 'push-a',
      name: 'Push A',
      exercises: [
        { exercise: 'bench-press', sets: 3, reps: '8-12' },
        { exercise: 'overhead-press', sets: 3, reps: '8-12' },
      ],
    });

    const now = new Date();
    const date = now.toISOString().split('T')[0]!;
    const template = storage.getTemplate('push-a')!;

    const workout = {
      id: `${date}-push-a`,
      date,
      template: 'push-a',
      startTime: now.toISOString(),
      endTime: null,
      exercises: template.exercises.map((e) => ({
        exercise: e.exercise,
        sets: [],
      })),
      notes: [],
    };
    storage.saveCurrentWorkout(workout);

    expect(storage.getCurrentWorkout()).not.toBeNull();
    expect(storage.getCurrentWorkout()?.template).toBe('push-a');

    const current = storage.getCurrentWorkout()!;
    const benchLog = current.exercises.find((e) => e.exercise === 'bench-press')!;
    benchLog.sets.push(
      { weight: 135, reps: 10, rir: null },
      { weight: 135, reps: 9, rir: null },
      { weight: 135, reps: 8, rir: 1 }
    );
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const benchSets = updated.exercises.find((e) => e.exercise === 'bench-press')!.sets;
    expect(benchSets).toHaveLength(3);
    expect(benchSets[0]?.weight).toBe(135);
    expect(benchSets[2]?.rir).toBe(1);

    updated.endTime = new Date().toISOString();
    updated.stats = {
      totalSets: 3,
      totalVolume: 135 * 10 + 135 * 9 + 135 * 8,
      musclesWorked: ['chest', 'triceps', 'front-delts'],
    };
    storage.finishWorkout(updated);

    expect(storage.getCurrentWorkout()).toBeNull();
    expect(storage.getWorkout(date)).not.toBeNull();
    expect(storage.getLastWorkout()?.id).toBe(`${date}-push-a`);
  });

  it('freestyle workout without template', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    const workout = {
      id: `${date}-freestyle`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [],
      notes: [],
    };
    storage.saveCurrentWorkout(workout);

    const current = storage.getCurrentWorkout()!;
    current.exercises.push({
      exercise: 'deadlift',
      sets: [{ weight: 225, reps: 5, rir: null }],
    });
    storage.saveCurrentWorkout(current);

    expect(storage.getCurrentWorkout()?.exercises).toHaveLength(1);
    expect(storage.getCurrentWorkout()?.template).toBeNull();
  });

  it('cancel workout clears current without saving', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [{ exercise: 'squat', sets: [{ weight: 185, reps: 5, rir: null }] }],
      notes: [],
    });

    storage.clearCurrentWorkout();

    expect(storage.getCurrentWorkout()).toBeNull();
    expect(storage.getWorkout(date)).toBeNull();
  });

  it('tracks exercise history across workouts', () => {
    const dates = ['2026-01-20', '2026-01-22', '2026-01-24'];
    const weights = [135, 140, 145];

    for (let i = 0; i < dates.length; i++) {
      storage.finishWorkout({
        id: `${dates[i]}-push`,
        date: dates[i]!,
        template: 'push-a',
        startTime: `${dates[i]}T10:00:00Z`,
        endTime: `${dates[i]}T11:00:00Z`,
        exercises: [
          {
            exercise: 'bench-press',
            sets: [
              { weight: weights[i]!, reps: 10, rir: null },
              { weight: weights[i]!, reps: 8, rir: null },
            ],
          },
        ],
        notes: [],
      });
    }

    const history = storage.getExerciseHistory('bench-press');
    expect(history).toHaveLength(3);
    expect(history[0]?.log.sets[0]?.weight).toBe(145);
    expect(history[1]?.log.sets[0]?.weight).toBe(140);
    expect(history[2]?.log.sets[0]?.weight).toBe(135);
  });

  it('handles multiple sets logged at once', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    current.exercises.push({
      exercise: 'lat-pulldown',
      sets: [
        { weight: 100, reps: 12, rir: null },
        { weight: 100, reps: 10, rir: null },
        { weight: 100, reps: 8, rir: 2 },
      ],
    });
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const sets = updated.exercises[0]!.sets;
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.reps)).toEqual([12, 10, 8]);
  });

  it('undo removes last set from specified exercise', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [
            { weight: 135, reps: 10, rir: null },
            { weight: 135, reps: 9, rir: null },
            { weight: 135, reps: 8, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    const benchLog = current.exercises.find((e) => e.exercise === 'bench-press')!;
    benchLog.sets.pop();
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const sets = updated.exercises.find((e) => e.exercise === 'bench-press')!.sets;
    expect(sets).toHaveLength(2);
    expect(sets.map((s) => s.reps)).toEqual([10, 9]);
  });

  it('undo finds last exercise with sets when no exercise specified', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [{ weight: 135, reps: 10, rir: null }],
        },
        {
          exercise: 'overhead-press',
          sets: [],
        },
        {
          exercise: 'squat',
          sets: [
            { weight: 185, reps: 5, rir: null },
            { weight: 185, reps: 5, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    for (let i = current.exercises.length - 1; i >= 0; i--) {
      const log = current.exercises[i]!;
      if (log.sets.length > 0) {
        log.sets.pop();
        break;
      }
    }
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const squatSets = updated.exercises.find((e) => e.exercise === 'squat')!.sets;
    expect(squatSets).toHaveLength(1);
  });

  it('edit updates weight and reps for a specific set', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [
            { weight: 135, reps: 10, rir: null },
            { weight: 135, reps: 9, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    const benchLog = current.exercises.find((e) => e.exercise === 'bench-press')!;
    benchLog.sets[0]!.weight = 185;
    benchLog.sets[0]!.reps = 12;
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const set1 = updated.exercises.find((e) => e.exercise === 'bench-press')!.sets[0]!;
    expect(set1.weight).toBe(185);
    expect(set1.reps).toBe(12);
  });

  it('edit can update only weight or only reps', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [
        {
          exercise: 'squat',
          sets: [{ weight: 185, reps: 5, rir: null }],
        },
      ],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    const squatLog = current.exercises.find((e) => e.exercise === 'squat')!;
    squatLog.sets[0]!.weight = 225;
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const set = updated.exercises.find((e) => e.exercise === 'squat')!.sets[0]!;
    expect(set.weight).toBe(225);
    expect(set.reps).toBe(5);
  });

  it('delete removes a specific set by index', () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]!;

    storage.saveCurrentWorkout({
      id: `${date}-test`,
      date,
      template: null,
      startTime: now.toISOString(),
      endTime: null,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [
            { weight: 135, reps: 10, rir: null },
            { weight: 145, reps: 8, rir: null },
            { weight: 155, reps: 6, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const current = storage.getCurrentWorkout()!;
    const benchLog = current.exercises.find((e) => e.exercise === 'bench-press')!;
    benchLog.sets.splice(1, 1);
    storage.saveCurrentWorkout(current);

    const updated = storage.getCurrentWorkout()!;
    const sets = updated.exercises.find((e) => e.exercise === 'bench-press')!.sets;
    expect(sets).toHaveLength(2);
    expect(sets[0]!.weight).toBe(135);
    expect(sets[1]!.weight).toBe(155);
  });
});

describe('exercise management', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('test');
    storage = getStorage('test');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('filters exercises by muscle group', () => {
    const exercises = storage.getExercises();
    const chestExercises = exercises.filter((e) => e.muscles.includes('chest'));

    expect(chestExercises.length).toBeGreaterThan(0);
    for (const e of chestExercises) {
      expect(e.muscles).toContain('chest');
    }
  });

  it('filters exercises by type', () => {
    const exercises = storage.getExercises();
    const compounds = exercises.filter((e) => e.type === 'compound');
    const isolations = exercises.filter((e) => e.type === 'isolation');

    expect(compounds.length).toBeGreaterThan(0);
    expect(isolations.length).toBeGreaterThan(0);
    expect(compounds.length + isolations.length).toBe(exercises.length);
  });

  it('finds exercise by alias', () => {
    const byId = storage.getExercise('bench-press');
    const byAlias = storage.getExercise('bench');
    const byAnotherAlias = storage.getExercise('flat bench');

    expect(byId).toBeDefined();
    expect(byAlias).toBeDefined();
    expect(byAnotherAlias).toBeDefined();
    expect(byId?.id).toBe(byAlias?.id);
    expect(byId?.id).toBe(byAnotherAlias?.id);
  });

  it('adds custom exercise', () => {
    storage.addExercise({
      id: 'zercher-squat',
      name: 'Zercher Squat',
      aliases: ['zercher'],
      muscles: ['quads', 'glutes', 'abs'],
      type: 'compound',
      equipment: 'barbell',
    });

    const exercise = storage.getExercise('zercher-squat');
    expect(exercise).toBeDefined();
    expect(exercise?.name).toBe('Zercher Squat');

    const byAlias = storage.getExercise('zercher');
    expect(byAlias?.id).toBe('zercher-squat');
  });

  it('edits exercise to add alias', () => {
    const original = storage.getExercise('squat')!;
    expect(original.aliases).not.toContain('squats');

    storage.updateExercise('squat', {
      aliases: [...original.aliases, 'squats'],
    });

    const updated = storage.getExercise('squat')!;
    expect(updated.aliases).toContain('squats');

    const byNewAlias = storage.getExercise('squats');
    expect(byNewAlias?.id).toBe('squat');
  });

  it('deleting exercise removes it from library', () => {
    const before = storage.getExercises().length;
    storage.deleteExercise('plank');

    expect(storage.getExercise('plank')).toBeUndefined();
    expect(storage.getExercises().length).toBe(before - 1);
  });
});

describe('template management', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('test');
    storage = getStorage('test');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('creates template with exercise specs', () => {
    storage.addTemplate({
      id: 'pull-a',
      name: 'Pull A',
      description: 'Back and biceps focus',
      exercises: [
        { exercise: 'deadlift', sets: 3, reps: '5' },
        { exercise: 'barbell-row', sets: 3, reps: '8-12' },
        { exercise: 'lat-pulldown', sets: 3, reps: '10-15' },
        { exercise: 'bicep-curl', sets: 2, reps: '12-15' },
      ],
    });

    const template = storage.getTemplate('pull-a')!;
    expect(template.exercises).toHaveLength(4);
    expect(template.exercises[0]?.reps).toBe('5');
    expect(template.exercises[2]?.reps).toBe('10-15');
  });

  it('lists all templates', () => {
    storage.addTemplate({ id: 'push', name: 'Push', exercises: [] });
    storage.addTemplate({ id: 'pull', name: 'Pull', exercises: [] });
    storage.addTemplate({ id: 'legs', name: 'Legs', exercises: [] });

    const templates = storage.getTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.id).sort()).toEqual(['legs', 'pull', 'push']);
  });

  it('deletes template', () => {
    storage.addTemplate({ id: 'to-delete', name: 'Delete Me', exercises: [] });
    expect(storage.getTemplate('to-delete')).toBeDefined();

    storage.deleteTemplate('to-delete');
    expect(storage.getTemplate('to-delete')).toBeUndefined();
  });
});

describe('config management', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('test');
    storage = getStorage('test');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('defaults to pounds', () => {
    const config = storage.getConfig();
    expect(config.units).toBe('lbs');
  });

  it('switches to kilograms', () => {
    storage.saveConfig({ units: 'kg', dataDir: '~/.workout' });
    const config = storage.getConfig();
    expect(config.units).toBe('kg');
  });

  it('persists config across storage instances', () => {
    storage.saveConfig({ units: 'kg', dataDir: '~/.workout' });

    resetStorage();
    const newStorage = getStorage('test');
    expect(newStorage.getConfig().units).toBe('kg');
  });
});
