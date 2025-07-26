#!/usr/bin/env node

import { parseArgs } from '../src/cli/args-parser.js';
import { build } from '../src/core/file-processor.js';
import { watch } from '../src/core/file-watcher.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.1.0';

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    
    // Handle version and help flags
    if (args.version) {
      console.log(`vanilla-wafer v${VERSION}`);
      process.exit(0);
    }
    
    if (args.help) {
      showHelp();
      process.exit(0);
    }
    
    if (!args.command) {
      showHelp();
      process.exit(0);
    }
    
    // Execute commands
    switch (args.command) {
      case 'build':
        logger.info('Building static site...');
        await build(args);
        logger.info('Build completed successfully!');
        break;
        
      case 'watch':
        logger.info('Starting file watcher...');
        await watch(args);
        break;
        
      default:
        logger.error(`Unknown command: ${args.command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
vanilla-wafer v${VERSION}

Usage: vanilla-wafer <command> [options]

Commands:
  build     Build static site from source files
  watch     Watch files and rebuild on changes

Options:
  --source, -s    Source directory (default: src)
  --output, -o    Output directory (default: dist)
  --includes, -i  Includes directory (default: includes)
  --head          Custom head include file path
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  vanilla-wafer build --source src --output dist
  vanilla-wafer watch --source src --output dist
  vanilla-wafer build --head common/head.html
`);
}

main();