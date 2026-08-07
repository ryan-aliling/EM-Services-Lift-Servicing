// Parses CSV text into a 2D array of string cells, handling quoted fields
// (including embedded commas, newlines, and escaped "" quotes) — the mirror
// image of exportToCSV's escaping, so a file this app exported round-trips.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\r') {
      // ignore; the \n (or end of string) that follows ends the row
    } else if (char === '\n') {
      endRow();
    } else {
      field += char;
    }
  }

  // Last row has no trailing newline — flush it unless the file ended cleanly.
  if (field !== '' || row.length > 0) endRow();

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

// Maps recognised header labels (case/spacing-insensitive) to Lift model fields.
// Accepts both the plain field name and the human-readable label used by
// exportToCSV/the import template, so a file exported from this app re-imports cleanly.
const HEADER_ALIASES = {
  liftcode: 'liftCode',
  'lift code': 'liftCode',
  block: 'block',
  unit: 'unit',
  type: 'type',
  capacity: 'capacity',
  'capacity (kg)': 'capacity',
  status: 'status',
  manufacturer: 'manufacturer',
  installdate: 'installDate',
  'install date': 'installDate',
  lastserviced: 'lastServiced',
  'last serviced': 'lastServiced',
};

// Converts parsed CSV rows (first row = header) into lift payload objects
// ready to POST. Unrecognised columns are ignored; blank cells are omitted
// so they don't overwrite model defaults (e.g. status defaulting to 'Active').
export function rowsToLiftPayloads(rows) {
  if (rows.length < 2) return [];

  const fieldKeys = rows[0].map((header) => HEADER_ALIASES[header.trim().toLowerCase()] || null);

  return rows.slice(1).map((cells) =>
    fieldKeys.reduce((payload, key, idx) => {
      if (!key) return payload;
      const raw = (cells[idx] ?? '').trim();
      if (raw === '') return payload;
      payload[key] = key === 'capacity' ? Number(raw) : raw;
      return payload;
    }, {})
  );
}
