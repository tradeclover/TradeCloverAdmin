const fs = require('fs');
const path = require('path');

// Function to recursively find all page.tsx files
function findPageFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findPageFiles(fullPath, files);
    } else if (item === 'page.tsx') {
      files.push(fullPath);
    }
  }
  return files;
}

// Function to determine layout
function getLayout(filePath) {
  if (filePath.includes('(admin)')) {
    return 'AdminLayout';
  } else if (filePath.includes('(auth)')) {
    return 'AuthLayout';
  } else {
    return null; // no layout
  }
}

// Function to convert path
function convertPath(filePath) {
  let newPath = filePath.replace('src/app/', 'src/pages/').replace('/page.tsx', '.tsx');
  // Remove route groups (parentheses)
  newPath = newPath.replace(/\([^)]+\)\//g, '');
  return newPath;
}

// Function to convert content
function convertContent(content, layout, title, description) {
  // Remove export const metadata
  content = content.replace(/export const metadata: Metadata = \{[^}]*\};\n\n?/g, '');
  // Add Head
  const head = `<Head>
        <title>${title}</title>
        <meta name="description" content="${description}" />
      </Head>`;
  // Wrap with layout if needed
  if (layout) {
    content = content.replace(
      /(import.*from.*;\n)+export default function (\w+)\(\) \{/,
      `$&import Head from 'next/head';\nimport ${layout} from '@/layout/${layout}';\n\n`
    );
    content = content.replace(
      /export default function (\w+)\(\) \{([\s\S]*)\}/,
      `export default function $1() {\n  return (\n    <${layout}>\n      ${head}\n      $2\n    </${layout}>\n  );\n}`
    );
  } else {
    content = content.replace(
      /(import.*from.*;\n)+export default function (\w+)\(\) \{/,
      `$&import Head from 'next/head';\n\n`
    );
    content = content.replace(
      /export default function (\w+)\(\) \{([\s\S]*)\}/,
      `export default function $1() {\n  return (\n    <>\n      ${head}\n      $2\n    </>\n  );\n}`
    );
  }
  // Add React import if not present
  if (!content.includes('import React')) {
    content = content.replace(/import.*from.*;\n/, '$&import React from "react";\n');
  }
  return content;
}

// Main conversion
const appDir = 'src/app';
const pageFiles = findPageFiles(appDir);

pageFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const layout = getLayout(file);
  const newPath = convertPath(file);
  // Extract title and description from metadata if present
  const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
  const descMatch = content.match(/description:\s*["']([^"']+)["']/);
  const title = titleMatch ? titleMatch[1] : 'Page';
  const description = descMatch ? descMatch[1] : '';

  const newContent = convertContent(content, layout, title, description);

  // Ensure directory exists
  const dir = path.dirname(newPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(newPath, newContent);
  console.log(`Converted ${file} to ${newPath}`);
});
