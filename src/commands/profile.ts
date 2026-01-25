import { Command } from 'commander';
import { getProfiles, createProfile, deleteProfile } from '../data/profiles.js';

export function createProfileCommand(): Command {
  const profile = new Command('profile').description('Manage user profiles');

  profile
    .command('list')
    .description('List all profiles')
    .action(() => {
      const profiles = getProfiles();

      if (profiles.length === 0) {
        console.log('No profiles found. A default profile will be created on first use.');
        return;
      }

      console.log('Profiles:');
      for (const p of profiles) {
        console.log(`  ${p}`);
      }
    });

  profile
    .command('create <name>')
    .description('Create a new profile')
    .action((name: string) => {
      try {
        createProfile(name);
        console.log(`Created profile: ${name}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  profile
    .command('delete <name>')
    .description('Delete a profile')
    .action((name: string) => {
      try {
        deleteProfile(name);
        console.log(`Deleted profile: ${name}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  return profile;
}
