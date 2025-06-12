// Add these functions at the top of the file, after the imports:

const generateExampleData = () => [
  {
    name: 'ישראל ישראלי',
    phone: '0501234567',
    email: 'israel@example.com'
  },
  {
    name: 'שרה כהן',
    phone: '0502345678',
    email: 'sarah@example.com'
  }
];

const downloadExampleExcel = () => {
  const data = generateExampleData();
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ['name', 'phone', 'email'],
    skipHeader: true
  });
  
  // Add Hebrew headers
  XLSX.utils.sheet_add_aoa(ws, [['שם', 'טלפון', 'אימייל']], { origin: 'A1' });
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, 'customers_example.xlsx');
};

const downloadExampleCsv = () => {
  const data = generateExampleData();
  const csv = Papa.unparse({
    fields: ['שם', 'טלפון', 'אימייל'],
    data: data.map(row => [row.name, row.phone, row.email])
  });
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'customers_example.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Then find the example files section and update it to:

{/* Example Files */}
<div className="space-y-4">
  <h3 className="font-medium">קבצים לדוגמה:</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
      <FileSpreadsheet className="h-8 w-8 text-green-600" />
      <div>
        <p className="font-medium">תבנית Excel</p>
        <button 
          onClick={downloadExampleExcel}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          הורד דוגמה
        </button>
      </div>
    </div>
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
      <FileCsv className="h-8 w-8 text-blue-600" />
      <div>
        <p className="font-medium">תבנית CSV</p>
        <button 
          onClick={downloadExampleCsv}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          הורד דוגמה
        </button>
      </div>
    </div>
  </div>
</div>