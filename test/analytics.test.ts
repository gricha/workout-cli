import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage, resetStorage, getStorage } from '../src/data/storage.js';
import { createProfile } from '../src/data/profiles.js';

const originalHome = process.env.HOME;

function cli(args: string, dataDir: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`bun run src/index.ts ${args}`, {
      cwd: process.cwd(),
      env: { ...process.env, HOME: dataDir },
      encoding: 'utf-8',
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const error = err as { stdout?: string; status?: number };
    return {
      stdout: error.stdout ?? '',
      exitCode: error.status ?? 1,
    };
  }
}

describe('PR tracking', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('default');
    storage = getStorage('default');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('shows no PRs when no workouts exist', () => {
    const { stdout, exitCode } = cli('pr', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No personal records found');
  });

  it('tracks PRs based on estimated 1RM', () => {
    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [
        {
          exercise: 'bench-press',
          sets: [
            { weight: 135, reps: 10, rir: null },
            { weight: 155, reps: 5, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const { stdout, exitCode } = cli('pr', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Bench Press');
    expect(stdout).toContain('155');
  });

  it('updates PR when new record is set', () => {
    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    storage.finishWorkout({
      id: '2026-01-22-push',
      date: '2026-01-22',
      template: null,
      startTime: '2026-01-22T10:00:00Z',
      endTime: '2026-01-22T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 185, reps: 5, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('pr bench-press', testHome);
    expect(stdout).toContain('185');
    expect(stdout).toContain('2026-01-22');
  });

  it('filters PRs by muscle group', () => {
    storage.finishWorkout({
      id: '2026-01-20-full',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [
        { exercise: 'bench-press', sets: [{ weight: 185, reps: 5, rir: null }] },
        { exercise: 'squat', sets: [{ weight: 225, reps: 5, rir: null }] },
      ],
      notes: [],
    });

    const { stdout } = cli('pr --muscle chest', testHome);
    expect(stdout).toContain('Bench Press');
    expect(stdout).not.toContain('Squat');
  });

  it('outputs JSON format', () => {
    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 185, reps: 5, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('pr --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].exerciseName).toBe('Bench Press');
    expect(parsed[0].weight).toBe(185);
  });
});

describe('Volume analysis', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('default');
    storage = getStorage('default');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('shows no workouts message when empty', () => {
    const { stdout, exitCode } = cli('volume', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No workouts found');
  });

  it('calculates total volume', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-push`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [
        {
          exercise: 'bench-press',
          sets: [
            { weight: 135, reps: 10, rir: null },
            { weight: 135, reps: 10, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const { stdout, exitCode } = cli('volume --week', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Total sets: 2');
    expect(stdout).toContain('2,700');
  });

  it('groups by muscle', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-push`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('volume --week --by muscle', testHome);
    expect(stdout).toContain('chest');
    expect(stdout).toContain('triceps');
  });

  it('groups by exercise', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-push`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('volume --week --by exercise', testHome);
    expect(stdout).toContain('Bench Press');
    expect(stdout).toContain('1 sets');
  });

  it('outputs JSON format', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-push`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('volume --week --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed.totalSets).toBe(1);
    expect(parsed.totalVolume).toBe(1350);
  });
});

describe('Progression tracking', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('default');
    storage = getStorage('default');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('shows no history message when empty', () => {
    const { stdout, exitCode } = cli('progression bench-press', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No history for Bench Press');
  });

  it('shows progression over time', () => {
    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout, exitCode } = cli('progression bench-press', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Bench Press');
    expect(stdout).toContain('2026-01-20');
    expect(stdout).toContain('135');
  });

  it('calculates e1rm change', () => {
    storage.finishWorkout({
      id: '2026-01-15-push',
      date: '2026-01-15',
      template: null,
      startTime: '2026-01-15T10:00:00Z',
      endTime: '2026-01-15T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 155, reps: 8, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('progression bench-press', testHome);
    expect(stdout).toContain('Est. 1RM change');
    expect(stdout).toContain('+');
  });

  it('outputs JSON format', () => {
    storage.finishWorkout({
      id: '2026-01-20-push',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('progression bench-press --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed.exercise).toBe('Bench Press');
    expect(parsed.progression).toHaveLength(1);
  });
});

describe('Per-side weight input', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    process.env.HOME = testHome;
    resetStorage();
    createProfile('default');
    storage = getStorage('default');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('doubles volume for per-side exercises', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-arms`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [{ exercise: 'bicep-curl', sets: [{ weight: 25, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('volume --week --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed.totalVolume).toBe(500);
  });

  it('does not double volume for barbell exercises', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-push`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('volume --week --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed.totalVolume).toBe(1350);
  });

  it('PRs use input weight not doubled', () => {
    storage.finishWorkout({
      id: '2026-01-20-arms',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bicep-curl', sets: [{ weight: 30, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('pr bicep-curl --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed[0].weight).toBe(30);
    expect(parsed[0].e1rm).toBe(Math.round(30 * (1 + 10 / 30)));
  });

  it('progression volume is doubled for per-side exercises', () => {
    storage.finishWorkout({
      id: '2026-01-20-arms',
      date: '2026-01-20',
      template: null,
      startTime: '2026-01-20T10:00:00Z',
      endTime: '2026-01-20T11:00:00Z',
      exercises: [{ exercise: 'bicep-curl', sets: [{ weight: 25, reps: 10, rir: null }] }],
      notes: [],
    });

    const { stdout } = cli('progression bicep-curl --json', testHome);
    const parsed = JSON.parse(stdout);
    expect(parsed.progression[0].totalVolume).toBe(500);
  });
});
