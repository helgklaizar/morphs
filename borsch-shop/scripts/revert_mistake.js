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
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'apps/backoffice/src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // This reverses the damage of `/e =>/g` replacing the end of variable names like `state =>`
    content = content.replace(/([a-zA-Z0-9_]+)\(e: any\) =>/g, '$1e =>');

    // I also did: content = content.replace(/call =>/g, '(call: any) =>');
    // If that broke something like `const call =>`, let's see. That one was relatively safe.
    // I also did: content = content.replace(/\(e: any =>/g, '(e =>');
    
    // Reverse `(e: any =>` back just in case? Or actually I already restored it in original?
    // Let's also restore `stat(e: any) =>` that actually happened!

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Fixed " + file);
    }
});
console.log("Done reverting e=> bug.");
