// Export utilities for CSV and PDF generation
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { logger } from './logger';

/**
 * ExportUtils - Centralized export functionality for various data types
 */
class ExportUtils {
  
  /**
   * Export data to CSV format
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Filename for the download
   * @param {Array} headers - Optional custom headers
   */
  exportToCSV(data, filename, headers = null) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      // Generate headers from first object if not provided
      const csvHeaders = headers || Object.keys(data[0]);
      
      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...data.map(row => 
          csvHeaders.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma or quote
            const escapedValue = String(value).replace(/"/g, '""');
            return /[",\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
          }).join(',')
        )
      ].join('\n');

      this.downloadFile(csvContent, filename, 'text/csv');

      logger.info('CSV export completed', {
        filename,
        recordCount: data.length,
        headerCount: csvHeaders.length
      });

    } catch (error) {
      logger.error('CSV export failed', error, { filename });
      throw error;
    }
  }

  /**
   * Export releases to CSV with formatted data
   */
  exportReleasesToCSV(releases, filename = null) {
    const formattedData = releases.map(release => ({
      'Release Number': release.releaseNumber || release.ReleaseNumber,
      'Customer': release.customerName || release.CustomerName,
      'Supplier': release.supplierName || release.SupplierName,
      'Status': release.status,
      'Pickup Date': release.pickupDate ? 
        (release.pickupDate.toDate ? release.pickupDate.toDate() : new Date(release.pickupDate)).toLocaleDateString() : '',
      'Total Items': release.TotalItems || 0,
      'Total Weight': release.TotalWeight || 0,
      'Carrier': release.carrierName || release.CarrierName || '',
      'Driver': release.driverName || release.DriverName || '',
      'Truck Number': release.truckNumber || release.TruckNumber || '',
      'Created Date': release.createdAt ? 
        (release.createdAt.toDate ? release.createdAt.toDate() : new Date(release.createdAt)).toLocaleDateString() : ''
    }));

    const defaultFilename = `releases_export_${new Date().toISOString().split('T')[0]}.csv`;
    this.exportToCSV(formattedData, filename || defaultFilename);
  }

  /**
   * Export customers to CSV
   */
  exportCustomersToCSV(customers, filename = null) {
    const formattedData = customers.map(customer => ({
      'Customer Name': customer.CustomerName || '',
      'Contact Name': customer.ContactName || '',
      'Phone': customer.Phone || '',
      'Email': customer.Email || '',
      'Address': customer.Address || '',
      'City': customer.City || '',
      'State': customer.State || '',
      'ZIP': customer.ZIP || '',
      'Status': customer.Status || '',
      'Notes': customer.Notes || ''
    }));

    const defaultFilename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    this.exportToCSV(formattedData, filename || defaultFilename);
  }

  /**
   * Export barcodes to CSV
   */
  exportBarcodesToCSV(barcodes, filename = null) {
    const formattedData = barcodes.map(barcode => ({
      'Barcode': barcode.Barcode || '',
      'Item Name': barcode.ItemName || '',
      'Size': barcode.SizeName || '',
      'Supplier': barcode.SupplierName || '',
      'Customer': barcode.CustomerName || '',
      'Status': barcode.status || '',
      'Quantity': barcode.Quantity || 0,
      'Weight': barcode.Weight || 0,
      'Location': barcode.Location || '',
      'Created Date': barcode.CreatedAt ? 
        (barcode.CreatedAt.toDate ? barcode.CreatedAt.toDate() : new Date(barcode.CreatedAt)).toLocaleDateString() : ''
    }));

    const defaultFilename = `barcodes_export_${new Date().toISOString().split('T')[0]}.csv`;
    this.exportToCSV(formattedData, filename || defaultFilename);
  }

  /**
   * Export data to PDF format
   * @param {Array} data - Array of objects to export
   * @param {string} title - PDF title
   * @param {string} filename - Filename for the download
   * @param {Object} options - Additional PDF options
   */
  exportToPDF(data, title, filename, options = {}) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      const doc = new jsPDF(options.orientation || 'portrait');
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      
      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      // Prepare table data
      const headers = options.headers || Object.keys(data[0]);
      const tableData = data.map(row => 
        headers.map(header => String(row[header] || ''))
      );

      // Add table
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [34, 197, 94], // Green header
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Light gray alternating rows
        },
        ...options.tableOptions
      });

      // Save the PDF
      doc.save(filename);

      logger.info('PDF export completed', {
        filename,
        title,
        recordCount: data.length
      });

    } catch (error) {
      logger.error('PDF export failed', error, { filename, title });
      throw error;
    }
  }

  /**
   * Export releases to PDF
   */
  exportReleasesToPDF(releases, filename = null) {
    const formattedData = releases.map(release => ({
      'Release #': release.releaseNumber || release.ReleaseNumber,
      'Customer': release.customerName || release.CustomerName,
      'Supplier': release.supplierName || release.SupplierName,
      'Status': release.status,
      'Items': release.TotalItems || 0,
      'Weight': release.TotalWeight || 0,
      'Pickup Date': release.pickupDate ? 
        (release.pickupDate.toDate ? release.pickupDate.toDate() : new Date(release.pickupDate)).toLocaleDateString() : ''
    }));

    const defaultFilename = `releases_export_${new Date().toISOString().split('T')[0]}.pdf`;
    
    this.exportToPDF(
      formattedData,
      'CBRT Releases Report',
      filename || defaultFilename,
      {
        orientation: 'landscape',
        tableOptions: {
          columnStyles: {
            0: { cellWidth: 25 }, // Release #
            1: { cellWidth: 40 }, // Customer
            2: { cellWidth: 40 }, // Supplier
            3: { cellWidth: 25 }, // Status
            4: { cellWidth: 20 }, // Items
            5: { cellWidth: 25 }, // Weight
            6: { cellWidth: 30 }  // Pickup Date
          }
        }
      }
    );
  }

  /**
   * Export BOL (Bill of Lading) to PDF
   */
  exportBOLToPDF(release, barcodes = []) {
    try {
      const doc = new jsPDF('portrait');
      
      // Company header
      doc.setFontSize(20);
      doc.text('Cincinnati Barge & Rail Terminal', 105, 20, null, null, 'center');
      doc.setFontSize(16);
      doc.text('BILL OF LADING', 105, 30, null, null, 'center');
      
      // Release information
      const releaseNumber = release.releaseNumber || release.ReleaseNumber;
      const customerName = release.customerName || release.CustomerName;
      const supplierName = release.supplierName || release.SupplierName;
      const pickupDate = release.pickupDate ? 
        (release.pickupDate.toDate ? release.pickupDate.toDate() : new Date(release.pickupDate)) : new Date();

      doc.setFontSize(12);
      let yPos = 50;
      
      // Left column - Release details
      doc.text('Release Number:', 20, yPos);
      doc.text(releaseNumber, 70, yPos);
      yPos += 10;
      
      doc.text('Customer:', 20, yPos);
      doc.text(customerName, 70, yPos);
      yPos += 10;
      
      doc.text('Supplier:', 20, yPos);
      doc.text(supplierName, 70, yPos);
      yPos += 10;
      
      doc.text('Pickup Date:', 20, yPos);
      doc.text(pickupDate.toLocaleDateString(), 70, yPos);
      yPos += 10;

      // Right column - Carrier details
      yPos = 50;
      if (release.carrierName || release.CarrierName) {
        doc.text('Carrier:', 120, yPos);
        doc.text(release.carrierName || release.CarrierName, 160, yPos);
        yPos += 10;
      }
      
      if (release.driverName || release.DriverName) {
        doc.text('Driver:', 120, yPos);
        doc.text(release.driverName || release.DriverName, 160, yPos);
        yPos += 10;
      }
      
      if (release.truckNumber || release.TruckNumber) {
        doc.text('Truck #:', 120, yPos);
        doc.text(release.truckNumber || release.TruckNumber, 160, yPos);
        yPos += 10;
      }

      // Items table
      if (barcodes && barcodes.length > 0) {
        const tableData = barcodes.map(barcode => [
          barcode.Barcode || '',
          barcode.ItemName || '',
          barcode.SizeName || '',
          barcode.Quantity || 0,
          barcode.Weight || 0
        ]);

        doc.autoTable({
          head: [['Barcode', 'Item', 'Size', 'Quantity', 'Weight']],
          body: tableData,
          startY: yPos + 20,
          styles: {
            fontSize: 10,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [34, 197, 94],
            textColor: 255
          }
        });
      }

      // Totals
      const finalY = doc.lastAutoTable?.finalY || yPos + 40;
      doc.setFontSize(12);
      doc.text('Total Items:', 20, finalY + 20);
      doc.text(String(release.TotalItems || 0), 70, finalY + 20);
      doc.text('Total Weight:', 20, finalY + 30);
      doc.text(`${release.TotalWeight || 0} lbs`, 70, finalY + 30);

      // Signature lines
      doc.text('Driver Signature: ___________________________', 20, finalY + 60);
      doc.text('Date: _______________', 150, finalY + 60);

      const filename = `BOL_${releaseNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      logger.info('BOL PDF exported', {
        releaseNumber,
        filename,
        barcodeCount: barcodes.length
      });

    } catch (error) {
      logger.error('BOL PDF export failed', error);
      throw error;
    }
  }

  /**
   * Export compliance report to PDF
   */
  exportComplianceReportToPDF(reportData, filename = null) {
    try {
      const doc = new jsPDF('portrait');
      
      // Header
      doc.setFontSize(18);
      doc.text('CBRT Compliance Report', 105, 20, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, null, null, 'center');
      doc.text(`Period: ${reportData.summary.dateRange.startDate.toLocaleDateString()} - ${reportData.summary.dateRange.endDate.toLocaleDateString()}`, 105, 40, null, null, 'center');

      // Summary statistics
      let yPos = 60;
      doc.setFontSize(14);
      doc.text('Summary', 20, yPos);
      yPos += 15;

      doc.setFontSize(11);
      doc.text(`Total Events: ${reportData.summary.totalEvents}`, 20, yPos);
      yPos += 10;
      doc.text(`Security Events: ${reportData.summary.securityEvents}`, 20, yPos);
      yPos += 10;
      doc.text(`Critical Events: ${reportData.summary.criticalEvents}`, 20, yPos);
      yPos += 20;

      // User activity table
      if (reportData.summary.userActivity) {
        doc.setFontSize(14);
        doc.text('User Activity', 20, yPos);
        yPos += 10;

        const userTableData = Object.entries(reportData.summary.userActivity).map(([userId, stats]) => [
          stats.email,
          stats.role,
          stats.actions,
          stats.lastActivity ? stats.lastActivity.toLocaleDateString() : 'N/A'
        ]);

        doc.autoTable({
          head: [['User Email', 'Role', 'Actions', 'Last Activity']],
          body: userTableData,
          startY: yPos,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [34, 197, 94] }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      // Resource activity
      if (reportData.summary.resourceActivity) {
        doc.setFontSize(14);
        doc.text('Resource Activity', 20, yPos);
        yPos += 10;

        const resourceTableData = Object.entries(reportData.summary.resourceActivity).map(([resource, stats]) => [
          resource,
          stats.total,
          stats.creates,
          stats.updates,
          stats.deletes
        ]);

        doc.autoTable({
          head: [['Resource', 'Total', 'Creates', 'Updates', 'Deletes']],
          body: resourceTableData,
          startY: yPos,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [34, 197, 94] }
        });
      }

      const defaultFilename = `compliance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename || defaultFilename);

      logger.info('Compliance report PDF exported', {
        filename: filename || defaultFilename,
        totalEvents: reportData.summary.totalEvents
      });

    } catch (error) {
      logger.error('Compliance report PDF export failed', error);
      throw error;
    }
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(prefix, extension) {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}_${timestamp}.${extension}`;
  }
}

// Singleton instance
const exportUtils = new ExportUtils();

// Convenience exports
export const exportToCSV = (data, filename, headers) => 
  exportUtils.exportToCSV(data, filename, headers);

export const exportReleasesToCSV = (releases, filename) => 
  exportUtils.exportReleasesToCSV(releases, filename);

export const exportCustomersToCSV = (customers, filename) => 
  exportUtils.exportCustomersToCSV(customers, filename);

export const exportBarcodesToCSV = (barcodes, filename) => 
  exportUtils.exportBarcodesToCSV(barcodes, filename);

export const exportToPDF = (data, title, filename, options) => 
  exportUtils.exportToPDF(data, title, filename, options);

export const exportReleasesToPDF = (releases, filename) => 
  exportUtils.exportReleasesToPDF(releases, filename);

export const exportBOLToPDF = (release, barcodes) => 
  exportUtils.exportBOLToPDF(release, barcodes);

export const exportComplianceReportToPDF = (reportData, filename) => 
  exportUtils.exportComplianceReportToPDF(reportData, filename);

export default exportUtils;