const fs = require('fs');
const path = require('path');

function fixYamlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix YAML indentation for description blocks
    content = content.replace(
      /(description: >-\n)([ ]*)(.*?)(\n.*?(?=\n[a-zA-Z]|\n---|\n$))/gs,
      (match, prefix, spaces, desc, suffix) => {
        // Ensure proper indentation (4 spaces for root level, 8 for nested)
        const lines = desc.split('\n');
        const fixedLines = lines.map(line => {
          if (line.trim() === '') return line;
          // If this is in a nested block (meta/seo), use 8 spaces
          const baseIndent = filePath.includes('meta:') || filePath.includes('seo:') ? '        ' : '    ';
          return baseIndent + line.trim();
        });
        return prefix + fixedLines.join('\n') + suffix;
      }
    );
    
    // Specific fix for common pattern
    content = content.replace(/^( {2,6})([A-Za-z].*?)$/gm, (match, spaces, text) => {
      // Skip already properly indented content
      if (spaces.length === 4 || spaces.length === 8) return match;
      
      // Convert 2-space indents to 4-space
      if (spaces.length === 2) return '    ' + text;
      
      // Convert 6-space indents to 8-space  
      if (spaces.length === 6) return '        ' + text;
      
      return match;
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix all markdown files
function fixAllFiles() {
  const gamesDir = path.join(__dirname, 'src/content/games');
  
  function processDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDir(itemPath);
      } else if (item.endsWith('.md')) {
        fixYamlFile(itemPath);
      }
    }
  }
  
  processDir(gamesDir);
}

fixAllFiles();
console.log('YAML fixing complete!');