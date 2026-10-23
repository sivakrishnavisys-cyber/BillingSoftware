import { jsPDF } from 'jspdf';
import { formatINR } from './currencyUtils';
import { formatDateTime } from './dateUtils';
import { paymentLabel } from './receiptUtils';

/**
 * Generates and downloads a PDF receipt for a given invoice.
 * Supports '80mm' (thermal POS style) and 'a4' (standard tax invoice style).
 */
export function exportInvoicePdf(invoice, shop, layout = '80mm') {
  if (!invoice || !shop) return;

  if (layout === 'a4') {
    generateA4InvoicePdf(invoice, shop);
  } else {
    generate80mmThermalPdf(invoice, shop);
  }
}

function generate80mmThermalPdf(invoice, shop) {
  // Estimate height based on number of items
  const baseHeight = 110;
  const itemHeight = invoice.items.length * 10;
  const totalHeight = Math.max(160, baseHeight + itemHeight);

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, totalHeight],
  });

  let y = 8;
  const left = 4;
  const right = 76;
  const center = 40;

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(shop.name || 'Retail Supermarket', center, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  if (shop.address) {
    const splitAddr = doc.splitTextToSize(shop.address, 72);
    doc.text(splitAddr, center, y, { align: 'center' });
    y += splitAddr.length * 3.5;
  }
  if (shop.phone) {
    doc.text(`Phone: ${shop.phone}`, center, y, { align: 'center' });
    y += 3.5;
  }
  if (shop.gstin) {
    doc.text(`GSTIN: ${shop.gstin}`, center, y, { align: 'center' });
    y += 3.5;
  }

  // Divider
  doc.setLineDashPattern([1, 1], 0);
  doc.line(left, y, right, y);
  y += 4;

  // Meta
  doc.setFontSize(8);
  doc.text(`Invoice: ${invoice.invoiceNumber}`, left, y);
  y += 3.5;
  doc.text(`Date: ${formatDateTime(invoice.createdAt)}`, left, y);
  y += 3.5;

  if (invoice.customerName) {
    doc.text(`Customer: ${invoice.customerName}`, left, y);
    y += 3.5;
  }
  if (invoice.customerPhone) {
    doc.text(`Mobile: ${invoice.customerPhone}`, left, y);
    y += 3.5;
  }
  doc.text(`Payment: ${paymentLabel(invoice.paymentMethod)} (Demo)`, left, y);
  y += 4;

  // Table header
  doc.line(left, y, right, y);
  y += 3.5;
  doc.setFont('courier', 'bold');
  doc.text('Item', left, y);
  doc.text('Qty', 44, y, { align: 'right' });
  doc.text('Rate', 58, y, { align: 'right' });
  doc.text('Amt (INR)', right, y, { align: 'right' });
  y += 2;
  doc.line(left, y, right, y);
  y += 3.5;

  // Items
  doc.setFont('courier', 'normal');
  invoice.items.forEach((it) => {
    const itemName = it.name.length > 20 ? it.name.substring(0, 19) + '…' : it.name;
    doc.text(itemName, left, y);
    doc.text(String(it.qty), 44, y, { align: 'right' });
    doc.text((it.unitPricePaise / 100).toFixed(2), 58, y, { align: 'right' });
    doc.text((it.lineTotalPaise / 100).toFixed(2), right, y, { align: 'right' });
    y += 3.2;

    if (it.sku || it.discountPaise > 0) {
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      let sub = `SKU: ${it.sku}`;
      if (it.discountPaise > 0) {
        sub += ` (Disc -${formatINR(it.discountPaise)})`;
      }
      doc.text(sub, left, y);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      y += 3.2;
    }
  });

  y += 1;
  doc.line(left, y, right, y);
  y += 4;

  // Totals
  doc.text('Subtotal:', 44, y, { align: 'right' });
  doc.text(formatINR(invoice.subtotalPaise), right, y, { align: 'right' });
  y += 3.5;

  if (invoice.discountPaise > 0) {
    doc.text('Discount:', 44, y, { align: 'right' });
    doc.text(`-${formatINR(invoice.discountPaise)}`, right, y, { align: 'right' });
    y += 3.5;
  }

  if (invoice.taxPaise > 0) {
    const halfTax = Math.round(invoice.taxPaise / 2);
    doc.text(`CGST (${invoice.taxRate / 2}%):`, 44, y, { align: 'right' });
    doc.text(formatINR(halfTax), right, y, { align: 'right' });
    y += 3.5;
    doc.text(`SGST (${invoice.taxRate / 2}%):`, 44, y, { align: 'right' });
    doc.text(formatINR(invoice.taxPaise - halfTax), right, y, { align: 'right' });
    y += 3.5;
  }

  doc.line(left, y, right, y);
  y += 4;
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('GRAND TOTAL:', 44, y, { align: 'right' });
  doc.text(formatINR(invoice.grandTotalPaise), right, y, { align: 'right' });
  y += 4.5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text('Amount Paid:', 44, y, { align: 'right' });
  doc.text(formatINR(invoice.amountPaidPaise), right, y, { align: 'right' });
  y += 3.5;

  if (invoice.paymentMethod === 'cash') {
    doc.text('Change:', 44, y, { align: 'right' });
    doc.text(formatINR(invoice.changePaise), right, y, { align: 'right' });
    y += 3.5;
  }

  // Footer
  y += 3;
  doc.line(left, y, right, y);
  y += 4;
  doc.setFontSize(8);
  doc.text(shop.receiptFooter || 'Thank you for shopping with us!', center, y, { align: 'center' });
  y += 3.5;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Retail POS Demo · Computer Generated Receipt', center, y, { align: 'center' });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

function generateA4InvoicePdf(invoice, shop) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const left = 14;
  const right = 196;
  let y = 16;

  // Title & Store Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 95, 191);
  doc.text(shop.name || 'Retail Supermarket', left, y);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('RETAIL TAX INVOICE', right, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  if (shop.address) {
    doc.text(shop.address, left, y);
    y += 5;
  }
  doc.text(`Phone: ${shop.phone} | GSTIN: ${shop.gstin || 'N/A'}`, left, y);
  y += 8;

  // Divider line
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);
  y += 7;

  // Invoice & Customer Info Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Invoice Details', left, y);
  doc.text('Billed To', 110, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, left, y);
  doc.text(`Customer: ${invoice.customerName || 'Walk-in Customer'}`, 110, y);
  y += 5;
  doc.text(`Date & Time: ${formatDateTime(invoice.createdAt)}`, left, y);
  doc.text(`Contact: ${invoice.customerPhone || '—'}`, 110, y);
  y += 5;
  doc.text(`Payment Mode: ${paymentLabel(invoice.paymentMethod).toUpperCase()} (Demo)`, left, y);
  y += 8;

  // Table Header
  doc.setFillColor(243, 245, 248);
  doc.rect(left, y, right - left, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 36, 48);
  doc.text('S.No', left + 2, y + 5);
  doc.text('Item Description', left + 14, y + 5);
  doc.text('SKU / Barcode', left + 75, y + 5);
  doc.text('Qty', 125, y + 5, { align: 'right' });
  doc.text('Rate', 148, y + 5, { align: 'right' });
  doc.text('Discount', 170, y + 5, { align: 'right' });
  doc.text('Amount (INR)', right - 2, y + 5, { align: 'right' });
  y += 9;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  invoice.items.forEach((it, idx) => {
    doc.text(String(idx + 1), left + 2, y);
    doc.text(it.name.slice(0, 32), left + 14, y);
    doc.text(`${it.sku} · ${it.barcode}`, left + 75, y);
    doc.text(`${it.qty} ${it.unit || ''}`, 125, y, { align: 'right' });
    doc.text((it.unitPricePaise / 100).toFixed(2), 148, y, { align: 'right' });
    doc.text(it.discountPaise > 0 ? (it.discountPaise / 100).toFixed(2) : '—', 170, y, { align: 'right' });
    doc.text((it.lineTotalPaise / 100).toFixed(2), right - 2, y, { align: 'right' });
    y += 6;
  });

  y += 3;
  doc.line(left, y, right, y);
  y += 7;

  // Totals Section on the right
  const totX = 140;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totX, y);
  doc.text(formatINR(invoice.subtotalPaise), right - 2, y, { align: 'right' });
  y += 5;

  if (invoice.discountPaise > 0) {
    doc.text('Total Discount:', totX, y);
    doc.text(`-${formatINR(invoice.discountPaise)}`, right - 2, y, { align: 'right' });
    y += 5;
  }

  if (invoice.taxPaise > 0) {
    const halfTax = Math.round(invoice.taxPaise / 2);
    doc.text(`CGST (${invoice.taxRate / 2}%):`, totX, y);
    doc.text(formatINR(halfTax), right - 2, y, { align: 'right' });
    y += 5;
    doc.text(`SGST (${invoice.taxRate / 2}%):`, totX, y);
    doc.text(formatINR(invoice.taxPaise - halfTax), right - 2, y, { align: 'right' });
    y += 5;
  }

  doc.setDrawColor(26, 95, 191);
  doc.line(totX, y, right, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 95, 191);
  doc.text('Grand Total:', totX, y);
  doc.text(formatINR(invoice.grandTotalPaise), right - 2, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Amount Paid: ${formatINR(invoice.amountPaidPaise)}`, totX, y);
  if (invoice.paymentMethod === 'cash') {
    doc.text(`Change Returned: ${formatINR(invoice.changePaise)}`, right - 2, y, { align: 'right' });
  }
  y += 15;

  // Footer
  doc.setDrawColor(220, 225, 235);
  doc.line(left, y, right, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(shop.receiptFooter || 'Thank you for shopping with us! Visit again.', left, y);
  doc.text('Demo Tax Invoice · System Generated', right, y, { align: 'right' });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
