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
} from './commands/session.js';
import { createLastCommand, createHistoryCommand } from './commands/history.js';
import {
  createPRCommand,
  createVolumeCommand,
  createProgressionCommand,
} from './commands/analytics.js';

const program = new Command();

program
  .name('workout')
  .description('CLI for tracking workouts, managing exercises, and querying training history')
  .version('0.2.0');

program.addCommand(createExercisesCommand());
program.addCommand(createTemplatesCommand());
program.addCommand(createStartCommand());
program.addCommand(createLogCommand());
program.addCommand(createStatusCommand());
program.addCommand(createDoneCommand());
program.addCommand(createCancelCommand());
program.addCommand(createNoteCommand());
program.addCommand(createSwapCommand());
program.addCommand(createAddCommand());
program.addCommand(createLastCommand());
program.addCommand(createHistoryCommand());
program.addCommand(createPRCommand());
program.addCommand(createVolumeCommand());
program.addCommand(createProgressionCommand());

program.parse();
