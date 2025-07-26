#!/usr/bin/env node

import { parseArgs } from '../src/cli/args-parser.js';
import { build } from '../src/core/file-processor.js';
import { watch } from '../src/core/file-watcher.js';
import { DevServer } from '../src/server/dev-server.js';
import { liveReload } from '../src/server/live-reload.js';
import { logger } from '../src/utils/logger.js';

const VERSION = '0.4.0';

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    
    // Handle version and help flags
    if (args.version) {
      console.log(`dompile v${VERSION}`);
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
        
      case 'serve':
        logger.info('Starting development server with live reload...');
        const server = new DevServer(args);
        
        // Enable live reload
        liveReload.setEnabled(true);
        
        // Start server
        await server.start();
        
        // Start file watcher with live reload callback
        const watchConfig = {
          ...args,
          onReload: (eventType, filePath) => {
            liveReload.notifyReload(eventType, filePath);
          }
        };
        
        await watch(watchConfig);
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
dompile v${VERSION}

Usage: dompile <command> [options]

Commands:
  build     Build static site from source files
  watch     Watch files and rebuild on changes
  serve     Start development server with live reload

Options:
  --source, -s    Source directory (default: src)
  --output, -o    Output directory (default: dist)
  --includes, -i  Includes directory (default: includes)
  --head          Custom head include file path
  --port, -p      Server port (default: 3000)
  --host          Server host (default: localhost)
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  dompile build --source src --output dist
  dompile watch --source src --output dist
  dompile serve --source src --output dist --port 3000
  dompile build --head common/head.html
`);
}

main();