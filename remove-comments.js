const fs = require('fs');
const path = require('path');

const dirs = ['src/pages', 'src/components', 'src/store', 'src/types', 'supabase/functions'];

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  content = content.replace(/\/\/.*$/gm, (match) => {
    if (match.startsWith('//') && !match.includes('{/*') && !match.includes('*/}')) {
      return '';
    }
    return match;
  });
  
  content = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    if (match.includes('{/*') || match.includes('*/}')) {
      return match;
    }
    return '';
  });
  
  content = content.replace(/^\s*$/gm, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Processed: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (stat.isFile()) {
      processFile(fullPath);
    }
  }
}

for (const dir of dirs) {
  walkDir(dir);
}

console.log('Done!');
