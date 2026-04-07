import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Order } from '@rms/core';
import { SupplierOrder } from '@rms/core';

// Note: For full Cyrillic support in production, a custom font should be embedded.
// For this implementation, we will use standard fonts and basic styling.

export class PDFGenerator {
  static generateOrderInvoice(order: Order) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text("INVOICE / НАКЛАДНАЯ", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.id}`, 20, 30);
    doc.text(`Date: ${format(new Date(order.createdAt), "PPP", { locale: ru })}`, 20, 36);
    doc.text(`Customer: ${order.customerName}`, 20, 42);
    doc.text(`Phone: ${order.customerPhone}`, 20, 48);
    doc.text(`Payment: ${order.paymentMethod}`, 20, 54);

    // Table
    const tableData = order.items.map((item, index) => [
      index + 1,
      item.menuItemName,
      item.quantity,
      `${item.priceAtTime !== undefined ? item.priceAtTime.toFixed(2) : "0.00"} ₪`,
      `${((item.priceAtTime || 0) * item.quantity).toFixed(2)} ₪`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["#", "Item", "Qty", "Price", "Total"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 126, 0] }, // Orange
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL AMOUNT: ${order.totalAmount.toFixed(2)} NIS`, pageWidth - 20, finalY, { align: "right" });

    // Save
    doc.save(`Invoice_${order.id.substring(0, 8)}.pdf`);
  }

  static generateZReport(orders: Order[], startDate: Date, endDate: Date) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cashSales = orders.filter(o => o.paymentMethod.toLowerCase() === 'cash').reduce((sum, o) => sum + o.totalAmount, 0);
    const cardSales = totalSales - cashSales;

    // Header
    doc.setFontSize(22);
    doc.text("Z-REPORT (СМЕННЫЙ ОТЧЕТ)", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, "dd.MM.yyyy HH:mm")} - ${format(endDate, "dd.MM.yyyy HH:mm")}`, 20, 40);
    doc.text(`Exported: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, 20, 46);

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 55, pageWidth - 40, 40, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("SUMMARY STATISTICS", 30, 65);
    doc.setFontSize(10);
    doc.text(`Total Orders: ${orders.length}`, 30, 75);
    doc.text(`Cash: ${cashSales.toFixed(2)} NIS`, 100, 75);
    doc.text(`Card: ${cardSales.toFixed(2)} NIS`, 100, 82);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`NET SALES: ${totalSales.toFixed(2)} NIS`, 30, 88);

    // List of Orders
    autoTable(doc, {
      startY: 105,
      head: [["Time", "Order ID", "Customer", "Payment", "Amount"]],
      body: orders.map(o => [
        format(new Date(o.createdAt), "HH:mm"),
        o.id.substring(0, 8),
        o.customerName,
        o.paymentMethod,
        `${o.totalAmount.toFixed(2)} ₪`
      ]),
      headStyles: { fillColor: [60, 60, 60] }
    });

    doc.save(`Z_Report_${format(new Date(), "yyyy_MM_dd")}.pdf`);
  }

  static generateSupplierOrder(order: SupplierOrder) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const supplier = (order as any).expand?.supplier;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 102, 204); // Blue
    doc.text("PURCHASE ORDER / ЗАКАЗ", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(`Date: ${format(new Date(order.createdAt || new Date()), "dd.MM.yyyy HH:mm")}`, 20, 46);
    doc.text(`Via: ${(order as any).sentVia}`, 20, 52);

    // Supplier Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("SUPPLIER / ПОСТАВЩИК:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text((supplier as any)?.name || "Unknown Supplier", 20, 72);
    doc.setFontSize(10);
    doc.text(`Email: ${(supplier as any)?.email || "—"}`, 20, 78);
    doc.text(`Phone: ${(supplier as any)?.phone || "—"}`, 20, 84);

    // Table
    autoTable(doc, {
      startY: 95,
      head: [["#", "Product", "Qty", "Unit", "Price", "Total"]],
      body: ((order as any).items || []).map((item, idx) => [
        idx + 1,
        item.name,
        item.quantity,
        item.unit,
        `${(item.price || 0).toFixed(2)} ₪`,
        `${((item.price || 0) * item.quantity).toFixed(2)} ₪`
      ]),
      headStyles: { fillColor: [0, 102, 204] }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL AMOUNT: ${(order.totalAmount || 0).toFixed(2)} NIS`, pageWidth - 20, finalY, { align: "right" });

    doc.save(`Order_${order.id.substring(0, 8)}.pdf`);
  }
}
