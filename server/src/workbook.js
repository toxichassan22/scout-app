import fs from 'node:fs';
import zlib from 'node:zlib';

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function readAttribute(attributes, name) {
  const match = String(attributes).match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : '';
}

function readXmlText(value) {
  return [...String(value || '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
    .map(match => decodeXml(match[1]))
    .join('');
}

function readZipEntries(buffer) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('ملف Excel غير صالح: نهاية ZIP غير موجودة');

  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('ملف Excel غير صالح: سجل ZIP غير متوقع');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = zlib.inflateRawSync(compressed);
    else throw new Error(`نوع ضغط Excel غير مدعوم: ${method}`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readSharedStrings(entries) {
  const data = entries.get('xl/sharedStrings.xml');
  if (!data) return [];
  const xml = data.toString('utf8');
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match => readXmlText(match[1]));
}

function columnNumber(reference) {
  const letters = String(reference).match(/[A-Z]+/i)?.[0] || '';
  return [...letters.toUpperCase()].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

export function readWorkbookRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const entries = readZipEntries(fs.readFileSync(filePath));
  const sheetName = [...entries.keys()].find(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (!sheetName) throw new Error(`ملف Excel لا يحتوي على ورقة بيانات: ${filePath}`);
  const sharedStrings = readSharedStrings(entries);
  const xml = entries.get(sheetName).toString('utf8');
  const rows = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const values = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const content = cellMatch[2];
      const index = columnNumber(readAttribute(attributes, 'r')) - 1;
      if (index < 0) continue;
      const type = readAttribute(attributes, 't');
      let value = type === 'inlineStr' ? readXmlText(content) : (content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || '');
      value = decodeXml(value);
      if (type === 's' && value !== '') value = sharedStrings[Number(value)] || '';
      values[index] = value;
    }
    rows.push(values.map(value => value ?? ''));
  }

  return rows;
}

export function loadTwoTruthsQuestions(filePath) {
  const rows = readWorkbookRows(filePath);
  return rows.slice(1).filter(row => row[2] || row[3] || row[4]).map((row, index) => {
    const answer = String(row[5] || '').trim();
    const correctOption = { 'أ': 0, ا: 0, ب: 1, ج: 2 }[answer];
    if (correctOption === undefined) throw new Error(`إجابة حقيقتين وكذبة غير صالحة في الصف ${index + 2}`);
    const options = [row[2], row[3], row[4]].map((text, optionIndex) => ({ text: String(text || ''), isLie: optionIndex === correctOption }));
    return {
      id: `tt_q_${index + 1}`,
      category: String(row[1] || ''),
      text: 'أي عبارة هي الكذبة؟',
      options,
      correctOption,
      points: 1,
      sortOrder: index + 1,
    };
  });
}

export function loadArabCountries(filePath) {
  const rows = readWorkbookRows(filePath);
  return rows.slice(1).filter(row => row[1] && row[2]).map((row, index) => ({
    id: `geo-${index + 1}`,
    name: String(row[1]).trim(),
    capital: String(row[2]).trim(),
    governance: String(row[4] || '').trim(),
    currency: String(row[5] || '').trim(),
    division: '',
    flag: '',
    mapUrl: '',
    sortOrder: index + 1,
  }));
}
