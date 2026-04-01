const fs = require('fs');
const path = require('path');

const filesToFix = [
  'apps/backoffice/src/store/__tests__/useOrdersStore.test.ts',
  'apps/backoffice/src/store/__tests__/useMenuStore.test.ts'
];

filesToFix.forEach(f => {
  const p = path.join(process.cwd(), f);
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/vi\.Mock/g, 'Mock');
    c = c.replace(/import \{ describe, it, expect, vi, beforeEach \} from 'vitest'/, "import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'");
    
    // Fix Order types in useOrdersStore.test.ts
    c = c.replace(/import \{ useOrdersStore, Order, OrderStatus \} from '\.\.\/useOrdersStore'/, "import { useOrdersStore } from '../useOrdersStore'\nimport { Order, OrderStatus } from '@borsch/types'");
    
    fs.writeFileSync(p, c);
  }
});
console.log('Fixed vitest Mock and type imports.');
