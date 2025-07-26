#!/usr/bin/env node

import { parseArgs } from '../src/cli/args-parser.js';
import { build } from '../src/core/file-processor.js';
import { serve } from '../src/server/dev-server.js';
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
        
      case 'serve':
        logger.info('Starting development server...');
        await serve(args);
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
  serve     Start development server with live reload

Options:
  --source, -s    Source directory (default: src)
  --output, -o    Output directory (default: dist)
  --includes, -i  Includes directory (default: includes)
  --head          Custom head include file path
  --port, -p      Development server port (default: 3000)
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  vanilla-wafer build --source src --output dist
  vanilla-wafer serve --source src --port 8080
  vanilla-wafer build --head common/head.html
`);
}

main();