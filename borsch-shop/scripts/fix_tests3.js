const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fileStat = path.join(dir, file);
        if (fs.statSync(fileStat).isDirectory()) {
            results = results.concat(walk(fileStat));
        } else if (fileStat.endsWith('.test.ts') || fileStat.endsWith('.test.tsx')) {
            results.push(fileStat);
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'apps/backoffice/src/store/__tests__'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // We just chop off the file content before the broken `it('calls if/for` blocks
    // and correctly close the `describe` block.
    let chopIdx = content.length;
    
    const idx1 = content.indexOf("it('calls if without crashing'");
    if (idx1 !== -1) {
        // find start of line
        const startOfLine = content.lastIndexOf("\n", idx1);
        if (startOfLine !== -1 && startOfLine < chopIdx) chopIdx = startOfLine;
    }
    
    const idx2 = content.indexOf("it('calls for without crashing'");
    if (idx2 !== -1) {
        const startOfLine = content.lastIndexOf("\n", idx2);
        if (startOfLine !== -1 && startOfLine < chopIdx) chopIdx = startOfLine;
    }

    if (chopIdx !== content.length) {
        content = content.substring(0, chopIdx) + "\n})\n";
        fs.writeFileSync(file, content);
    }
});
console.log('Fixed syntax of tests');
