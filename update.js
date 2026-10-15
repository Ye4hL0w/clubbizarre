const fs = require('fs');
const path = require('path');

const dir = '/Users/jmoncada/Documents/clubbizarre';
const pagesDir = path.join(dir, 'pages');

// 1. Create media.html
let indexContent = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

// Strip out everything between <main> and </main> except the media section for media.html
// But index.html doesn't use <main>, it uses <section> directly.
// Let's replace the whole body content for media.html, keeping just navbar, #media, and footer.
let mediaContent = indexContent.replace(/<section id="(hero|about|team|contact)".*?<\/section>/gs, '');
// Let's ensure navbar hrefs in media.html are correct.
// Since it's in pages/, paths like href="index.html" should be href="../index.html"
mediaContent = mediaContent.replace(/href="(index\.html[^"]*)"/g, 'href="../$1"');
mediaContent = mediaContent.replace(/href="pages\//g, 'href="');
mediaContent = mediaContent.replace(/src="media\//g, 'src="../media/');
mediaContent = mediaContent.replace(/src="script\.js"/g, 'src="../script.js"');
// Fix navbar link in mediaContent
mediaContent = mediaContent.replace(/href="\.\.\/index\.html#media"/g, 'href="media.html"');
// Title
mediaContent = mediaContent.replace(/<title>Club Bizarre<\/title>/, '<title>Club Bizarre - Media</title>');

fs.writeFileSync(path.join(pagesDir, 'media.html'), mediaContent);

// 2. Remove #media from index.html
let newIndexContent = indexContent.replace(/<section id="media"[\s\S]*?<\/section>/, '');
// Fix navbar in index.html
newIndexContent = newIndexContent.replace(/href="index\.html#media"/g, 'href="pages/media.html"');
fs.writeFileSync(path.join(dir, 'index.html'), newIndexContent);

// 3. Update all HTML files in pages/
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html') && f !== 'media.html');
for (const file of files) {
    let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    content = content.replace(/href="\.\.\/index\.html#"?\s*media"/g, 'href="media.html"');
    fs.writeFileSync(path.join(pagesDir, file), content);
}

// 4. Remove limit in script.js
let scriptContent = fs.readFileSync(path.join(dir, 'script.js'), 'utf8');
scriptContent = scriptContent.replace(/const POSTS_LIMIT = 9;/g, 'const POSTS_LIMIT = 100;');
fs.writeFileSync(path.join(dir, 'script.js'), scriptContent);

console.log("Done");
