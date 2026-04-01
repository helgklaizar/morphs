import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'schema.sql');
const storePath = path.join(process.cwd(), 'src', 'store');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const tables = [];
const tableRegex = /CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)/g;
let match;
while ((match = tableRegex.exec(schemaContent)) !== null) {
  tables.push(match[1]);
}

const storeFiles = fs.readdirSync(storePath).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
const storeContents = storeFiles.map(f => {
  const content = fs.readFileSync(path.join(storePath, f), 'utf8');
  // Get all function names
  const funcs = [];
  const funcRegex = /^\s*([a-zA-Z0-9_]+)\s*:\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*=>/gm;
  let fMatch;
  while ((fMatch = funcRegex.exec(content)) !== null) {
      if (!['set', 'get'].includes(fMatch[1])) funcs.push(fMatch[1]);
  }
  return { name: f, content, funcs };
});

console.log('--- РЕЗУЛЬТАТЫ АНАЛИЗА СЛЕПЫХ ЗОН (БД vs СТОРЫ) ---\n');

let totalMissing = 0;

tables.forEach(table => {
  let relevantStore = storeContents.find(s => s.content.includes(`INTO ${table}`) || s.content.includes(`FROM ${table}`) || s.content.includes(`UPDATE ${table}`));
  
  if (!relevantStore) {
    relevantStore = storeContents.find(s => s.content.includes(table));
  }

  if (!relevantStore) {
    console.log(`❌ Таблица [${table.padEnd(20)}]: Стор не найден! Логика отсутствует полностью.`);
    totalMissing += 4;
    return;
  }
  
  const content = relevantStore.content;
  
  // Check exact SQL operations as definitive proof of CRUD
  const hasFetch = content.includes(`SELECT`) && content.includes(table) || /fetch|load|get/i.test(relevantStore.funcs.join(' '));
  const hasInsert = content.includes(`INSERT INTO ${table}`) || /add|create|insert/i.test(relevantStore.funcs.join(' '));
  const hasUpdate = content.includes(`UPDATE ${table}`) || /update|edit|modify/i.test(relevantStore.funcs.join(' '));
  const hasDelete = content.includes(`DELETE FROM ${table}`) || /delete|remove|destroy/i.test(relevantStore.funcs.join(' '));
  
  const missing = [];
  if (!hasFetch) missing.push('Fetch');
  if (!hasInsert) missing.push('Add');
  if (!hasUpdate) missing.push('Update');
  if (!hasDelete) missing.push('Delete');
  
  if (missing.length === 0) {
    console.log(`✅ [${table.padEnd(21)}]: Ок (${relevantStore.name})`);
  } else {
    console.log(`⚠️ [${table.padEnd(21)}]: В ${relevantStore.name.padEnd(25)} не хватает -> ${missing.join(', ')}`);
    totalMissing += missing.length;
  }
});

console.log(`\nИтого проблемных мест в логике: ${totalMissing}`);
