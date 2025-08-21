// Bill of Lading (BOL) generation service for CBRT UI
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

/**
 * BOLService - Automated Bill of Lading generation and management
 */
class BOLService {
  constructor() {
    this.defaultOptions = {
      format: 'letter',
      orientation: 'portrait',
      unit: 'pt',
      compress: true
    };
  }

  /**
   * Generate single BOL PDF for a release
   * @param {string} releaseId - Release document ID
   * @param {Object} user - Current user context
   * @returns {Promise<Blob>} PDF blob
   */
  async generateBOL(releaseId, user) {
    try {
      logger.info('Generating BOL', { releaseId, userId: user.id });

      // Fetch release data
      const release = await this.fetchReleaseData(releaseId);
      if (!release) {
        throw new Error(`Release not found: ${releaseId}`);
      }

      // Fetch associated barcodes
      const barcodes = await this.fetchReleaseBarcodes(releaseId);

      // Generate PDF
      const pdf = await this.createBOLPDF(release, barcodes);
      const pdfBlob = pdf.output('blob');

      // Log BOL generation for audit
      await this.logBOLGeneration(releaseId, user, 'single', {
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        barcodeCount: barcodes.length,
        fileSize: pdfBlob.size
      });

      logger.info('BOL generated successfully', {
        releaseId,
        barcodeCount: barcodes.length,
        fileSize: pdfBlob.size
      });

      return pdfBlob;
    } catch (error) {
      logger.error('BOL generation failed', error, { releaseId });
      throw error;
    }
  }

