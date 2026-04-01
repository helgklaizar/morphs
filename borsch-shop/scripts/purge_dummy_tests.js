const fs = require('fs');
const path = require('path');

const testDir = path.join(process.cwd(), 'apps/backoffice/src/store/__tests__');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));

files.forEach(f => {
    const file = path.join(testDir, f);
    let code = fs.readFileSync(file, 'utf8');
    
    // Truncate at the first dummy "it('calls " test
    const idx = code.indexOf("  it('calls");
    if (idx !== -1) {
        code = code.substring(0, idx) + "})\n";
        fs.writeFileSync(file, code);
    }
});
console.log('Removed dummy store tests.');
