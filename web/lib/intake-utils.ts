import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/** Canonical lead fields (snake_case) sent to the API. Always has at least name. */
export type CanonicalLead = Record<string, string> & { name: string };

/** All CRM fields that a CSV column can be mapped to. */
export const CRM_FIELDS = [
  { value: 'name',         label: 'Name' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Phone' },
  { value: 'company_name', label: 'Company' },
  { value: 'domain',       label: 'Domain / Website' },
  { value: 'profile_link', label: 'Profile Link / URL' },
  { value: 'industry',     label: 'Industry / Niche' },
  { value: 'location',     label: 'Location' },
  { value: 'lead_source',  label: 'Lead Source' },
  { value: 'platform',     label: 'Platform' },
  { value: 'temperature',  label: 'Temperature' },
  { value: 'notes',        label: 'Notes / Snippet' },
] as const;

export type CrmFieldValue = (typeof CRM_FIELDS)[number]['value'] | '__skip__';

/** mapping: csvHeader → CrmFieldValue  (or __skip__ to ignore) */
export type ColumnMapping = Record<string, CrmFieldValue>;

/** Map header variants (lowercase, trimmed) to canonical snake_case field names. */
const HEADER_TO_CANONICAL: Record<string, keyof CanonicalLead> = {
  // name
  name: 'name',
  'full name': 'name',
  fullname: 'name',
  title: 'name',
  'instagram username': 'name',
  'profile handle': 'name',
  profile_handle: 'name',
  // email
  email: 'email',
  // phone
  phone: 'phone',
  telephone: 'phone',
  // company
  company_name: 'company_name',
  companyname: 'company_name',
  company: 'company_name',
  'company name': 'company_name',
  // profile link / URL
  profile_link: 'profile_link',
  profilelink: 'profile_link',
  url: 'profile_link',
  'profile url': 'profile_link',
  'instagram url': 'profile_link',
  'linkedin url': 'profile_link',
  link: 'profile_link',
  // domain
  domain: 'domain',
  website: 'domain',
  // industry
  industry: 'industry',
  niche: 'industry',
  'primary offer type': 'industry',
  // location
  location: 'location',
  'english-speaking market': 'location',
  // lead source
  lead_source: 'lead_source',
  leadsource: 'lead_source',
  source: 'lead_source',
  // platform (kept separate)
  platform: 'platform',
  channel: 'platform',
  // temperature
  temperature: 'temperature',
  temp: 'temperature',
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Map a raw row (arbitrary headers) to canonical snake_case lead.
 * Only includes keys we know; skips empty values.
 */
export function normalizeRow(row: Record<string, string>): CanonicalLead {
  const out: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    const canonical = HEADER_TO_CANONICAL[normalizeHeader(rawKey)];
    if (canonical) out[canonical] = String(value).trim();
  }
  // Ensure name exists for API: fallback to first non-empty value that looks like a name/handle
  if (!out.name) {
    const fallback =
      row['Instagram Username'] ?? row['profile_handle'] ?? row['title'] ?? row['query'];
    if (fallback && String(fallback).trim()) out.name = String(fallback).trim();
  }
  if (!out.name) out.name = 'Unknown';
  return out as CanonicalLead;
}

/**
 * Auto-detect a column mapping for a set of CSV headers using the known alias table.
 * Returns a ColumnMapping with best-guess CRM field or __skip__.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const canonical = HEADER_TO_CANONICAL[normalizeHeader(header)];
    mapping[header] = (canonical as CrmFieldValue) ?? '__skip__';
  }
  return mapping;
}

/**
 * Apply a user-confirmed column mapping to raw rows, returning canonical leads.
 * Rows with no usable name are assigned "Unknown".
 */
export function applyCustomMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): CanonicalLead[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [csvHeader, crmField] of Object.entries(mapping)) {
      if (crmField === '__skip__') continue;
      const value = row[csvHeader];
      if (value == null || String(value).trim() === '') continue;
      // For notes, append rather than overwrite so multiple columns can merge into one
      if (crmField === 'notes' && out.notes) {
        out.notes = `${out.notes} | ${String(value).trim()}`;
      } else if (!out[crmField]) {
        out[crmField] = String(value).trim();
      }
    }
    if (!out.name) out.name = 'Unknown';
    return out as CanonicalLead;
  });
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse CSV text (handles quoted fields and commas inside quotes).
 */
export function parseCsvToRows(text: string): ParsedSheet {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h?.trim() ?? '',
  });
  const rows = parsed.data?.filter((r) => Object.keys(r).length > 0 && Object.values(r).some((v) => v != null && String(v).trim() !== '')) ?? [];
  const headers = parsed.meta?.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
  return { headers, rows };
}

/**
 * Parse first sheet of an Excel file to rows (header row = first row).
 */
export function parseXlsxToRows(buffer: ArrayBuffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { headers: [], rows: [] };
  const sheet = wb.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = (data[0] as unknown[]).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = data.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    (row as unknown[]).forEach((cell, i) => {
      const key = headers[i] ?? `col_${i}`;
      obj[key] = cell != null ? String(cell).trim() : '';
    });
    return obj;
  });
  return { headers, rows: rows.filter((r) => Object.values(r).some((v) => v !== '')) };
}

/** Accepted file types for intake. */
export const INTAKE_ACCEPT = '.csv,.xlsx,.xls';
export const INTAKE_ACCEPT_MIME = 'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
