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
    } else if (file.endsWith('.routes.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src', 'modules'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace: error: { type: 'string' }
  // With: error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }
  
  // Handle the specific one in bookings that has code: { type: 'string' } next to it
  content = content.replace(/properties:\s*{\s*error:\s*{\s*type:\s*'string'\s*},\s*code:\s*{\s*type:\s*'string'\s*}\s*}/g, 
    "properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } }");
    
  // Handle all other standard ones
  content = content.replace(/error:\s*{\s*type:\s*'string'\s*}/g, 
    "error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }");
    
  fs.writeFileSync(file, content, 'utf-8');
}
