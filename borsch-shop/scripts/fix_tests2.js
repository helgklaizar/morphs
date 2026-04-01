const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        if (fs.statSync(file).isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'apps/backoffice/src/store/__tests__'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove the broken blocks completely by matching 'calls if without crashing' and following contents until '  })' is closed.
    // The exact broken pattern currently looks like:
    /*
  it('calls if without crashing', async () => {
    const store = useTranslationsStore.getState()
    
      expect(true).toBe(true)
    }
  })
    */
    content = content.replace(/[ \t]*it\('calls (?:if|for) without crashing', async \(\) => \{\s*const store = [^]+?expect\(true\)\.toBe\(true\)\s*\}\s*\)\s*/g, '');
    
    // Check if there are still any other syntactic braces issues. If not, this is enough.
    fs.writeFileSync(file, content);
});
console.log('Cleaned up broken test blocks.');
