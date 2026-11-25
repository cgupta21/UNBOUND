const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
let page = read('page.html');
for (const [token, file] of Object.entries({ STYLES: 'style.css', WORLD: 'world.js', RENDER: 'render.js', APP: 'app.js' })) {
  page = page.replace('/*' + token + '*/', () => read(file));
}
for (const file of ['UNBOUND.html','Palm County.html']) fs.writeFileSync(path.join(root,file),page);
