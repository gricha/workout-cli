import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage, resetStorage } from '../src/data/storage.js';

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
    resetStorage();
    storage = new Storage(path.join(testHome, '.workout'));
  });

  afterEach(() => {
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

    const { stdout: chestPRs } = cli('pr --muscle chest', testHome);
    expect(chestPRs).toContain('Bench Press');
    expect(chestPRs).not.toContain('Squat');

    const { stdout: legPRs } = cli('pr --muscle quads', testHome);
    expect(legPRs).toContain('Squat');
    expect(legPRs).not.toContain('Bench Press');
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
    expect(parsed[0].exercise).toBe('bench-press');
    expect(parsed[0].e1rm).toBeGreaterThan(185);
  });
});

describe('Volume analysis', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    resetStorage();
    storage = new Storage(path.join(testHome, '.workout'));
  });

  afterEach(() => {
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
            { weight: 135, reps: 10, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const { stdout } = cli('volume --week', testHome);
    expect(stdout).toContain('Total sets: 3');
    expect(stdout).toContain('4,050'); // 135 * 10 * 3 = 4050
  });

  it('groups by muscle', () => {
    const today = new Date().toISOString().split('T')[0]!;
    storage.finishWorkout({
      id: `${today}-full`,
      date: today,
      template: null,
      startTime: `${today}T10:00:00Z`,
      endTime: `${today}T11:00:00Z`,
      exercises: [
        { exercise: 'bench-press', sets: [{ weight: 135, reps: 10, rir: null }] },
        { exercise: 'squat', sets: [{ weight: 185, reps: 10, rir: null }] },
      ],
      notes: [],
    });

    const { stdout } = cli('volume --week --by muscle', testHome);
    expect(stdout).toContain('By Muscle Group');
    expect(stdout).toContain('chest');
    expect(stdout).toContain('quads');
  });

  it('groups by exercise', () => {
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
            { weight: 135, reps: 8, rir: null },
          ],
        },
      ],
      notes: [],
    });

    const { stdout } = cli('volume --week --by exercise', testHome);
    expect(stdout).toContain('By Exercise');
    expect(stdout).toContain('Bench Press');
    expect(stdout).toContain('2 sets');
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
    expect(parsed.byMuscle.chest).toBeDefined();
  });
});

describe('Progression tracking', () => {
  let testHome: string;
  let storage: Storage;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-test-'));
    resetStorage();
    storage = new Storage(path.join(testHome, '.workout'));
  });

  afterEach(() => {
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('shows no history message when empty', () => {
    const { stdout, exitCode } = cli('progression bench-press', testHome);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No history');
  });

  it('shows progression over time', () => {
    const dates = ['2026-01-15', '2026-01-18', '2026-01-22'];
    const weights = [135, 140, 145];

    for (let i = 0; i < dates.length; i++) {
      storage.finishWorkout({
        id: `${dates[i]}-push`,
        date: dates[i]!,
        template: null,
        startTime: `${dates[i]}T10:00:00Z`,
        endTime: `${dates[i]}T11:00:00Z`,
        exercises: [
          { exercise: 'bench-press', sets: [{ weight: weights[i]!, reps: 8, rir: null }] },
        ],
        notes: [],
      });
    }

    const { stdout } = cli('progression bench-press', testHome);
    expect(stdout).toContain('Progression for Bench Press');
    expect(stdout).toContain('2026-01-15');
    expect(stdout).toContain('2026-01-22');
    expect(stdout).toContain('135');
    expect(stdout).toContain('145');
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
      id: '2026-01-22-push',
      date: '2026-01-22',
      template: null,
      startTime: '2026-01-22T10:00:00Z',
      endTime: '2026-01-22T11:00:00Z',
      exercises: [{ exercise: 'bench-press', sets: [{ weight: 155, reps: 10, rir: null }] }],
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
    expect(parsed.progression[0].bestWeight).toBe(135);
    expect(parsed.progression[0].e1rm).toBeGreaterThan(135);
  });
});
