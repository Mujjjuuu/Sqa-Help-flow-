import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProjectReportData, Ticket } from '../../types';

export const exportUtils = {
  /**
   * Export Project Report as PDF
   */
  exportToPdf(report: ProjectReportData, filename?: string): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [30, 41, 59]; // slate-800
    const accentColor = [14, 116, 144]; // cyan-700

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Project Status & Ticketing Report', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date(report.reportGeneratedDate).toLocaleString()}`, 14, 27);

    // Project Info Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 32, 182, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(report.project.name, 18, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const desc = report.project.description || 'No project description provided.';
    const splitDesc = doc.splitTextToSize(desc, 174);
    doc.text(splitDesc.slice(0, 2), 18, 46);

    // Summary Metrics Grid
    const startY = 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Summary Overview', 14, startY);

    const statusRows = Object.entries(report.statusCounts).map(([status, count]) => [
      status,
      count.toString(),
    ]);

    autoTable(doc, {
      startY: startY + 3,
      head: [['Status Column', 'Ticket Count']],
      body: statusRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      margin: { left: 14, right: 100 },
    });

    // Right summary card (Total & Completion)
    const rightBoxX = 118;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(rightBoxX, startY + 3, 78, 42, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Tickets', rightBoxX + 6, startY + 13);
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(report.totalTickets.toString(), rightBoxX + 6, startY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Completion Rate', rightBoxX + 42, startY + 13);
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text(`${report.completionPercentage}%`, rightBoxX + 42, startY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Uploaded: ${report.statusCounts['Uploaded'] || 0} / ${report.totalTickets} total`,
      rightBoxX + 6,
      startY + 34
    );

    // Tickets Table
    const finalY = (doc as any).lastAutoTable?.finalY || 115;
    const tableTop = Math.max(finalY + 12, startY + 54);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Tickets List (${report.tickets.length})`, 14, tableTop);

    const ticketRows = report.tickets.map((t) => [
      t.ticket_number,
      t.title,
      t.category?.name || 'Uncategorized',
      t.status?.name || 'Pending',
      t.priority.toUpperCase(),
      new Date(t.created_at).toLocaleDateString(),
      new Date(t.updated_at).toLocaleDateString(),
    ]);

    autoTable(doc, {
      startY: tableTop + 4,
      head: [['ID', 'Title', 'Category', 'Status', 'Priority', 'Created', 'Updated']],
      body: ticketRows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 58 },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 16 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
      },
      margin: { left: 14, right: 14 },
    });

    const saveName = filename || `${report.project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report.pdf`;
    doc.save(saveName);
  },

  /**
   * Export Project Report as Excel (.xlsx)
   */
  exportToExcel(report: ProjectReportData, filename?: string): void {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['PROJECT REPORT SUMMARY'],
      ['Project Name', report.project.name],
      ['Description', report.project.description || ''],
      ['Generated Date', new Date(report.reportGeneratedDate).toLocaleString()],
      ['Total Tickets', report.totalTickets],
      ['Completion %', `${report.completionPercentage}%`],
      [''],
      ['STATUS BREAKDOWN'],
      ...Object.entries(report.statusCounts).map(([status, count]) => [status, count]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Tickets Sheet
    const ticketsData = report.tickets.map((t) => ({
      'Ticket Number': t.ticket_number,
      'Title': t.title,
      'Category': t.category?.name || '',
      'Status': t.status?.name || '',
      'Priority': t.priority,
      'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString() : '',
      'Description': t.description || '',
      'Notes': t.notes || '',
      'Attachments Count': t.attachments?.length || 0,
      'Created Date': new Date(t.created_at).toLocaleString(),
      'Updated Date': new Date(t.updated_at).toLocaleString(),
    }));
    const wsTickets = XLSX.utils.json_to_sheet(ticketsData);
    XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets');

    const saveName = filename || `${report.project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report.xlsx`;
    XLSX.writeFile(wb, saveName);
  },

  /**
   * Export Tickets as CSV
   */
  exportToCsv(tickets: Ticket[], projectName = 'tickets', filename?: string): void {
    const headers = [
      'Ticket Number',
      'Title',
      'Category',
      'Status',
      'Priority',
      'Due Date',
      'Description',
      'Notes',
      'Created Date',
      'Updated Date',
    ];

    const escapeCsv = (str: string | number | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = tickets.map((t) => [
      escapeCsv(t.ticket_number),
      escapeCsv(t.title),
      escapeCsv(t.category?.name || ''),
      escapeCsv(t.status?.name || ''),
      escapeCsv(t.priority),
      escapeCsv(t.due_date ? new Date(t.due_date).toLocaleDateString() : ''),
      escapeCsv(t.description || ''),
      escapeCsv(t.notes || ''),
      escapeCsv(new Date(t.created_at).toLocaleString()),
      escapeCsv(new Date(t.updated_at).toLocaleString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tickets.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export Report as JSON
   */
  exportToJson(data: any, filename?: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'project_report.json';
    link.click();
    URL.revokeObjectURL(url);
  },
};
