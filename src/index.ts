#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program.name('workout').description('Workout CLI').version('0.1.0');

program.parse();
