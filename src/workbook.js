// ExcelJS expects unprefixed SpreadsheetML tags. Some valid XLSX exporters
// use namespace prefixes instead (for example x:workbook or x:worksheet).
// Normalize by namespace URI, never by replacing text or stripping all prefixes.
const spreadsheetNamespaces = new Set([
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  'http://purl.oclc.org/ooxml/spreadsheetml/main',
]);
const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
const documentRelationships = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'http://purl.oclc.org/ooxml/officeDocument/relationships',
]);

export function normalizeWorkbookXML(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('A estrutura XML da planilha está danificada.');
  }
  let changed = false;
  function copy(node) {
    if (node.nodeType !== 1) return node.cloneNode(true);
    const normalize = spreadsheetNamespaces.has(node.namespaceURI) || node.namespaceURI === packageRelationships;
    const name = normalize ? node.localName : node.nodeName;
    if (name !== node.nodeName) changed = true;
    const element = doc.createElementNS(node.namespaceURI, name);
    for (const attr of node.attributes) {
      // Leaving xmlns:x in place lets XMLSerializer choose x: again even for
      // nodes created without a prefix. It will emit canonical declarations.
      if (attr.namespaceURI === 'http://www.w3.org/2000/xmlns/' &&
          (spreadsheetNamespaces.has(attr.value) || attr.value === packageRelationships || documentRelationships.has(attr.value))) {
        continue;
      }
      const attrName = documentRelationships.has(attr.namespaceURI) ? `r:${attr.localName}` : attr.name;
      if (attrName !== attr.name) changed = true;
      element.setAttributeNS(attr.namespaceURI, attrName, attr.value);
    }
    for (const child of node.childNodes) element.appendChild(copy(child));
    return element;
  }
  const root = copy(doc.documentElement);
  return changed ? new XMLSerializer().serializeToString(root) : xml;
}

export async function loadWorkbook(buffer) {
  const { default: ExcelJS } = await import('exceljs');
  const read = async data => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data);
    if (!wb.worksheets.length) throw new Error('Nenhuma aba de dados encontrada.');
    return wb;
  };
  try {
    return await read(buffer);
  } catch (originalError) {
    try {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      if (!zip.file('xl/workbook.xml')) throw new Error('Arquivo sem estrutura XLSX.');
      let changed = false;
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !/^xl\/.*\.(xml|rels)$/.test(entry.name)) continue;
        const xml = await entry.async('string');
        const normalized = normalizeWorkbookXML(xml);
        if (xml !== normalized) { zip.file(entry.name, normalized); changed = true; }
      }
      if (!changed) throw originalError;
      return await read(await zip.generateAsync({ type: 'arraybuffer' }));
    } catch (cause) {
      throw new Error('Não foi possível ler a estrutura deste XLSX. Abra o arquivo no Excel ou LibreOffice e salve uma nova cópia como “Pasta de trabalho do Excel (.xlsx)”. Se o problema persistir, envie a planilha para verificarmos o formato.', { cause });
    }
  }
}
