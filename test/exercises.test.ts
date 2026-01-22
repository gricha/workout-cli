import { describe, it, expect } from 'vitest';
import { defaultExercises } from '../src/exercises.js';

describe('defaultExercises', () => {
  it('contains common compound movements', () => {
    const compoundIds = ['bench-press', 'squat', 'deadlift', 'overhead-press', 'barbell-row'];
    for (const id of compoundIds) {
      const exercise = defaultExercises.find((e) => e.id === id);
      expect(exercise, `${id} should exist`).toBeDefined();
      expect(exercise?.type).toBe('compound');
    }
  });

  it('contains common isolation movements', () => {
    const isolationIds = ['bicep-curl', 'tricep-pushdown', 'lateral-raise', 'leg-curl'];
    for (const id of isolationIds) {
      const exercise = defaultExercises.find((e) => e.id === id);
      expect(exercise, `${id} should exist`).toBeDefined();
      expect(exercise?.type).toBe('isolation');
    }
  });

  it('all exercises have required fields', () => {
    for (const exercise of defaultExercises) {
      expect(exercise.id).toBeTruthy();
      expect(exercise.name).toBeTruthy();
      expect(exercise.muscles.length).toBeGreaterThan(0);
      expect(['compound', 'isolation']).toContain(exercise.type);
      expect(exercise.equipment).toBeTruthy();
    }
  });

  it('has unique ids', () => {
    const ids = defaultExercises.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('exercises have useful aliases', () => {
    const benchPress = defaultExercises.find((e) => e.id === 'bench-press');
    expect(benchPress?.aliases).toContain('bench');

    const ohp = defaultExercises.find((e) => e.id === 'overhead-press');
    expect(ohp?.aliases).toContain('ohp');

    const rdl = defaultExercises.find((e) => e.id === 'romanian-deadlift');
    expect(rdl?.aliases).toContain('rdl');
  });
});
