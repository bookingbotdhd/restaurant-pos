"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvError = void 0;
exports.parseCsv = parseCsv;
exports.csvCell = csvCell;
exports.toCsv = toCsv;
exports.looksLikeFormula = looksLikeFormula;
class CsvError extends Error {
}
exports.CsvError = CsvError;
function detectDelimiter(firstLine) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let quoted = false;
    for (const ch of firstLine) {
        if (ch === '"')
            quoted = !quoted;
        else if (!quoted && ch in counts)
            counts[ch]++;
    }
    if (counts[';'] > counts[','] && counts[';'] >= counts['\t'])
        return ';';
    if (counts['\t'] > counts[','] && counts['\t'] > counts[';'])
        return '\t';
    return ',';
}
function parseCsv(input) {
    const text = input.replace(/^\uFEFF/, '');
    if (text.includes('\u0000')) {
        throw new CsvError('This does not look like a text CSV file');
    }
    const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? '';
    const delimiter = detectDelimiter(firstLine);
    const records = [];
    let cells = [];
    let cell = '';
    let quoted = false;
    let line = 1;
    let recordLine = 1;
    let wasQuoted = false;
    const endCell = () => {
        cells.push(wasQuoted ? cell : cell.trim());
        cell = '';
        wasQuoted = false;
    };
    const endRecord = () => {
        endCell();
        if (!(cells.length === 1 && cells[0] === '')) {
            records.push({ line: recordLine, cells });
        }
        cells = [];
    };
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                }
                else {
                    quoted = false;
                }
            }
            else {
                if (ch === '\n')
                    line++;
                cell += ch;
            }
            continue;
        }
        if (ch === '"' && cell.trim() === '') {
            quoted = true;
            wasQuoted = true;
            cell = '';
        }
        else if (ch === delimiter) {
            endCell();
        }
        else if (ch === '\r' || ch === '\n') {
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            endRecord();
            line++;
            recordLine = line;
        }
        else {
            cell += ch;
        }
    }
    if (quoted) {
        throw new CsvError(`A quoted value that starts on line ${recordLine} is never closed`);
    }
    if (cell !== '' || cells.length > 0)
        endRecord();
    if (records.length === 0)
        throw new CsvError('The file is empty');
    const [head, ...body] = records;
    const headers = head.cells.map((h) => h.trim());
    if (headers.every((h) => h === '')) {
        throw new CsvError('The first line must be the column names');
    }
    return {
        delimiter,
        headers,
        rows: body.map((r) => ({
            line: r.line,
            cells: headers.map((_, i) => r.cells[i] ?? ''),
            overflow: r.cells.slice(headers.length).some((c) => c !== ''),
            longer: r.cells.length > headers.length,
        })),
    };
}
function csvCell(value) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\r\n;]/.test(s) || s !== s.trim()
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}
function toCsv(rows) {
    return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
function looksLikeFormula(value) {
    return /^[=+@\t\r]/.test(value) || /^-[^\d.\s]/.test(value);
}
//# sourceMappingURL=csv.js.map