  /**
   * Generate bulk BOL PDFs for multiple releases
   * @param {string[]} releaseIds - Array of release document IDs
   * @param {Object} user - Current user context
   * @returns {Promise<Blob>} ZIP blob containing all BOL PDFs
   */
  async generateBulkBOL(releaseIds, user) {
    try {
      logger.info('Generating bulk BOLs', { releaseIds, count: releaseIds.length, userId: user.id });

      // Import JSZip dynamically to keep bundle size manageable
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Generate PDFs for each release
      for (const releaseId of releaseIds) {
        try {
          const release = await this.fetchReleaseData(releaseId);
          if (!release) {
            throw new Error(`Release not found: ${releaseId}`);
          }

          const barcodes = await this.fetchReleaseBarcodes(releaseId);
          const pdf = await this.createBOLPDF(release, barcodes);
          
          const releaseNumber = release.releaseNumber || release.ReleaseNumber;
          const filename = `BOL_${releaseNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
          
          zip.file(filename, pdf.output('blob'));
          successCount++;

        } catch (error) {
          failureCount++;
          errors.push({ releaseId, error: error.message });
          logger.error('Single BOL generation failed in bulk', error, { releaseId });
        }
      }

      // Create summary file
      const summary = {
        generatedAt: new Date().toISOString(),
        totalRequested: releaseIds.length,
        successful: successCount,
        failed: failureCount,
        errors: errors
      };

      zip.file('BOL_Generation_Summary.json', JSON.stringify(summary, null, 2));

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      // Log bulk BOL generation
      await this.logBOLGeneration('bulk', user, 'bulk', {
        totalRequested: releaseIds.length,
        successful: successCount,
        failed: failureCount,
        zipSize: zipBlob.size
      });

      logger.info('Bulk BOL generation completed', {
        totalRequested: releaseIds.length,
        successful: successCount,
        failed: failureCount,
        zipSize: zipBlob.size
      });

      return zipBlob;
    } catch (error) {
      logger.error('Bulk BOL generation failed', error, { releaseIds });
      throw error;
    }
  }

  /**
   * Create BOL PDF document
   * @param {Object} release - Release data
   * @param {Array} barcodes - Associated barcodes
   * @returns {jsPDF} PDF document
   */
  async createBOLPDF(release, barcodes = []) {
    const pdf = new jsPDF(this.defaultOptions);
    
    // Company header
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text('Cincinnati Barge & Rail Terminal', 306, 60, null, null, 'center');
    
    pdf.setFontSize(18);
    pdf.text('BILL OF LADING', 306, 85, null, null, 'center');
    
    // Document number and date
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const docNumber = `BOL-${release.releaseNumber || release.ReleaseNumber}-${Date.now()}`;
    pdf.text(`Document #: ${docNumber}`, 50, 110);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 450, 110);

    // Release information section
    let yPos = 140;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('RELEASE INFORMATION', 50, yPos);
    
    yPos += 20;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    // Left column
    const leftCol = 50;
    const rightCol = 320;
    
    pdf.text('Release Number:', leftCol, yPos);
    pdf.text(release.releaseNumber || release.ReleaseNumber, leftCol + 100, yPos);
    
    pdf.text('Status:', rightCol, yPos);
    pdf.text(release.status || 'Unknown', rightCol + 100, yPos);
    yPos += 15;
    
    pdf.text('Customer:', leftCol, yPos);
    pdf.text(release.customerName || release.CustomerName || 'N/A', leftCol + 100, yPos);
    
    pdf.text('Pickup Date:', rightCol, yPos);
    const pickupDate = release.pickupDate ? 
      (release.pickupDate.toDate ? release.pickupDate.toDate() : new Date(release.pickupDate)).toLocaleDateString() : 
      'N/A';
    pdf.text(pickupDate, rightCol + 100, yPos);
    yPos += 15;
    
    pdf.text('Supplier:', leftCol, yPos);
    pdf.text(release.supplierName || release.SupplierName || 'N/A', leftCol + 100, yPos);
    
    pdf.text('Created Date:', rightCol, yPos);
    const createdDate = release.createdAt ? 
      (release.createdAt.toDate ? release.createdAt.toDate() : new Date(release.createdAt)).toLocaleDateString() : 
      'N/A';
    pdf.text(createdDate, rightCol + 100, yPos);
    yPos += 30;

    // Carrier information (if available)
    if (release.carrierName || release.CarrierName || release.driverName || release.DriverName) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('CARRIER INFORMATION', 50, yPos);
      yPos += 20;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      if (release.carrierName || release.CarrierName) {
        pdf.text('Carrier:', leftCol, yPos);
        pdf.text(release.carrierName || release.CarrierName, leftCol + 100, yPos);
        yPos += 15;
      }
      
      if (release.driverName || release.DriverName) {
        pdf.text('Driver:', leftCol, yPos);
        pdf.text(release.driverName || release.DriverName, leftCol + 100, yPos);
        yPos += 15;
      }
      
      if (release.truckNumber || release.TruckNumber) {
        pdf.text('Truck Number:', leftCol, yPos);
        pdf.text(release.truckNumber || release.TruckNumber, leftCol + 100, yPos);
        yPos += 15;
      }
      
      yPos += 15;
    }

    // Items table
    if (barcodes && barcodes.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('ITEMS', 50, yPos);
      yPos += 15;

      const tableData = barcodes.map(barcode => [
        barcode.Barcode || '',
        barcode.ItemName || '',
        barcode.SizeName || '',
        (barcode.Quantity || 0).toString(),
        (barcode.Weight || 0).toString()
      ]);

      pdf.autoTable({
        head: [['Barcode', 'Item', 'Size', 'Quantity', 'Weight (lbs)']],
        body: tableData,
        startY: yPos,
        styles: {
          fontSize: 9,
          cellPadding: 4
        },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { cellWidth: 80 },  // Barcode
          1: { cellWidth: 120 }, // Item
          2: { cellWidth: 80 },  // Size
          3: { cellWidth: 60 },  // Quantity
          4: { cellWidth: 80 }   // Weight
        }
      });

      yPos = pdf.lastAutoTable.finalY + 20;
    }

    // Summary totals
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('SUMMARY', 50, yPos);
    yPos += 20;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    pdf.text('Total Items:', leftCol, yPos);
    pdf.text((release.TotalItems || barcodes.length || 0).toString(), leftCol + 100, yPos);
    yPos += 15;
    
    pdf.text('Total Weight:', leftCol, yPos);
    pdf.text(`${release.TotalWeight || 0} lbs`, leftCol + 100, yPos);
    yPos += 40;

    // Signature section
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('SIGNATURES', 50, yPos);
    yPos += 30;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    // Signature lines
    pdf.line(50, yPos, 250, yPos);
    pdf.text('Driver Signature', 50, yPos + 15);
    pdf.text('Date: _______________', 180, yPos + 15);
    
    pdf.line(350, yPos, 550, yPos);
    pdf.text('Warehouse Representative', 350, yPos + 15);
    pdf.text('Date: _______________', 480, yPos + 15);

    // Footer
    const footerY = pdf.internal.pageSize.height - 50;
    pdf.setFontSize(8);
    pdf.text('This document was generated electronically by CBRT Warehouse Management System', 306, footerY, null, null, 'center');
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 306, footerY + 12, null, null, 'center');

    return pdf;
  }

