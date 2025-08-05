// File: /Users/cerion/CBRT_UI/src/services/pickTicketService.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logger } from '../utils/logger';

export class PickTicketService {
  static generatePickTicket(releaseData, supplierData, customerData, lineItemsWithBarcodes) {
    return logger.wrapSync(() => {
      logger.info('Starting pick ticket generation', {
        releaseNumber: releaseData?.ReleaseNumber,
        lineItemCount: lineItemsWithBarcodes?.length,
        supplier: supplierData?.SupplierName,
        customer: customerData?.CustomerName
      });

      const doc = new jsPDF();
      
      // Page setup
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      let yPos = 20;
      
      logger.debug('PDF page setup complete', {
        pageWidth,
        margin,
        availableWidth: pageWidth - (margin * 2)
      });

      // Header - PICK TICKET
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PICK TICKET', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      // Company header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Cincinnati Barge & Rail Terminal, LLC', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('1707 Riverside Drive', margin, yPos);
      yPos += 4;
      doc.text('Cincinnati, Ohio 45202', margin, yPos);
      yPos += 4;
      doc.text('WWW.BARGE2RAIL.COM', margin, yPos);
      
      // Release details (right side)
      const rightX = pageWidth - 80;
      let rightY = 35;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Release #:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(releaseData?.ReleaseNumber || 'N/A', rightX + 30, rightY);
      
      rightY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString(), rightX + 30, rightY);
      
      if (releaseData?.PickupDate) {
        rightY += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Expected Pickup:', rightX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(releaseData.PickupDate).toLocaleDateString(), rightX + 30, rightY);
      }
      
      yPos = 75;
      
      // Ship From section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SHIP FROM:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(supplierData?.SupplierName || 'Unknown Supplier', margin, yPos);
      
      yPos += 15;
      
      // Ship To section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Ship To:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(customerData?.CustomerName || 'Unknown Customer', margin, yPos);
      yPos += 4;
      
      if (customerData?.ContactName) {
        doc.text(`Attn: ${customerData.ContactName}`, margin, yPos);
        yPos += 4;
      }
      if (customerData?.Address) {
        doc.text(customerData.Address, margin, yPos);
        yPos += 4;
      }
      if (customerData?.City && customerData?.State) {
        doc.text(`${customerData.City}, ${customerData.State} ${customerData.ZipCode || ''}`, margin, yPos);
        yPos += 4;
      }
      
      yPos += 15;
      
      // Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('WAREHOUSE INSTRUCTIONS:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('1. Scan each barcode listed below to stage this release', margin, yPos);
      yPos += 4;
      doc.text('2. Quantities must match exactly - no substitutions', margin, yPos);
      yPos += 4;
      doc.text('3. Contact office if any items are unavailable', margin, yPos);
      
      yPos += 15;
      
      logger.debug('PDF header and instructions complete, starting table generation');
      
      // Line items table - FIXED WITH PROPORTIONAL WIDTHS
      const headers = ['Barcode', 'Item Description', 'Size', 'Lot', 'Qty', 'Staged'];
      
      // Truncate long text to prevent overflow
      const truncateText = (text, maxLength) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
      };
      
      const data = lineItemsWithBarcodes.map((item, index) => {
        logger.debug(`Processing line item ${index + 1}`, {
          barcode: item.Barcode,
          itemCode: item.itemCode,
          itemName: item.itemName,
          sizeName: item.sizeName,
          lotNumber: item.lotNumber,
          quantity: item.Quantity
        });
        
        return [
          truncateText(item.Barcode || 'SCAN_REQUIRED', 15),
          truncateText(`${item.itemCode || ''} ${item.itemName || ''}`.trim() || 'Unknown Item', 30),
          truncateText(item.sizeName || item.Size || '', 12),
          truncateText(item.lotNumber || item.Lot || '', 15),
          (item.Quantity || '1').toString(),
          '___'
        ];
      });
      
      // Calculate proportional widths based on available space
      const availableWidth = pageWidth - (margin * 2);
      
      logger.debug('Table setup complete', {
        availableWidth,
        dataRows: data.length,
        headerColumns: headers.length
      });
      
      // Add items table with proportional column widths
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: yPos,
        theme: 'grid',
        margin: { left: margin, right: margin },
        tableWidth: availableWidth,
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          textColor: [0, 0, 0],
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.20 }, // 20% - Barcode
          1: { cellWidth: availableWidth * 0.35 }, // 35% - Item Description
          2: { cellWidth: availableWidth * 0.15 }, // 15% - Size
          3: { cellWidth: availableWidth * 0.15 }, // 15% - Lot
          4: { cellWidth: availableWidth * 0.08 }, // 8% - Qty
          5: { cellWidth: availableWidth * 0.07 }  // 7% - Staged
        }
      });
      
      logger.debug('Table generation complete');
      
      // Add totals and signatures - SAFETY GUARD for finalY
      const finalY = ((doc.lastAutoTable && doc.lastAutoTable.finalY) || yPos) + 15;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Total Items: ${lineItemsWithBarcodes.length}`, margin, finalY);
      doc.text(`Total Quantity: ${lineItemsWithBarcodes.reduce((sum, item) => sum + (parseInt(item.Quantity) || 0), 0)}`, pageWidth - 80, finalY);
      
      // Signature lines
      const sigY = finalY + 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Staged by line
      doc.text('STAGED BY:', margin, sigY);
      doc.line(margin + 25, sigY + 2, margin + 80, sigY + 2);
      doc.text('DATE:', margin + 85, sigY);
      doc.line(margin + 95, sigY + 2, margin + 130, sigY + 2);
      
      // Verified by line
      const verifyY = sigY + 15;
      doc.text('VERIFIED BY:', margin, verifyY);
      doc.line(margin + 30, verifyY + 2, margin + 85, verifyY + 2);
      doc.text('DATE:', margin + 90, verifyY);
      doc.line(margin + 100, verifyY + 2, margin + 135, verifyY + 2);
      
      logger.info('Pick ticket generation completed successfully', {
        releaseNumber: releaseData?.ReleaseNumber,
        finalY: finalY
      });
      
      return doc;
    }, 'PickTicketService.generatePickTicket')();
  }

  static getPDFBlob(doc) {
    return logger.wrapSync(() => {
      logger.debug('Converting PDF document to blob');
      const blob = doc.output('blob');
      logger.debug('PDF blob created', { size: blob.size, type: blob.type });
      return blob;
    }, 'PickTicketService.getPDFBlob')();
  }

  static downloadPickTicket(doc, releaseNumber) {
    return logger.wrapSync(() => {
      logger.info('Downloading pick ticket', { releaseNumber });
      doc.save(`Pick-Ticket-${releaseNumber}.pdf`);
      logger.info('Pick ticket download initiated');
    }, 'PickTicketService.downloadPickTicket')();
  }
}