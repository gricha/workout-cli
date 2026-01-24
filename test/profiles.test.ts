import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getProfiles,
  profileExists,
  createProfile,
  deleteProfile,
  hasLegacyData,
  migrateLegacyData,
  resolveProfile,
  getBaseDir,
  getProfilesDir,
} from '../src/data/profiles.js';

const originalHome = process.env.HOME;
let testHome: string;

describe('Profiles', () => {
  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-profile-test-'));
    process.env.HOME = testHome;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (testHome) {
      fs.rmSync(testHome, { recursive: true, force: true });
    }
  });

  it('getProfiles returns empty array when no profiles exist', () => {
    expect(getProfiles()).toEqual([]);
  });

  it('createProfile creates a profile directory', () => {
    createProfile('mike');
    expect(profileExists('mike')).toBe(true);
    expect(getProfiles()).toContain('mike');
  });

  it('createProfile creates workouts subdirectory', () => {
    createProfile('sarah');
    const workoutsDir = path.join(getProfilesDir(), 'sarah', 'workouts');
    expect(fs.existsSync(workoutsDir)).toBe(true);
  });

  it('createProfile validates profile name', () => {
    expect(() => createProfile('Invalid Name')).toThrow();
    expect(() => createProfile('-invalid')).toThrow();
    expect(() => createProfile('invalid-')).toThrow();
    expect(() => createProfile('')).toThrow();
  });

  it('createProfile allows valid profile names', () => {
    createProfile('a');
    createProfile('abc');
    createProfile('user-1');
    createProfile('my-profile-2');
    expect(profileExists('a')).toBe(true);
    expect(profileExists('abc')).toBe(true);
    expect(profileExists('user-1')).toBe(true);
    expect(profileExists('my-profile-2')).toBe(true);
  });

  it('createProfile throws for duplicate profile', () => {
    createProfile('mike');
    expect(() => createProfile('mike')).toThrow('already exists');
  });

  it('deleteProfile removes profile directory', () => {
    createProfile('mike');
    createProfile('sarah');
    deleteProfile('mike');
    expect(profileExists('mike')).toBe(false);
    expect(profileExists('sarah')).toBe(true);
  });

  it('deleteProfile throws when profile does not exist', () => {
    expect(() => deleteProfile('nonexistent')).toThrow('does not exist');
  });

  it('deleteProfile prevents deleting the only profile', () => {
    createProfile('mike');
    expect(() => deleteProfile('mike')).toThrow('Cannot delete the only profile');
  });

  it('resolveProfile creates default profile when none exist', () => {
    const resolved = resolveProfile();
    expect(resolved).toBe('default');
    expect(profileExists('default')).toBe(true);
  });

  it('resolveProfile returns single profile automatically', () => {
    createProfile('mike');
    const resolved = resolveProfile();
    expect(resolved).toBe('mike');
  });

  it('resolveProfile throws when multiple profiles exist and none specified', () => {
    createProfile('mike');
    createProfile('sarah');
    expect(() => resolveProfile()).toThrow('Multiple profiles exist');
  });

  it('resolveProfile returns explicit profile when specified', () => {
    createProfile('mike');
    createProfile('sarah');
    const resolved = resolveProfile('sarah');
    expect(resolved).toBe('sarah');
  });

  it('resolveProfile throws for non-existent explicit profile', () => {
    createProfile('mike');
    expect(() => resolveProfile('nonexistent')).toThrow('does not exist');
  });

  it('hasLegacyData detects legacy files', () => {
    const baseDir = getBaseDir();
    fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(path.join(baseDir, 'config.json'), '{}');
    expect(hasLegacyData()).toBe(true);
  });

  it('migrateLegacyData moves files to default profile', () => {
    const baseDir = getBaseDir();
    fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(path.join(baseDir, 'config.json'), '{"units":"kg"}');
    fs.writeFileSync(path.join(baseDir, 'templates.json'), '[]');
    fs.mkdirSync(path.join(baseDir, 'workouts'), { recursive: true });
    fs.writeFileSync(path.join(baseDir, 'workouts', '2026-01-01.json'), '{}');

    migrateLegacyData();

    expect(profileExists('default')).toBe(true);
    expect(fs.existsSync(path.join(getProfilesDir(), 'default', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(getProfilesDir(), 'default', 'templates.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(getProfilesDir(), 'default', 'workouts', '2026-01-01.json'))
    ).toBe(true);
    expect(fs.existsSync(path.join(baseDir, 'config.json'))).toBe(false);
    expect(fs.existsSync(path.join(baseDir, 'workouts'))).toBe(false);
  });
});
