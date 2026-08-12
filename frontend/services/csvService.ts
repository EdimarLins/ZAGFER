
export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export const downloadCSV = <T>(data: T[], columns: CsvColumn<T>[], filename: string) => {
  if (!data || data.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  // 1. Header Row
  const headers = columns.map(col => `"${col.header}"`).join(';');

  // 2. Data Rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = col.accessor(item);
      const stringValue = value === null || value === undefined ? '' : String(value);
      // Escape double quotes by replacing " with ""
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(';');
  });

  // 3. Combine with BOM for Excel UTF-8 support
  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');

  // 4. Create Blob and Download Link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
