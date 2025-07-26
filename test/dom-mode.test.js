// Quick test file to debug DOM mode
import fs from 'fs/promises';
import { processDOMMode } from '../src/core/dom-processor-v2.js';

const testHTML = `
<div data-layout="/layouts/default.html">
  <template data-slot="title">My Test Title</template>
  <h1>Main Content</h1>
  <p>This should go in the default slot.</p>
</div>
`;

const layoutHTML = `
<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default Title</slot></title>
</head>
<body>
  <main><slot></slot></main>
</body>
</html>
`;

// Write test files
await fs.mkdir('./test-dom/layouts', { recursive: true });
await fs.writeFile('./test-dom/layouts/default.html', layoutHTML);

try {
  const result = await processDOMMode(testHTML, './test.html', './test-dom');
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
}