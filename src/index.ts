#!/usr/bin/env bun
import { Command } from 'commander';
import { createExercisesCommand } from './commands/exercises.js';
import { createTemplatesCommand } from './commands/templates.js';
import {
  createStartCommand,
  createLogCommand,
  createStatusCommand,
  createDoneCommand,
  createCancelCommand,
  createNoteCommand,
  createSwapCommand,
  createAddCommand,
  createUndoCommand,
  createEditCommand,
  createDeleteCommand,
} from './commands/session.js';
import { createLastCommand, createHistoryCommand } from './commands/history.js';
import {
  createPRCommand,
  createVolumeCommand,
  createProgressionCommand,
} from './commands/analytics.js';
import { createProfileCommand } from './commands/profile.js';

const program = new Command();

program
  .name('workout')
  .description('CLI for tracking workouts, managing exercises, and querying training history')
  .version('0.4.1')
  .option('-p, --profile <name>', 'User profile to use');

function getProfile(): string | undefined {
  return program.opts()['profile'] as string | undefined;
}

program.addCommand(createProfileCommand());
program.addCommand(createExercisesCommand(getProfile));
program.addCommand(createTemplatesCommand(getProfile));
program.addCommand(createStartCommand(getProfile));
program.addCommand(createLogCommand(getProfile));
program.addCommand(createStatusCommand(getProfile));
program.addCommand(createDoneCommand(getProfile));
program.addCommand(createCancelCommand(getProfile));
program.addCommand(createNoteCommand(getProfile));
program.addCommand(createSwapCommand(getProfile));
program.addCommand(createAddCommand(getProfile));
program.addCommand(createUndoCommand(getProfile));
program.addCommand(createEditCommand(getProfile));
program.addCommand(createDeleteCommand(getProfile));
program.addCommand(createLastCommand(getProfile));
program.addCommand(createHistoryCommand(getProfile));
program.addCommand(createPRCommand(getProfile));
program.addCommand(createVolumeCommand(getProfile));
program.addCommand(createProgressionCommand(getProfile));

program.parse();
