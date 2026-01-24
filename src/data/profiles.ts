import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getBaseDir(): string {
  return path.join(os.homedir(), '.workout');
}

export function getProfilesDir(): string {
  return path.join(getBaseDir(), 'profiles');
}

export function getProfiles(): string[] {
  const profilesDir = getProfilesDir();
  if (!fs.existsSync(profilesDir)) {
    return [];
  }
  return fs.readdirSync(profilesDir).filter((name) => {
    const profilePath = path.join(profilesDir, name);
    return fs.statSync(profilePath).isDirectory();
  });
}

export function profileExists(name: string): boolean {
  const profilePath = path.join(getProfilesDir(), name);
  return fs.existsSync(profilePath) && fs.statSync(profilePath).isDirectory();
}

export function createProfile(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name)) {
    throw new Error(
      'Profile name must be lowercase alphanumeric with optional hyphens (not at start/end)'
    );
  }
  if (profileExists(name)) {
    throw new Error(`Profile "${name}" already exists`);
  }
  const profilePath = path.join(getProfilesDir(), name);
  fs.mkdirSync(profilePath, { recursive: true });
  fs.mkdirSync(path.join(profilePath, 'workouts'), { recursive: true });
}

export function deleteProfile(name: string): void {
  if (!profileExists(name)) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  const profiles = getProfiles();
  if (profiles.length === 1) {
    throw new Error('Cannot delete the only profile');
  }
  const profilePath = path.join(getProfilesDir(), name);
  fs.rmSync(profilePath, { recursive: true });
}

export function hasLegacyData(): boolean {
  const baseDir = getBaseDir();
  const legacyFiles = ['config.json', 'templates.json', 'current.json'];
  const legacyWorkouts = path.join(baseDir, 'workouts');

  for (const file of legacyFiles) {
    if (fs.existsSync(path.join(baseDir, file))) {
      return true;
    }
  }
  if (fs.existsSync(legacyWorkouts) && fs.statSync(legacyWorkouts).isDirectory()) {
    return true;
  }
  return false;
}

export function migrateLegacyData(): void {
  if (!hasLegacyData()) {
    return;
  }

  const baseDir = getBaseDir();
  const profilesDir = getProfilesDir();
  const defaultProfile = path.join(profilesDir, 'default');
  fs.mkdirSync(defaultProfile, { recursive: true });

  const filesToMove = ['config.json', 'templates.json', 'current.json'];
  for (const file of filesToMove) {
    const src = path.join(baseDir, file);
    const dest = path.join(defaultProfile, file);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
    }
  }

  const legacyWorkouts = path.join(baseDir, 'workouts');
  const newWorkouts = path.join(defaultProfile, 'workouts');
  if (fs.existsSync(legacyWorkouts) && fs.statSync(legacyWorkouts).isDirectory()) {
    fs.renameSync(legacyWorkouts, newWorkouts);
  } else {
    fs.mkdirSync(newWorkouts, { recursive: true });
  }
}

export function resolveProfile(explicitProfile?: string): string {
  const profiles = getProfiles();

  if (explicitProfile) {
    if (!profileExists(explicitProfile)) {
      throw new Error(`Profile "${explicitProfile}" does not exist`);
    }
    return explicitProfile;
  }

  if (profiles.length === 0) {
    if (hasLegacyData()) {
      migrateLegacyData();
      return 'default';
    }
    createProfile('default');
    return 'default';
  }

  if (profiles.length === 1) {
    return profiles[0]!;
  }

  throw new Error(
    `Multiple profiles exist (${profiles.join(', ')}). Please specify --profile <name>`
  );
}