  // Legacy methods for backward compatibility
  async generateBOLNumber(supplierPrefix) {
    try {
      const bolsQuery = query(
        collection(db, "bols"),
        where("BOLPrefix", "==", supplierPrefix),
        orderBy("BOLNumber", "desc"),
        limit(1)
      );
      
      const snapshot = await getDocs(bolsQuery);
      let nextNumber = 1;
      
      if (!snapshot.empty) {
        const lastBOL = snapshot.docs[0].data();
        const lastNumber = parseInt(lastBOL.BOLNumber.replace(supplierPrefix, ""));
        nextNumber = lastNumber + 1;
      }
      
      return supplierPrefix + nextNumber.toString().padStart(5, "0");
    } catch (error) {
      console.error("Error generating BOL number:", error);
      throw error;
    }
  }

  async createBOL(bolData) {
    try {
      const docRef = await addDoc(collection(db, "bols"), {
        ...bolData,
        Status: "Generated",
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating BOL:", error);
      throw error;
    }
  }

  async updateBOL(bolId, updates) {
    try {
      await updateDoc(doc(db, "bols", bolId), {
        ...updates,
        UpdatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating BOL:", error);
      throw error;
    }
  }

  async voidBOL(bolId) {
    try {
      await updateDoc(doc(db, "bols", bolId), {
        Status: "Voided",
        VoidedAt: new Date(),
        UpdatedAt: new Date()
      });
    } catch (error) {
      console.error("Error voiding BOL:", error);
      throw error;
    }
  }

  /**
   * Fetch release data from Firestore
   */
  async fetchReleaseData(releaseId) {
    try {
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        return null;
      }
      return { id: releaseDoc.id, ...releaseDoc.data() };
    } catch (error) {
      logger.error('Failed to fetch release data', error, { releaseId });
      throw error;
    }
  }

  /**
   * Fetch barcodes associated with a release
   */
  async fetchReleaseBarcodes(releaseId) {
    try {
      // Query barcodes by release reference
      const barcodesQuery = query(
        collection(db, 'barcodes'),
        where('releaseId', '==', releaseId)
      );
      
      const barcodesSnapshot = await getDocs(barcodesQuery);
      return barcodesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.warn('Failed to fetch release barcodes', error, { releaseId });
      // Return empty array if barcodes can't be fetched
      return [];
    }
  }

  /**
   * Log BOL generation for audit trail
   */
  async logBOLGeneration(releaseId, user, type, metadata = {}) {
    try {
      // Import audit service dynamically to avoid circular dependencies
      const { auditService } = await import('./auditService.js');
      
      await auditService.logEvent({
        action: type === 'bulk' ? 'bulk_bol_generated' : 'bol_generated',
        resource: type === 'bulk' ? 'bulk_releases' : 'release',
        resourceId: releaseId,
        changes: {},
        metadata: {
          ...metadata,
          generationType: type,
          timestamp: new Date().toISOString()
        },
        user
      });
    } catch (error) {
      // Don't fail BOL generation if audit logging fails
      logger.error('Failed to log BOL generation', error, { releaseId, type });
    }
  }

  /**
   * Download BOL as PDF file
   */
  downloadBOL(pdfBlob, filename) {
    const url = window.URL.createObjectURL(pdfBlob);
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
   * Generate filename for BOL
   */
  generateBOLFilename(release, type = 'single') {
    const releaseNumber = release.releaseNumber || release.ReleaseNumber;
    const date = new Date().toISOString().split('T')[0];
    
    if (type === 'bulk') {
      return `BOL_Bulk_${date}.zip`;
    }
    
    return `BOL_${releaseNumber}_${date}.pdf`;
  }
}

// Singleton instance
const bolService = new BOLService();

// Convenience functions
export const generateSingleBOL = async (releaseId, user) => {
  const pdfBlob = await bolService.generateBOL(releaseId, user);
  const release = await bolService.fetchReleaseData(releaseId);
  const filename = bolService.generateBOLFilename(release, 'single');
  bolService.downloadBOL(pdfBlob, filename);
  return pdfBlob;
};

export const generateBulkBOLs = async (releaseIds, user) => {
  const zipBlob = await bolService.generateBulkBOL(releaseIds, user);
  const filename = bolService.generateBOLFilename({}, 'bulk');
  bolService.downloadBOL(zipBlob, filename);
  return zipBlob;
};

export { bolService };
