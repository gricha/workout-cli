import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

describe('CLI integration', () => {
  let testHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  describe('exercises', () => {
    it('lists default exercises', () => {
      const { stdout, exitCode } = cli('exercises list', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('bench-press');
      expect(stdout).toContain('squat');
      expect(stdout).toContain('deadlift');
    });

    it('filters by muscle', () => {
      const { stdout, exitCode } = cli('exercises list --muscle chest', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('bench-press');
      expect(stdout).not.toContain('squat');
    });

    it('filters by type', () => {
      const { stdout, exitCode } = cli('exercises list --type isolation', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('bicep-curl');
      expect(stdout).not.toContain('deadlift');
    });

    it('shows exercise details', () => {
      const { stdout, exitCode } = cli('exercises show bench-press', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Name: Bench Press');
      expect(stdout).toContain('Type: compound');
      expect(stdout).toContain('Equipment: barbell');
      expect(stdout).toContain('Muscles: chest');
    });

    it('shows exercise by alias', () => {
      const { stdout, exitCode } = cli('exercises show bench', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Name: Bench Press');
    });

    it('adds custom exercise', () => {
      const { exitCode } = cli(
        'exercises add "Zercher Squat" --muscles quads,glutes --type compound --equipment barbell',
        testHome
      );
      expect(exitCode).toBe(0);

      const { stdout } = cli('exercises show zercher-squat', testHome);
      expect(stdout).toContain('Name: Zercher Squat');
    });

    it('outputs JSON', () => {
      const { stdout, exitCode } = cli('exercises show bench-press --json', testHome);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.id).toBe('bench-press');
      expect(parsed.muscles).toContain('chest');
    });

    it('fails for unknown exercise', () => {
      const { exitCode } = cli('exercises show nonexistent', testHome);
      expect(exitCode).toBe(1);
    });
  });

  describe('templates', () => {
    it('starts with no templates', () => {
      const { stdout, exitCode } = cli('templates list', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No templates found');
    });

    it('creates template', () => {
      const { exitCode } = cli(
        'templates create "Push A" --exercises "bench-press:3x8-12, overhead-press:3x8-12"',
        testHome
      );
      expect(exitCode).toBe(0);

      const { stdout } = cli('templates show push-a', testHome);
      expect(stdout).toContain('Name: Push A');
      expect(stdout).toContain('bench-press: 3x8-12');
    });

    it('lists templates', () => {
      cli('templates create "Push" --exercises "bench-press:3x8"', testHome);
      cli('templates create "Pull" --exercises "barbell-row:3x8"', testHome);

      const { stdout } = cli('templates list', testHome);
      expect(stdout).toContain('push');
      expect(stdout).toContain('pull');
    });

    it('deletes template', () => {
      cli('templates create "To Delete" --exercises "squat:3x5"', testHome);
      const { exitCode } = cli('templates delete to-delete', testHome);
      expect(exitCode).toBe(0);

      const { stdout } = cli('templates list', testHome);
      expect(stdout).toContain('No templates found');
    });
  });

  describe('workout session', () => {
    it('shows no active workout initially', () => {
      const { stdout, exitCode } = cli('status', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No active workout');
    });

    it('starts freestyle workout', () => {
      const { stdout, exitCode } = cli('start --empty', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Started workout');
      expect(stdout).toContain('Freestyle');
    });

    it('starts workout from template', () => {
      cli('templates create "Push" --exercises "bench-press:3x8"', testHome);
      const { stdout, exitCode } = cli('start push', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Template: push');
    });

    it('prevents starting second workout', () => {
      cli('start --empty', testHome);
      const { exitCode } = cli('start --empty', testHome);
      expect(exitCode).toBe(1);
    });

    it('logs sets', () => {
      cli('start --empty', testHome);
      const { stdout, exitCode } = cli('log bench-press 135 10', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Logged 1 set');
      expect(stdout).toContain('Bench Press');
      expect(stdout).toContain('135');
    });

    it('logs multiple sets at once', () => {
      cli('start --empty', testHome);
      const { stdout, exitCode } = cli('log squat 185 5,5,5', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Logged 3 sets');
    });

    it('shows workout status', () => {
      cli('start --empty', testHome);
      cli('log bench-press 135 10', testHome);
      cli('log bench-press 135 8', testHome);

      const { stdout } = cli('status', testHome);
      expect(stdout).toContain('Bench Press');
      expect(stdout).toContain('135');
    });

    it('cancels workout', () => {
      cli('start --empty', testHome);
      cli('log squat 225 5', testHome);

      const { exitCode } = cli('cancel', testHome);
      expect(exitCode).toBe(0);

      const { stdout } = cli('status', testHome);
      expect(stdout).toContain('No active workout');
    });

    it('finishes workout', () => {
      cli('start --empty', testHome);
      cli('log bench-press 135 10', testHome);
      cli('log bench-press 135 8', testHome);

      const { stdout, exitCode } = cli('done', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Workout complete');
      expect(stdout).toContain('Total sets: 2');

      const { stdout: statusOut } = cli('status', testHome);
      expect(statusOut).toContain('No active workout');
    });
  });

  describe('history', () => {
    beforeEach(() => {
      cli('start --empty', testHome);
      cli('log bench-press 135 10', testHome);
      cli('log bench-press 135 8', testHome);
      cli('log squat 185 5', testHome);
      cli('done', testHome);
    });

    it('shows last workout', () => {
      const { stdout, exitCode } = cli('last', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Bench Press');
      expect(stdout).toContain('Squat');
    });

    it('shows last workout with full details', () => {
      const { stdout, exitCode } = cli('last --full', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('135lbs x 10');
      expect(stdout).toContain('135lbs x 8');
    });

    it('shows exercise history', () => {
      const { stdout, exitCode } = cli('history bench-press', testHome);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('History for Bench Press');
      expect(stdout).toContain('135');
    });

    it('outputs history as JSON', () => {
      const { stdout, exitCode } = cli('history bench-press --json', testHome);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].log.exercise).toBe('bench-press');
    });
  });
});
