// File: /Users/cerion/CBRT_UI/src/services/bolPDFService.js
// Updated to handle real staging data instead of fake test data

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

class BOLPdfService {
  static generateBOL(
    bolData,
    releaseData,
    supplierData,
    customerData,
    carrierData,
    truckData
  ) {
    const doc = new jsPDF();

    // Page setup
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPos = 20;

    // Header - BILL OF LADING
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BILL OF LADING", pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Company header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cincinnati Barge & Rail Terminal, LLC", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("1707 Riverside Drive", margin, yPos);
    yPos += 4;
    doc.text("Cincinnati, Ohio 45202", margin, yPos);
    yPos += 4;
    doc.text("WWW.BARGE2RAIL.COM", margin, yPos);

    // BOL details (right side)
    const rightX = pageWidth - 80;
    let rightY = 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BOL Number:", rightX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(
      bolData?.bolNumber || bolData?.bolNumber || "N/A",
      rightX + 30,
      rightY
    );

    rightY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Pickup#:", rightX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(
      releaseData?.releaseNumber || bolData?.releaseNumber || "N/A",
      rightX + 30,
      rightY
    );

    rightY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Truck#:", rightX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(truckData?.truckNumber || "N/A", rightX + 30, rightY);

    rightY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Trailer#:", rightX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(
      truckData?.trailerNumber || bolData?.trailerNumber || "N/A",
      rightX + 30,
      rightY
    );

    yPos = 75;

    // Ship From section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SHIP FROM:", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(supplierData?.supplierName || "YAS", margin, yPos);

    // Carrier (right side)
    doc.setFont("helvetica", "bold");
    doc.text("Carrier:", rightX, yPos - 5);
    doc.setFont("helvetica", "normal");
    doc.text(carrierData?.carrierName || "Unknown", rightX + 25, yPos - 5);

    doc.setFont("helvetica", "bold");
    doc.text("Pickup Date:", rightX, yPos);
    doc.setFont("helvetica", "normal");
    const pickupDate = releaseData?.pickupDate
      ? new Date(releaseData.pickupDate).toLocaleDateString()
      : new Date().toLocaleDateString();
    doc.text(pickupDate, rightX + 30, yPos);

    yPos += 15;

    // Ship To section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ship To:", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(customerData?.customerName || "Customer", margin, yPos);
    yPos += 4;

    if (customerData?.contactName) {
      doc.text(`Attn: ${customerData.contactName}`, margin, yPos);
      yPos += 4;
    }
    if (customerData?.address) {
      doc.text(customerData.address, margin, yPos);
      yPos += 4;
    }
    if (customerData?.city && customerData?.state) {
      doc.text(
        `${customerData.city}, ${customerData.state} ${
          customerData.zipCode || ""
        }`,
        margin,
        yPos
      );
      yPos += 4;
    }
    if (customerData?.phone) {
      doc.text(`Phone: ${customerData.phone}`, margin, yPos);
      yPos += 4;
    }

    yPos += 10;

    // Line items table - REAL BARCODE DATA (one line per barcode)
    const lineItems = bolData?.items || [];
    const headers = [
      "Qty",
      "Barcode",
      "Item Description",
      "Size",
      "Lot No.",
      "Wt. (LBS)",
      "Pallet",
    ];

    console.log("BOL PDF Service - Processing line items:", lineItems);

    // Process real staging records into table data
    const data = [];
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach((item) => {
        data.push([
          item.quantity || "0",
          item.barcode || "N/A",
          item.itemName || "Unknown Item",
          item.sizeName || "N/A",
          item.lotNumber || "TBD",
          item.weight ? item.weight.toLocaleString() : "0",
          item.pallets || "N",
        ]);
      });
    }

    // Should not happen with new system - log error if no data
    if (data.length === 0) {
      console.error(
        "BOL PDF Service - No staging data found for verified release!"
      );
      data.push([
        "0",
        "ERROR",
        "No staging data found",
        "N/A",
        "N/A",
        "0",
        "N",
      ]);
    }

    console.log("BOL PDF Service - Generated table data:", data);

    // Add items table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: yPos,
      theme: "grid",
      margin: { left: 20, right: 10 }, // Force smaller margins
      pageBreak: "auto",
      tableWidth: "wrap", // Let it use available space
      headStyles: {
        fillColor: [0, 0, 0], // Black background
        textColor: [255, 255, 255], // White text
        fontSize: 9,
        fontStyle: "bold",
        halign: "center", // Center all headers
      },
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" }, // Qty (centered)
        1: { cellWidth: 50, halign: "left" }, // Barcode (left justified)
        2: { cellWidth: 38, halign: "left" }, // Item Description (left justified)
        3: { cellWidth: 13, halign: "center" }, // Size (centered)
        4: { cellWidth: 18, halign: "center" }, // Lot No. (centered)
        5: { cellWidth: 19, halign: "center" }, // Weight (LBS) (centered)
        6: { cellWidth: 16, halign: "center" }, // Pallet (centered)
      },
    });

    // Add totals from real data - properly spaced under table
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    // Use totals from bolData if available, otherwise calculate
    const totalSacks = bolData?.totals?.totalSacks || data.length;
    const totalPallets = bolData?.totals?.totalPallets || 0;
    const totalWeight =
      bolData?.totals?.totalWeight ||
      lineItems.reduce((sum, item) => sum + (item.weight || 0), 0);

    // Calculate table boundaries for proper alignment
    const tableLeftEdge = margin;
    const tableRightEdge = margin + 174; // Sum of all column widths (12+50+38+15+18+25+16)

    // Position totals: Left +20, Right -10, Center auto-calculated
    const totalSacksX = tableLeftEdge + 20;
    const totalWeightText = `Total Weight: ${totalWeight.toLocaleString()} LBS.`;
    const totalWeightWidth = doc.getTextWidth(totalWeightText);
    const totalWeightX = tableRightEdge - 10 - totalWeightWidth;

    // Auto-center Total Pallets between end of Total Sacks text and start of Total Weight text
    const totalSacksText = `Total Sacks: ${totalSacks}`;
    const totalSacksWidth = doc.getTextWidth(totalSacksText);
    const totalSacksEndX = totalSacksX + totalSacksWidth;
    const totalPalletsText = `Total Pallets: ${totalPallets}`;
    const totalPalletsWidth = doc.getTextWidth(totalPalletsText);
    const availableSpace = totalWeightX - totalSacksEndX;
    const totalPalletsX =
      totalSacksEndX + (availableSpace - totalPalletsWidth) / 2;

    // Draw the totals
    doc.text(totalSacksText, totalSacksX, finalY);
    doc.text(totalPalletsText, totalPalletsX, finalY);
    doc.text(totalWeightText, totalWeightX, finalY);

    // Signature sections at bottom
    this.addSignatureSection(doc);

    return doc;
  }

  static addSignatureSection(doc) {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let yPos = pageHeight - 60;

    // Shipper signature section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SHIPPER SIGNATURE / DATE", 10, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "This is to certify that the above named materials are properly classified, packaged,",
      10,
      yPos
    );
    yPos += 3;
    doc.text(
      "marked and labeled, and are in proper condition for transportation according to",
      10,
      yPos
    );
    yPos += 3;
    doc.text("the applicable regulations of the DOT.", 10, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("James Rose", 10, yPos);

    // Signature line
    doc.line(80, yPos, 180, yPos);

    yPos += 10;

    // Carrier signature section
    doc.setFont("helvetica", "bold");
    doc.text("CARRIER SIGNATURE / PICKUP DATE", 10, yPos);
    doc.text("X", 150, yPos);
    doc.line(155, yPos, pageWidth - 10, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency",
      10,
      yPos
    );
    yPos += 3;
    doc.text(
      "response information was made available and/or carrier has the DOT emergency response",
      10,
      yPos
    );
    yPos += 3;
    doc.text("guidebook or equivalent documentation in the vehicle", 10, yPos);

    yPos += 8;
    doc.setFontSize(7);
    doc.text(
      "RECEIVED, subject to individually determined rates or contracts that have been agreed upon in writing between the carrier and shipper, if applicable, otherwise to the rates, classifications and rules that have been",
      10,
      yPos
    );
    yPos += 3;
    doc.text(
      "established by the carrier and are available to the shipper, on request, and to all applicable state and federal regulations.",
      10,
      yPos
    );
  }

  static getPDFBlob(doc) {
    return doc.output("blob");
  }

  static downloadPDF(doc, filename = "bill-of-lading.pdf") {
    doc.save(filename);
  }
}
export default BOLPdfService;
