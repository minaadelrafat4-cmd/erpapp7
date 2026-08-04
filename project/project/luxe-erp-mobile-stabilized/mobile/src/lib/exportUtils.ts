/**
 * Reusable export utilities for generating CSV, Excel-compatible, and PDF files
 * from ERP data. Uses expo-file-system to write files and expo-sharing to share them.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatDateTime } from '@lib/format';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

interface ExportParams<T> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  format: ExportFormat;
}

function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV<T>(columns: ExportColumn<T>[], data: T[]): string {
  const headerRow = columns.map((c) => escapeCSVValue(c.header)).join(',');
  const dataRows = data.map((row) =>
    columns.map((c) => escapeCSVValue(c.accessor(row))).join(','),
  );
  return [headerRow, ...dataRows].join('\n');
}

function generateXLSX<T>(columns: ExportColumn<T>[], data: T[]): string {
  // Excel-compatible XML (SpreadsheetML 2003) — opens in Excel without third-party libraries
  const headerCells = columns
    .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`)
    .join('');
  const dataRows = data
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = c.accessor(row);
          if (val === null || val === undefined) {
            return '<Cell><Data ss:Type="String"></Data></Cell>';
          }
          if (typeof val === 'number') {
            return `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Export">
<Table>
<Row>${headerCells}</Row>
${dataRows}
</Table>
</Worksheet>
</Workbook>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generatePDF<T>(columns: ExportColumn<T>[], data: T[], filename: string): string {
  // Simple HTML-based PDF — uses basic HTML structure that can be opened as a PDF alternative
  // On mobile, we generate a styled HTML document that the share sheet can handle
  const title = filename.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const headerCells = columns.map((c) => `<th>${escapeXml(c.header)}</th>`).join('');
  const dataRows = data
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = c.accessor(row);
          return `<td>${val === null || val === undefined ? '' : escapeXml(String(val))}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeXml(title)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; margin: 24px; }
  h1 { font-size: 20px; color: #333; }
  .meta { font-size: 12px; color: #999; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
</style>
</head>
<body>
<h1>${escapeXml(title)}</h1>
<div class="meta">Generated: ${escapeXml(formatDateTime(new Date().toISOString()))} | Records: ${data.length}</div>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${dataRows}</tbody>
</table>
</body>
</html>`;
}

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'xlsx': return 'application/vnd.ms-excel';
    case 'pdf': return 'text/html';
  }
}

function getExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv': return 'csv';
    case 'xlsx': return 'xls';
    case 'pdf': return 'html';
  }
}

export async function exportData<T>(params: ExportParams<T>): Promise<void> {
  const { filename, columns, data, format } = params;
  if (data.length === 0) {
    throw new Error('No data to export.');
  }

  let content: string;
  switch (format) {
    case 'csv': content = generateCSV(columns, data); break;
    case 'xlsx': content = generateXLSX(columns, data); break;
    case 'pdf': content = generatePDF(columns, data, filename); break;
  }

  const ext = getExtension(format);
  const fileUri = `${FileSystem.cacheDirectory}${filename}.${ext}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!await Sharing.isAvailableAsync()) {
    throw new Error('Sharing is not available on this device.');
  }

  const mimeType = getMimeType(format);
  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: `Export ${filename}`,
    UTI: format === 'csv' ? 'public.comma-separated-values-text' : format === 'xlsx' ? 'com.microsoft.excel.xls' : 'public.html',
  });
}

export interface ExportMenuConfig<T> {
  title: string;
  columns: ExportColumn<T>[];
  data: T[];
}
