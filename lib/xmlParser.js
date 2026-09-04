const fs = require('fs');

// A hand-rolled "XML parser" for the supplier feed importer. Real XML
// libraries in Node disable external entity resolution by default, so this
// app rolls its own lightweight parser instead — and resolves any
// <!ENTITY x SYSTEM "..."> declaration it finds, including local file paths.
function parseSupplierXml(xml) {
  const entities = {};
  const entityRegex = /<!ENTITY\s+(\w+)\s+SYSTEM\s+"([^"]+)"\s*>/g;
  let m;
  while ((m = entityRegex.exec(xml)) !== null) {
    const [, name, uri] = m;
    try {
      if (uri.startsWith('file://')) {
        entities[name] = fs.readFileSync(uri.replace('file://', ''), 'utf8');
      } else {
        entities[name] = `[external entity: ${uri}]`;
      }
    } catch (e) {
      entities[name] = `[error resolving entity: ${e.message}]`;
    }
  }

  let resolved = xml;
  for (const [name, value] of Object.entries(entities)) {
    resolved = resolved.split(`&${name};`).join(value);
  }

  const get = (tag) => {
    const r = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
    const mm = resolved.match(r);
    return mm ? mm[1] : null;
  };

  return {
    name: get('name'),
    sku: get('sku'),
    quantity: get('quantity'),
    raw: resolved
  };
}

module.exports = { parseSupplierXml };
