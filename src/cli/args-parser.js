/**
 * Command-line argument parser for dompile
 * Handles parsing of CLI arguments and options
 */

export function parseArgs(argv) {
  const args = {
    command: null,
    source: 'src',
    output: 'dist', 
    includes: 'includes',
    head: null,
    port: 3000,
    host: 'localhost',
    help: false,
    version: false
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    // Commands
    if (arg === 'build' || arg === 'watch' || arg === 'serve') {
      args.command = arg;
      continue;
    }
    
    // Check for unknown commands (first non-option argument)
    if (!arg.startsWith('-') && !args.command) {
      args.command = arg; // Set unknown command to be handled by CLI
      continue;
    }
    
    // Flags
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    
    if (arg === '--version' || arg === '-v') {
      args.version = true;
      continue;
    }
    
    // Options with values
    if ((arg === '--source' || arg === '-s') && nextArg) {
      args.source = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--output' || arg === '-o') && nextArg) {
      args.output = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--includes' || arg === '-i') && nextArg) {
      args.includes = nextArg;
      i++;
      continue;
    }
    
    if (arg === '--head' && nextArg) {
      args.head = nextArg;
      i++;
      continue;
    }
    
    if ((arg === '--port' || arg === '-p') && nextArg) {
      args.port = parseInt(nextArg, 10);
      if (isNaN(args.port) || args.port < 1 || args.port > 65535) {
        throw new Error('Port must be a number between 1 and 65535');
      }
      i++;
      continue;
    }
    
    if (arg === '--host' && nextArg) {
      args.host = nextArg;
      i++;
      continue;
    }
    
    // Unknown arguments
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  
  return args;
}