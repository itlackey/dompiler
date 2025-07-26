/**
 * Command-line argument parser for vanilla-wafer
 * Handles parsing of CLI arguments and options
 */

export function parseArgs(argv) {
  const args = {
    command: null,
    source: 'src',
    output: 'dist', 
    includes: 'includes',
    head: null,
    help: false,
    version: false
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    // Commands
    if (arg === 'build' || arg === 'watch') {
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
    
    
    // Unknown arguments
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  
  return args;
}