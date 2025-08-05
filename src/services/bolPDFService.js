import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class BOLPdfService {
  static generateBOL(bolData, releaseData, supplierData, customerData, carrierData, truckData) {
    const doc = new jsPDF();
    
    // Page setup
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    let yPos = 20;
    
    // Header - BILL OF LADING
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL OF LADING', pageWidth / 2, yPos, { align: 'center' });
    
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
    
    // BOL details (right side)
    const rightX = pageWidth - 80;
    let rightY = 35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BOL Number:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(bolData?.BOLNumber || 'N/A', rightX + 30, rightY);
    
    rightY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Pickup#:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(releaseData?.ReleaseNumber || 'N/A', rightX + 30, rightY);
    
    rightY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Truck#:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(truckData?.TruckNumber || 'N/A', rightX + 30, rightY);
    
    rightY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Trailer#:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(truckData?.TrailerNumber || bolData?.TrailerNumber || 'N/A', rightX + 30, rightY);
    
    yPos = 75;
    
    // Ship From section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SHIP FROM:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(supplierData?.SupplierName || 'YAS', margin, yPos);
    
    // Carrier (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Carrier:', rightX, yPos - 5);
    doc.setFont('helvetica', 'normal');
    doc.text(carrierData?.CarrierName || 'Unknown', rightX + 25, yPos - 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Pickup Date:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    const pickupDate = releaseData?.PickupDate ? new Date(releaseData.PickupDate).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(pickupDate, rightX + 30, yPos);
    
    yPos += 15;
    
    // Ship To section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Ship To:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(customerData?.CustomerName || 'URC', margin, yPos);
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
    if (customerData?.Phone) {
      doc.text(`Phone: ${customerData.Phone}`, margin, yPos);
      yPos += 4;
    }
    
    yPos += 10;
    
    // Line items table with barcode format - ONE LINE PER BARCODE
    const lineItems = bolData?.items || [];
    const headers = ['Barcode', 'Item Description', 'Size', 'Lot No.', 'Weight (LBS)', 'Pallet', 'Item No.'];
    
    // Generate barcode data - one line per barcode based on quantity
    const data = [];
    lineItems.forEach(item => {
      const quantity = parseInt(item.quantity) || 1;
      const itemCode = item.itemCode || 'TEST';
      const itemName = item.itemName || 'Test Item';
      const size = item.sizeName || item.Size || '3x8';
      const lotNumber = item.lotNumber || item.Lot || 'TEST001';
      const weight = item.Weight || '2,200';
      
      // Create individual barcode entries based on quantity
      for (let i = 0; i < quantity; i++) {
        const barcode = `Y${String(Date.now() + i).slice(-6)}`;
        data.push([
          barcode,
          `${itemCode} ${itemName}`,
          size,
          lotNumber,
          weight,
          'N', // Pallet - always N as specified
          itemCode // Item No.
        ]);
      }
    });
    
    // Add default row if no line items
    if (data.length === 0) {
      data.push(['Y000001', 'TEST Test Item', '3x8', 'TEST001', '2,200', 'N', 'TEST']);
    }
    
    // Add items table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 0, 0], // Black background
        textColor: [255, 255, 255], // White text
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 24 }, // Barcode
        1: { cellWidth: 42 }, // Item Description  
        2: { cellWidth: 18 }, // Size
        3: { cellWidth: 24 }, // Lot No.
        4: { cellWidth: 24 }, // Weight
        5: { cellWidth: 16 }, // Pallet
        6: { cellWidth: 22 }  // Item No.
      }
    });
    
    // Add totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total Sacks: ${data.length}`, margin, finalY);
    doc.text(`Total Pallets: 0`, margin + 80, finalY);
    doc.text(`Total Weight: ${(data.length * 2200).toLocaleString()} LBS.`, pageWidth - 80, finalY);
    
    // Signature sections at bottom
    this.addSignatureSection(doc);
    
    return doc;
  }
  
  static addSignatureSection(doc) {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let yPos = pageHeight - 60;
    
    // Shipper signature section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SHIPPER SIGNATURE / DATE', 10, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('This is to certify that the above named materials are properly classified, packaged,', 10, yPos);
    yPos += 3;
    doc.text('marked and labeled, and are in proper condition for transportation according to', 10, yPos);
    yPos += 3;
    doc.text('the applicable regulations of the DOT.', 10, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('James Rose', 10, yPos);
    
    // Signature line
    doc.line(80, yPos, 180, yPos);
    
    yPos += 10;
    
    // Carrier signature section
    doc.setFont('helvetica', 'bold');
    doc.text('CARRIER SIGNATURE / PICKUP DATE', 10, yPos);
    doc.text('X', 150, yPos);
    doc.line(155, yPos, pageWidth - 10, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency', 10, yPos);
    yPos += 3;
    doc.text('response information was made available and/or carrier has the DOT emergency response', 10, yPos);
    yPos += 3;
    doc.text('guidebook or equivalent documentation in the vehicle', 10, yPos);
    
    yPos += 8;
    doc.setFontSize(7);
    doc.text('RECEIVED, subject to individually determined rates or contracts that have been agreed upon in writing between the carrier and shipper, if applicable, otherwise to the rates, classifications and rules that have been', 10, yPos);
    yPos += 3;
    doc.text('established by the carrier and are available to the shipper, on request, and to all applicable state and federal regulations.', 10, yPos);
  }
  
  static getPDFBlob(doc) {
    return doc.output('blob');
  }
  
  static downloadPDF(doc, filename = 'bill-of-lading.pdf') {
    doc.save(filename);
  }
}