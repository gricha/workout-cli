import { describe, it, expect } from 'vitest';
import { slugify, Exercise, Template, Workout, Config } from '../src/types.js';

describe('slugify', () => {
  it('converts name to lowercase kebab-case', () => {
    expect(slugify('Bench Press')).toBe('bench-press');
  });

  it('handles multiple spaces', () => {
    expect(slugify('Lat   Pulldown')).toBe('lat-pulldown');
  });

  it('removes special characters', () => {
    expect(slugify("Farmer's Walk")).toBe('farmer-s-walk');
  });

  it('handles leading/trailing spaces', () => {
    expect(slugify('  Squat  ')).toBe('squat');
  });
});

describe('Exercise schema', () => {
  it('parses valid exercise', () => {
    const result = Exercise.parse({
      id: 'test',
      name: 'Test Exercise',
      aliases: ['alias1'],
      muscles: ['chest'],
      type: 'compound',
      equipment: 'barbell',
    });
    expect(result.id).toBe('test');
    expect(result.aliases).toEqual(['alias1']);
  });

  it('defaults aliases to empty array', () => {
    const result = Exercise.parse({
      id: 'test',
      name: 'Test',
      muscles: ['chest'],
      type: 'compound',
      equipment: 'barbell',
    });
    expect(result.aliases).toEqual([]);
  });

  it('rejects invalid muscle group', () => {
    expect(() =>
      Exercise.parse({
        id: 'test',
        name: 'Test',
        muscles: ['invalid-muscle'],
        type: 'compound',
        equipment: 'barbell',
      })
    ).toThrow();
  });
});

describe('Template schema', () => {
  it('parses valid template', () => {
    const result = Template.parse({
      id: 'push-a',
      name: 'Push A',
      exercises: [{ exercise: 'bench-press', sets: 3, reps: '8-12' }],
    });
    expect(result.id).toBe('push-a');
    expect(result.exercises).toHaveLength(1);
  });

  it('allows optional description', () => {
    const result = Template.parse({
      id: 'push-a',
      name: 'Push A',
      description: 'Push day workout',
      exercises: [],
    });
    expect(result.description).toBe('Push day workout');
  });
});

describe('Workout schema', () => {
  it('parses complete workout', () => {
    const result = Workout.parse({
      id: '2026-01-22-push',
      date: '2026-01-22',
      template: 'push-a',
      startTime: '2026-01-22T10:00:00Z',
      endTime: '2026-01-22T11:00:00Z',
      exercises: [
        {
          exercise: 'bench-press',
          sets: [{ weight: 135, reps: 10, rir: 2 }],
        },
      ],
      notes: ['Good session'],
      stats: {
        totalSets: 1,
        totalVolume: 1350,
        musclesWorked: ['chest'],
      },
    });
    expect(result.template).toBe('push-a');
    expect(result.exercises[0]?.sets[0]?.rir).toBe(2);
  });

  it('allows null template for freestyle', () => {
    const result = Workout.parse({
      id: '2026-01-22-freestyle',
      date: '2026-01-22',
      template: null,
      startTime: '2026-01-22T10:00:00Z',
      endTime: null,
      exercises: [],
      notes: [],
    });
    expect(result.template).toBeNull();
  });

  it('defaults rir to null', () => {
    const result = Workout.parse({
      id: 'test',
      date: '2026-01-22',
      template: null,
      startTime: '2026-01-22T10:00:00Z',
      endTime: null,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [{ weight: 135, reps: 10 }],
        },
      ],
      notes: [],
    });
    expect(result.exercises[0]?.sets[0]?.rir).toBeNull();
  });
});

describe('Config schema', () => {
  it('defaults to lbs', () => {
    const result = Config.parse({});
    expect(result.units).toBe('lbs');
  });

  it('accepts kg', () => {
    const result = Config.parse({ units: 'kg' });
    expect(result.units).toBe('kg');
  });

  it('rejects invalid units', () => {
    expect(() => Config.parse({ units: 'stones' })).toThrow();
  });
});
