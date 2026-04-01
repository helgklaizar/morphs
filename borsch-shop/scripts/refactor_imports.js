const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'apps/backoffice/src'));
let localDbChanged = 0;
let uiChanged = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace localDb imports
    content = content.replace(/@\/lib\/localDb/g, '@borsch/db-local');
    
    // Replace UI components imports
    content = content.replace(/@\/components\/ui/g, '@borsch/ui/components');
    
    // Replace lib/utils if used inside components
    content = content.replace(/@\/lib\/utils/g, '@borsch/ui/utils');

    if (content !== original) {
        fs.writeFileSync(file, content);
        if (original.includes('@/lib/localDb')) localDbChanged++;
        if (original.includes('@/components/ui') || original.includes('@/lib/utils')) uiChanged++;
    }
});

console.log(`Updated localDb imports in ${localDbChanged} files.`);
console.log(`Updated UI/utils imports in ${uiChanged} files.`);
