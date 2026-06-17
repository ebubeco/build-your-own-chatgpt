var fs = require('fs');
var files = ['career.html','compatibility.html','commands.html','upgrade.html','compare.html','cost.html','use-cases.html','starter-pack.html'];
files.forEach(function(f){
  if (!fs.existsSync(f)) { console.log(f + ': MISSING'); return; }
  var c = fs.readFileSync(f, 'utf8');
  console.log(f + ': ' + c.length + ' bytes');
  console.log('  shared.js: ' + c.includes('shared.js'));
  console.log('  footer: ' + c.includes('class="footer"'));
  console.log('  theme-toggle: ' + c.includes('theme-toggle'));
  console.log('  analytics.js: ' + c.includes('analytics.js'));
  console.log('');
});
console.log('All tool pages checked');