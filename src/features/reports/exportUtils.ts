import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProjectReportData, Ticket } from '../../types';

export const exportUtils = {
  /**
   * Export a single ticket as PDF
   */
  exportSingleTicketPdf(ticket: Ticket, projectName?: string): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [30, 41, 59]; // slate-800
    const accentColor = [15, 23, 42]; // slate-900

    // Document Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(projectName ? `PROJECT: ${projectName.toUpperCase()}` : 'PERSONAL TICKET WORKSPACE', 14, 16);

    // Ticket Number & Status Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(ticket.ticket_number, 14, 26);

    const statusName = ticket.status?.name || 'Pending';
    doc.setFontSize(10);
    doc.setTextColor(124, 58, 237); // Purple
    doc.text(`[ ${statusName.toUpperCase()} ]`, 65, 25);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    const splitTitle = doc.splitTextToSize(ticket.title, 180);
    doc.text(splitTitle, 14, 35);

    let currentY = 35 + (splitTitle.length * 6);

    // Meta Attributes Table
    const metaData = [
      ['Category', ticket.category?.name || 'Uncategorized', 'Priority', ticket.priority.toUpperCase()],
      [
        'Created Date',
        new Date(ticket.created_at).toLocaleDateString(),
        'Due Date',
        ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'None',
      ],
      [
        'Last Updated',
        new Date(ticket.updated_at).toLocaleDateString(),
        'Status Stage',
        ticket.status?.is_final ? 'Final (Uploaded)' : 'Active Workflow',
      ],
    ];

    autoTable(doc, {
      startY: currentY + 2,
      body: metaData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 },
        1: { textColor: [30, 41, 59], cellWidth: 60 },
        2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 },
        3: { textColor: [30, 41, 59], cellWidth: 60 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 30;

    // 1. Description Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('DESCRIPTION', 14, currentY);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    const descText = ticket.description?.trim() || 'No description provided for this ticket.';
    const splitDesc = doc.splitTextToSize(descText, 172);
    const descBoxHeight = Math.max(18, splitDesc.length * 5 + 8);

    doc.roundedRect(14, currentY + 3, 182, descBoxHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(splitDesc, 18, currentY + 10);

    currentY += descBoxHeight + 12;

    // 2. Notes Section (Separate from Description)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('NOTES (TECHNICAL & EXECUTION)', 14, currentY);

    doc.setDrawColor(254, 215, 170); // Amber-200
    doc.setFillColor(255, 251, 235); // Amber-50
    const notesText = ticket.notes?.trim() || 'No notes added to this ticket.';
    const splitNotes = doc.splitTextToSize(notesText, 172);
    const notesBoxHeight = Math.max(16, splitNotes.length * 5 + 8);

    doc.roundedRect(14, currentY + 3, 182, notesBoxHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(69, 26, 3);
    doc.text(splitNotes, 18, currentY + 10);

    currentY += notesBoxHeight + 12;

    // 3. Attachments Section
    if (ticket.attachments && ticket.attachments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`ATTACHMENTS (${ticket.attachments.length})`, 14, currentY);

      const attachRows = ticket.attachments.map((att) => [
        att.file_name,
        att.file_type || 'File',
        `${Math.round(att.file_size / 1024)} KB`,
        new Date(att.created_at).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['File Name', 'Format', 'Size', 'Uploaded Date']],
        body: attachRows,
        theme: 'striped',
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: 255,
          fontSize: 8.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Exported from Kanso Workspace • ${ticket.ticket_number} • Page ${i} of ${pageCount}`,
        14,
        287
      );
    }

    const safeFilename = `${ticket.ticket_number.toLowerCase().replace(/[^a-z0-9]/g, '_')}_details.pdf`;
    doc.save(safeFilename);
  },

  /**
   * Export a single ticket as CSV
   */
  exportSingleTicketCsv(ticket: Ticket, projectName?: string): void {
    const headers = [
      'Ticket Number',
      'Title',
      'Project',
      'Category',
      'Status',
      'Priority',
      'Due Date',
      'Description',
      'Notes',
      'Attachments Count',
      'Created Date',
      'Updated Date',
    ];

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const row = [
      escapeCsv(ticket.ticket_number),
      escapeCsv(ticket.title),
      escapeCsv(projectName || ticket.project_id),
      escapeCsv(ticket.category?.name || ''),
      escapeCsv(ticket.status?.name || ''),
      escapeCsv(ticket.priority),
      escapeCsv(ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : ''),
      escapeCsv(ticket.description || ''),
      escapeCsv(ticket.notes || ''),
      escapeCsv(ticket.attachments?.length || 0),
      escapeCsv(new Date(ticket.created_at).toLocaleString()),
      escapeCsv(new Date(ticket.updated_at).toLocaleString()),
    ];

    const csvContent = [headers.join(','), row.join(',')].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticket.ticket_number.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ticket.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export a single ticket as Excel (.xlsx)
   */
  exportSingleTicketExcel(ticket: Ticket, projectName?: string): void {
    const wb = XLSX.utils.book_new();

    const data = [
      ['FIELD', 'VALUE'],
      ['Ticket Number', ticket.ticket_number],
      ['Title', ticket.title],
      ['Project', projectName || ticket.project_id],
      ['Category', ticket.category?.name || 'Uncategorized'],
      ['Status', ticket.status?.name || 'Pending'],
      ['Priority', ticket.priority.toUpperCase()],
      ['Due Date', ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'None'],
      ['Description', ticket.description || ''],
      ['Notes', ticket.notes || ''],
      ['Attachments Count', ticket.attachments?.length || 0],
      ['Created At', new Date(ticket.created_at).toLocaleString()],
      ['Updated At', new Date(ticket.updated_at).toLocaleString()],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Ticket Details');

    if (ticket.attachments && ticket.attachments.length > 0) {
      const attachData = ticket.attachments.map((a) => ({
        'File Name': a.file_name,
        'MIME Type': a.file_type,
        'Size (Bytes)': a.file_size,
        'Uploaded Date': new Date(a.created_at).toLocaleString(),
      }));
      const wsAttach = XLSX.utils.json_to_sheet(attachData);
      XLSX.utils.book_append_sheet(wb, wsAttach, 'Attachments');
    }

    const safeFilename = `${ticket.ticket_number.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ticket.xlsx`;
    XLSX.writeFile(wb, safeFilename);
  },

  /**
   * Export Bulk Tickets as PDF
   */
  exportBulkTicketsPdf(tickets: Ticket[], projectName = 'Tickets Workspace'): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [30, 41, 59];

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${projectName} — Tickets Export`, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated: ${new Date().toLocaleString()} • Total Tickets: ${tickets.length}`,
      14,
      25
    );

    // Status counts
    const statusCounts: Record<string, number> = {};
    tickets.forEach((t) => {
      const sName = t.status?.name || 'Pending';
      statusCounts[sName] = (statusCounts[sName] || 0) + 1;
    });

    const statusSummaryText = Object.entries(statusCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join('  |  ');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Workflow Breakdown:  ${statusSummaryText}`, 14, 31);

    // Tickets Table
    const tableRows = tickets.map((t) => [
      t.ticket_number,
      t.title,
      t.status?.name || 'Pending',
      t.category?.name || 'Uncategorized',
      t.priority.toUpperCase(),
      t.due_date ? new Date(t.due_date).toLocaleDateString() : '-',
      t.notes ? (t.notes.length > 50 ? `${t.notes.slice(0, 47)}...` : t.notes) : '-',
      new Date(t.updated_at).toLocaleDateString(),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['ID', 'Title', 'Status', 'Category', 'Priority', 'Due Date', 'Notes', 'Updated']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 80 },
        2: { cellWidth: 32 },
        3: { cellWidth: 32 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 },
        6: { cellWidth: 42 },
        7: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    });

    const safeName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tickets.pdf`;
    doc.save(safeName);
  },

  /**
   * Export Bulk Tickets as CSV
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
      'Attachments Count',
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
      escapeCsv(t.attachments?.length || 0),
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
   * Export Bulk Tickets as Excel (.xlsx)
   */
  exportBulkTicketsExcel(tickets: Ticket[], projectName = 'Tickets Workspace'): void {
    const wb = XLSX.utils.book_new();

    // Tickets Sheet
    const ticketsData = tickets.map((t) => ({
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

    // Summary Sheet
    const statusCounts: Record<string, number> = {};
    tickets.forEach((t) => {
      const sName = t.status?.name || 'Pending';
      statusCounts[sName] = (statusCounts[sName] || 0) + 1;
    });

    const summaryData = [
      ['PROJECT / WORKSPACE TICKETS SUMMARY'],
      ['Project Name', projectName],
      ['Generated Date', new Date().toLocaleString()],
      ['Total Tickets', tickets.length],
      [''],
      ['STATUS BREAKDOWN'],
      ...Object.entries(statusCounts).map(([status, count]) => [status, count]),
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const safeName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tickets.xlsx`;
    XLSX.writeFile(wb, safeName);
  },

  /**
   * Export Full Project Report as PDF
   */
  exportToPdf(report: ProjectReportData, filename?: string): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [30, 41, 59];

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
   * Export Full Project Report as Excel (.xlsx)
   */
  exportToExcel(report: ProjectReportData, filename?: string): void {
    const wb = XLSX.utils.book_new();

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
   * Export as JSON
   */
  exportToJson(data: any, filename?: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'project_data.json';
    link.click();
    URL.revokeObjectURL(url);
  },
};
