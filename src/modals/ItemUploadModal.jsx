import React, { useState } from 'react';

export default function ItemUploadModal({ onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [mappedData, setMappedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = e => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || selectedFile.type !== 'text/csv') {
      alert('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = file => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      if (!lines.length) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines
        .slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          return row;
        });

      setCsvData(dataRows);
      mapCSVData(dataRows);
    };
    reader.readAsText(file);
  };

  const mapCSVData = rows => {
    const mapped = [];
    const errorList = [];

    rows.forEach((row, idx) => {
      const lineNumber = idx + 2; // +2 to account for header and 0-index
      const errs = [];

      if (!row.ItemCode?.trim()) errs.push('ItemCode is required');
      if (!row.ItemName?.trim()) errs.push('ItemName is required');

      if (errs.length) {
        errorList.push({ line: lineNumber, errors: errs });
      } else {
        mapped.push({
          ItemCode: row.ItemCode.trim(),
          ItemName: row.ItemName.trim(),
          Status: row.Status?.trim() || 'Active',
        });
      }
    });

    setMappedData(mapped);
    setErrors(errorList);
  };

  const handleUpload = async () => {
    if (!mappedData.length) {
      alert('No valid data to upload');
      return;
    }
    setIsProcessing(true);
    try {
      await onUpload(mappedData);
      alert(`Successfully uploaded ${mappedData.length} items`);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error uploading items');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Upload Items from CSV</h2>

        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">CSV Format Required:</h3>
          <code className="text-sm">ItemCode,ItemName,Status</code>
          <p className="text-sm text-gray-600 mt-2">
            • <strong>ItemCode</strong> and <strong>ItemName</strong> are required<br />
            • <strong>Status</strong> defaults to <em>Active</em> if omitted
          </p>
          <p className="text-sm text-gray-600 mt-2">Example: <code>BX85,Bauxite 85,Active</code></p>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Errors Found:</h3>
            {errors.map(({ line, errors: errs }, idx) => (
              <p key={idx} className="text-sm text-red-600">
                Line {line}: {errs.join(', ')}
              </p>
            ))}
          </div>
        )}

        {mappedData.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800 mb-2">
              Ready to Upload: {mappedData.length} valid record{mappedData.length > 1 ? 's' : ''}
            </h3>
            <div className="max-h-40 overflow-y-auto text-sm text-green-600">
              {mappedData.slice(0, 10).map((item, idx) => (
                <div key={idx}>
                  {item.ItemCode} – {item.ItemName} ({item.Status})
                </div>
              ))}
              {mappedData.length > 10 && (
                <div>…and {mappedData.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!mappedData.length || isProcessing}
            className="px-4 py-2 bg-green-800 text-white rounded disabled:opacity-50"
          >
            {isProcessing ? 'Uploading…' : `Upload ${mappedData.length} Item${mappedData.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}