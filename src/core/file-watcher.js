/**
 * File watching system for dompile
 * Watches source files and rebuilds on changes
 */

import chokidar from 'chokidar';
import { build, incrementalBuild, initializeModificationCache } from './file-processor.js';
import { logger } from '../utils/logger.js';

/**
 * Start watching files and rebuild on changes
 * @param {Object} options - Watch configuration options
 * @param {string} [options.source='src'] - Source directory path
 * @param {string} [options.output='dist'] - Output directory path  
 * @param {string} [options.includes='includes'] - Include directory name
 * @param {string} [options.head=null] - Custom head file path
 * @param {boolean} [options.clean=true] - Whether to clean output directory before build
 */
export async function watch(options = {}) {
  const config = {
    source: 'src',
    output: 'dist',
    includes: 'includes',
    head: null,
    clean: true,
    ...options
  };

  // Initial build
  logger.info('Starting file watcher...');
  let dependencyTracker, assetTracker;
  try {
    const result = await build(config);
    dependencyTracker = result.dependencyTracker;
    assetTracker = result.assetTracker;
    
    // Initialize modification cache for incremental builds
    await initializeModificationCache(config.source);
    
    logger.success('Initial build completed');
  } catch (error) {
    logger.error('Initial build failed:', error.message);
    process.exit(1);
  }

  // Set up file watcher
  const watcher = chokidar.watch(config.source, {
    ignored: ['**/node_modules/**', '**/.git/**'],
    persistent: true,
    ignoreInitial: true
  });

  let buildInProgress = false;
  let debounceTimer = null;

  const handleFileChange = async (eventType, filePath) => {
    if (buildInProgress) {
      return; // Skip if already building
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce file changes (100ms delay)
    debounceTimer = setTimeout(async () => {
      logger.info(`File ${eventType}: ${filePath}`);
      buildInProgress = true;

      try {
        // Use incremental build for better performance
        const result = await incrementalBuild(config, filePath, dependencyTracker, assetTracker);
        dependencyTracker = result.dependencyTracker;
        assetTracker = result.assetTracker;
        
        logger.success('Incremental rebuild completed');
        
        // Notify live reload clients if callback provided
        if (config.onReload) {
          config.onReload(eventType, filePath);
        }
      } catch (error) {
        logger.error('Incremental rebuild failed:', error.message);
        
        // Fallback to full build if incremental build fails
        try {
          logger.info('Falling back to full rebuild...');
          const result = await build(config);
          dependencyTracker = result.dependencyTracker;
          assetTracker = result.assetTracker;
          await initializeModificationCache(config.source);
          logger.success('Full rebuild completed');
          
          if (config.onReload) {
            config.onReload(eventType, filePath);
          }
        } catch (fullBuildError) {
          logger.error('Full rebuild also failed:', fullBuildError.message);
        }
      } finally {
        buildInProgress = false;
      }
    }, 100);
  };

  watcher
    .on('add', (filePath) => handleFileChange('added', filePath))
    .on('change', (filePath) => handleFileChange('changed', filePath))
    .on('unlink', (filePath) => handleFileChange('removed', filePath))
    .on('addDir', (dirPath) => logger.debug(`Directory added: ${dirPath}`))
    .on('unlinkDir', (dirPath) => logger.debug(`Directory removed: ${dirPath}`))
    .on('error', (error) => logger.error('Watcher error:', error))
    .on('ready', () => {
      logger.info(`Watching for changes in ${config.source}/`);
      logger.info('Press Ctrl+C to stop watching');
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });
}