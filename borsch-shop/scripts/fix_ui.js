const fs = require('fs');
const path = require('path');

const uiDir = path.join(process.cwd(), 'packages/ui/src/components');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
    const file = path.join(uiDir, f);
    let content = fs.readFileSync(file, 'utf8');

    // Fix absolute utils to relative
    content = content.replace(/@\/lib\/utils/g, '../utils');
    
    // Fix absolute components to relative
    content = content.replace(/@\/components\/ui/g, '.');

    fs.writeFileSync(file, content);
});

// Fix package.json of UI
const pkgFile = path.join(process.cwd(), 'packages/ui/package.json');
let pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
pkg.dependencies['@base-ui/react'] = '^1.3.0';
pkg.dependencies['class-variance-authority'] = '^0.7.1';
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));

// Fix test duplicates
['useMenuStore.test.ts', 'useOrdersStore.test.ts'].forEach(f => {
    const p = path.join(process.cwd(), 'apps/backoffice/src/store/__tests__', f);
    if (fs.existsSync(p)) {
        let c = fs.readFileSync(p, 'utf8');
        c = c.replace(/import \{ vi \} from "vitest";\n/g, ''); 
        fs.writeFileSync(p, c);
    }
});

const aiSettings = path.join(process.cwd(), 'apps/backoffice/src/app/(protected)/ai-settings/page.tsx');
if (fs.existsSync(aiSettings)) {
    let ai = fs.readFileSync(aiSettings, 'utf8');
    ai = ai.replace(/\(val\) =>/g, '(val: string) =>'); 
    fs.writeFileSync(aiSettings, ai);
}

const sidebar = path.join(process.cwd(), 'packages/ui/src/components/sidebar.tsx');
if (fs.existsSync(sidebar)) {
    let sb = fs.readFileSync(sidebar, 'utf8');
    sb = sb.replace(/\(event\) =>/g, '(event: any) =>');
    fs.writeFileSync(sidebar, sb);
}

console.log('Fixed UI issues.');
