'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIntakeForm, useIntakeCsv } from '@/lib/queries/intake';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  parseCsvToRows,
  parseXlsxToRows,
  applyCustomMapping,
  autoDetectMapping,
  CRM_FIELDS,
  type CanonicalLead,
  type ColumnMapping,
  type CrmFieldValue,
  INTAKE_ACCEPT_MIME,
} from '@/lib/intake-utils';
import { TemperatureSelect } from '@/components/ui/TemperatureSelect';
import { LEAD_SOURCES, PLATFORMS, type Temperature } from '@/types';

const TEMPERATURES: Temperature[] = ['cold', 'warm', 'hot'];
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function IntakePage() {
  const router = useRouter();
  const intakeForm = useIntakeForm();
  const intakeCsv = useIntakeCsv();

  const [tab, setTab] = useState<'form' | 'csv'>('form');

  // Single form state
  const [singleForm, setSingleForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    domain: '',
    industry: '',
    location: '',
    leadSource: '',
    platform: '',
    temperature: '' as Temperature | '',
    profileLink: '',
  });
  const [singleErrors, setSingleErrors] = useState<Record<string, string>>({});

  // CSV batch defaults
  const [batchSource, setBatchSource] = useState('');
  const [batchPlatform, setBatchPlatform] = useState('');
  const [batchTemperature, setBatchTemperature] = useState<Temperature | ''>('');

  // CSV / file state
  const [csvError, setCsvError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Column mapping step
  type CsvStep = 'upload' | 'mapping' | 'done';
  const [csvStep, setCsvStep] = useState<CsvStep>('upload');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  function setSingle(key: keyof typeof singleForm, value: string) {
    setSingleForm((f) => ({ ...f, [key]: value }));
    setSingleErrors((e) => ({ ...e, [key]: '' }));
  }

  /** Convert single form to snake_case for API. */
  function singleFormToPayload(): Record<string, string> {
    const m: Record<string, string> = {};
    if (singleForm.name.trim()) m.name = singleForm.name.trim();
    if (singleForm.email.trim()) m.email = singleForm.email.trim();
    if (singleForm.phone.trim()) m.phone = singleForm.phone.trim();
    if (singleForm.companyName.trim()) m.company_name = singleForm.companyName.trim();
    if (singleForm.domain.trim()) m.domain = singleForm.domain.trim();
    if (singleForm.industry.trim()) m.industry = singleForm.industry.trim();
    if (singleForm.location.trim()) m.location = singleForm.location.trim();
    if (singleForm.leadSource.trim()) m.lead_source = singleForm.leadSource.trim();
    if (singleForm.platform.trim()) m.platform = singleForm.platform.trim();
    if (singleForm.temperature) m.temperature = singleForm.temperature;
    if (singleForm.profileLink.trim()) m.profile_link = singleForm.profileLink.trim();
    return m;
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!singleForm.name.trim()) errs.name = 'Name is required';
    if (Object.keys(errs).length > 0) { setSingleErrors(errs); return; }

    try {
      await intakeForm.mutateAsync(singleFormToPayload());
      router.push('/leads');
    } catch {
      // toast handled in mutation
    }
  }

  async function handleMappingConfirm() {
    setCsvError('');
    if (parsedRows.length === 0) return;
    const leads = applyCustomMapping(parsedRows, columnMapping).map((lead) => ({
      ...lead,
      lead_source: lead.lead_source || batchSource || undefined,
      platform: lead.platform || batchPlatform || undefined,
      temperature: (lead.temperature || batchTemperature || undefined) as string | undefined,
    }));
    try {
      await intakeCsv.mutateAsync(leads as CanonicalLead[]);
      resetCsvState();
      router.push('/leads');
    } catch {
      // toast handled in mutation
    }
  }

  function resetCsvState() {
    setParsedRows([]);
    setParsedHeaders([]);
    setColumnMapping({});
    setFileName('');
    setCsvError('');
    setCsvStep('upload');
  }

  const processFile = useCallback((file: File) => {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        const { headers, rows } = parseCsvToRows(text);
        if (rows.length === 0) { setCsvError('No data rows found in CSV.'); return; }
        setParsedHeaders(headers);
        setParsedRows(rows);
        setColumnMapping(autoDetectMapping(headers));
        setFileName(file.name);
        setCsvError('');
        setCsvStep('mapping');
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const { headers, rows } = parseXlsxToRows(buffer);
        if (rows.length === 0) { setCsvError('No data rows found in file.'); return; }
        setParsedHeaders(headers);
        setParsedRows(rows);
        setColumnMapping(autoDetectMapping(headers));
        setFileName(file.name);
        setCsvError('');
        setCsvStep('mapping');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setCsvError('Please drop a .csv or .xlsx file.');
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400 mb-1';
  const selectCls = 'rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200 focus:border-brand-500 focus:outline-none';

  // Sample values for the mapping preview (first non-empty row)
  const sampleRow = parsedRows[0] ?? {};

  return (
    <div>
      <PageHeader
        title="Intake"
        subtitle="Add one lead or import multiple via CSV"
      />

      <div className="p-6 max-w-2xl">
        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-800">
          {(['form', 'csv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); resetCsvState(); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'form' ? 'Single Lead' : 'CSV Import'}
            </button>
          ))}
        </div>

        {/* ── Single Lead Form ────────────────────────────────── */}
        {tab === 'form' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={singleForm.name} onChange={(e) => setSingle('name', e.target.value)} placeholder="Jane Smith" className={inputCls} />
              {singleErrors.name && <p className="mt-1 text-xs text-red-400">{singleErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={singleForm.email} onChange={(e) => setSingle('email', e.target.value)} placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input value={singleForm.phone} onChange={(e) => setSingle('phone', e.target.value)} placeholder="+1 555 0100" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company</label>
                <input value={singleForm.companyName} onChange={(e) => setSingle('companyName', e.target.value)} placeholder="Acme Corp" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Domain</label>
                <input value={singleForm.domain} onChange={(e) => setSingle('domain', e.target.value)} placeholder="acme.com" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Industry</label>
                <input value={singleForm.industry} onChange={(e) => setSingle('industry', e.target.value)} placeholder="SaaS" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input value={singleForm.location} onChange={(e) => setSingle('location', e.target.value)} placeholder="London, UK" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Lead Source</label>
                <select value={singleForm.leadSource} onChange={(e) => setSingle('leadSource', e.target.value)} className={inputCls}>
                  <option value="">Select source…</option>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Platform</label>
                <select value={singleForm.platform} onChange={(e) => setSingle('platform', e.target.value)} className={inputCls}>
                  <option value="">Select platform…</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Temperature</label>
                <TemperatureSelect
                  value={singleForm.temperature as Temperature | ''}
                  onChange={(v) => setSingle('temperature', v)}
                  size="sm"
                  placeholder="Not set"
                  className="w-full [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:border-gray-700 [&_button]:bg-gray-800"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Profile Link</label>
              <input value={singleForm.profileLink} onChange={(e) => setSingle('profileLink', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputCls} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={intakeForm.isPending} className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
                {intakeForm.isPending ? 'Submitting…' : 'Submit Lead'}
              </button>
              <button type="button" onClick={() => router.push('/leads')} className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-800 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ── CSV Import ──────────────────────────────────────── */}
        {tab === 'csv' && (
          <div className="space-y-5">

            {/* Step 1 — Upload */}
            {csvStep === 'upload' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Default Source (for batch)</label>
                    <select value={batchSource} onChange={(e) => setBatchSource(e.target.value)} className={inputCls}>
                      <option value="">None (use CSV column)</option>
                      {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Default Platform (for batch)</label>
                    <select value={batchPlatform} onChange={(e) => setBatchPlatform(e.target.value)} className={inputCls}>
                      <option value="">None (use CSV column)</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Default Temperature (for batch)</label>
                    <TemperatureSelect
                      value={batchTemperature}
                      onChange={setBatchTemperature}
                      size="sm"
                      placeholder="None (use CSV column)"
                      className="w-full [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:border-gray-700 [&_button]:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Upload a file</label>
                  <p className="mb-2 text-xs text-gray-500">
                    CSV or Excel (.xlsx). You&apos;ll map columns to CRM fields in the next step.
                  </p>
                  <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`rounded-lg border-2 border-dashed px-4 py-10 text-center text-sm transition ${
                      isDragging
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      accept={INTAKE_ACCEPT_MIME}
                      onChange={onFileInputChange}
                      className="hidden"
                      id="intake-file"
                    />
                    <label htmlFor="intake-file" className="cursor-pointer">
                      Drag and drop a <span className="font-medium text-gray-300">.csv</span> or <span className="font-medium text-gray-300">.xlsx</span> here, or{' '}
                      <span className="text-brand-400 underline">browse</span>
                    </label>
                  </div>
                  {csvError && <p className="mt-2 text-xs text-red-400">{csvError}</p>}
                </div>
              </>
            )}

            {/* Step 2 — Column Mapping */}
            {csvStep === 'mapping' && (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetCsvState}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <span className="text-sm font-medium text-gray-300">{fileName}</span>
                  <span className="ml-auto text-xs text-gray-500">{parsedRows.length} rows detected</span>
                </div>

                <div className="rounded-xl border border-gray-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 border-b border-gray-800 bg-gray-900 px-4 py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">CSV Column</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Value</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Maps To</span>
                  </div>
                  <div className="divide-y divide-gray-800/60 max-h-96 overflow-y-auto">
                    {parsedHeaders.map((header) => {
                      const sample = String(sampleRow[header] ?? '').trim();
                      const current = columnMapping[header] ?? '__skip__';
                      return (
                        <div key={header} className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-2.5 items-center hover:bg-gray-800/30 transition">
                          <span className="text-xs font-mono text-gray-300 truncate pr-3">{header}</span>
                          <span className="text-xs text-gray-500 truncate pr-3" title={sample}>
                            {sample || <span className="italic text-gray-700">empty</span>}
                          </span>
                          <select
                            value={current}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({ ...prev, [header]: e.target.value as CrmFieldValue }))
                            }
                            className={`${selectCls} w-full ${current === '__skip__' ? 'text-gray-600' : 'text-gray-200'}`}
                          >
                            <option value="__skip__">— Skip —</option>
                            {CRM_FIELDS.map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mapping summary */}
                {(() => {
                  const mapped = Object.values(columnMapping).filter((v) => v !== '__skip__');
                  const hasName = mapped.includes('name');
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      {hasName ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Name column mapped
                        </span>
                      ) : (
                        <span className="text-amber-400">⚠ No column mapped to Name — leads will be imported as &quot;Unknown&quot;</span>
                      )}
                      <span className="text-gray-600 ml-auto">{mapped.length} of {parsedHeaders.length} columns mapped</span>
                    </div>
                  );
                })()}

                {csvError && <p className="text-xs text-red-400">{csvError}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    disabled={intakeCsv.isPending}
                    onClick={handleMappingConfirm}
                    className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition"
                  >
                    {intakeCsv.isPending ? `Importing ${parsedRows.length} leads…` : `Import ${parsedRows.length} leads`}
                  </button>
                  <button
                    type="button"
                    onClick={resetCsvState}
                    className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
