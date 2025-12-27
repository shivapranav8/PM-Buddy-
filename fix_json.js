const fs = require('fs');

// Read the file
const content = fs.readFileSync('Open AI Logic.json', 'utf8');

// Find and remove duplicate content between lines 37-46
const lines = content.split('\n');

// Find the problematic section and fix it
let fixed = content;

// Remove the duplicate "content" line at line 38 and lines 44-46
fixed = fixed.replace(/            }\n                "content":.*?\n        },\n        "HARD": {/s, '            },\n            "HARD": {');
fixed = fixed.replace(/            }\n                "title":.*?\n        "content":.*?\n    }\n},/s, '            }\n        },');

// Write back
fs.writeFileSync('Open AI Logic.json.fixed', fixed, 'utf8');
console.log('Fixed file written to Open AI Logic.json.fixed');
