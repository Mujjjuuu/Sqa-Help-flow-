import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Trash2,
  Download,
  CheckSquare,
  FileSpreadsheet,
  FileCode,
  FileText,
  Eye,
  Edit2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TicketDetails } from '../features/tickets/TicketDetails';
import { TicketForm } from '../features/tickets/TicketForm';
import { ticketService } from '../features/tickets/ticketService';
import { projectService } from '../features/projects/projectService';
import { statusService } from '../services/statusService';
import { categoryService } from '../services/categoryService';
import { exportUtils } from '../features/reports/exportUtils';
import { Ticket, Project, Status, Category } from '../types';
import { PRIORITY_CONFIG } from '../config/ticketCategories';
import { STATUS_COLORS } from '../config/ticketStatuses';

export const AllTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [dateField, setDateField] = useState<'created_at' | 'updated_at'>('created_at');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Multi-Select
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [bulkStatusId, setBulkStatusId] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals
  const [activeTicketForDetails, setActiveTicketForDetails] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allTkts, allProjs] = await Promise.all([
        ticketService.getTickets(),
        projectService.getProjects(),
      ]);
      setTickets(allTkts);
      setProjects(allProjs);

      if (allProjs[0]) {
        const [stList, catList] = await Promise.all([
          statusService.getStatuses(allProjs[0].id),
          categoryService.getCategories(allProjs[0].id),
        ]);
        setStatuses(stList);
        setCategories(catList);
      }
    } catch (e) {
      console.error('Failed to load tickets list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter application
  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.ticket_number.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q));

    const matchesProject = !selectedProjectId || t.project_id === selectedProjectId;
    const matchesStatus = !selectedStatusId || t.status_id === selectedStatusId;
    const matchesCategory = !selectedCategoryId || t.category_id === selectedCategoryId;
    const matchesPriority = !selectedPriority || t.priority === selectedPriority;

    let matchesDates = true;
    const checkDate = new Date(dateField === 'updated_at' ? t.updated_at : t.created_at).getTime();
    if (dateFrom) {
      matchesDates = matchesDates && checkDate >= new Date(dateFrom).getTime();
    }
    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999);
      matchesDates = matchesDates && checkDate <= toTime;
    }

    return matchesSearch && matchesProject && matchesStatus && matchesCategory && matchesPriority && matchesDates;
  });

  const hasActiveFilters = Boolean(
    search ||
    selectedProjectId ||
    selectedStatusId ||
    selectedCategoryId ||
    selectedPriority ||
    dateFrom ||
    dateTo
  );

  const clearFilters = () => {
    setSearch('');
    setSelectedProjectId('');
    setSelectedStatusId('');
    setSelectedCategoryId('');
    setSelectedPriority('');
    setDateFrom('');
    setDateTo('');
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedTicketIds.size === filteredTickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedTicketIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTicketIds(next);
  };

  // Bulk operations
  const handleBulkChangeStatus = async () => {
    if (!bulkStatusId || selectedTicketIds.size === 0) return;
    await ticketService.bulkUpdateStatus(Array.from(selectedTicketIds), bulkStatusId);
    setSelectedTicketIds(new Set());
    setBulkStatusId('');
    await loadData();
  };

  const handleBulkDelete = async () => {
    await ticketService.bulkDeleteTickets(Array.from(selectedTicketIds));
    setSelectedTicketIds(new Set());
    setIsBulkDeleting(false);
    await loadData();
  };

  const handleExportSelectedCsv = () => {
    const selected = tickets.filter((t) => selectedTicketIds.has(t.id));
    exportUtils.exportToCsv(selected.length > 0 ? selected : filteredTickets, 'selected_tickets');
  };

  const handleExportSelectedJson = () => {
    const selected = tickets.filter((t) => selectedTicketIds.has(t.id));
    exportUtils.exportToJson(selected.length > 0 ? selected : filteredTickets, 'selected_tickets.json');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">All Tickets</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter, inspect history, and perform multi-select bulk operations across all projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(!isExportMenuOpen);
              }}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              rightIcon={<ChevronDown className="w-3 h-3 text-slate-400" />}
              className="text-xs"
            >
              Export
            </Button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Export {selectedTicketIds.size > 0 ? `${selectedTicketIds.size} Selected` : `${filteredTickets.length} Filtered`}
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      const target = selectedTicketIds.size > 0
                        ? tickets.filter((t) => selectedTicketIds.has(t.id))
                        : filteredTickets;
                      exportUtils.exportBulkTicketsPdf(target, 'Tickets Workspace');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>Export as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      const target = selectedTicketIds.size > 0
                        ? tickets.filter((t) => selectedTicketIds.has(t.id))
                        : filteredTickets;
                      exportUtils.exportBulkTicketsExcel(target, 'Tickets Workspace');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export as Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      const target = selectedTicketIds.size > 0
                        ? tickets.filter((t) => selectedTicketIds.has(t.id))
                        : filteredTickets;
                      exportUtils.exportToCsv(target, 'tickets_export');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-600" />
                    <span>Export as CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="p-4 bg-white space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Ticket ID, Title, Description, Notes..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Quick Clear Filter */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-start lg:self-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Date Range From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            title="Created Date From"
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />

          {/* Date Range To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            title="Created Date To"
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </Card>

      {/* Multi-Select Floating Toolbar */}
      {selectedTicketIds.size > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-slate-800 px-2.5 py-1 rounded-md">
              {selectedTicketIds.size} Tickets Selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Change Status */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg">
              <span className="text-[11px] text-slate-300">Move to:</span>
              <select
                value={bulkStatusId}
                onChange={(e) => setBulkStatusId(e.target.value)}
                className="bg-slate-900 text-white text-xs border border-slate-700 rounded px-2 py-0.5"
              >
                <option value="">Select Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkChangeStatus}
                disabled={!bulkStatusId}
                className="text-xs h-7 px-2 py-0"
              >
                Apply
              </Button>
            </div>

            {/* Export Selected */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelectedCsv}
              className="text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 h-8"
            >
              Export Selected
            </Button>

            {/* Bulk Delete */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleting(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs h-8"
            >
              Delete
            </Button>

            <button
              type="button"
              onClick={() => setSelectedTicketIds(new Set())}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-slate-400" />}
          title={hasActiveFilters ? 'No Tickets Match Filter' : 'No Tickets Found'}
          description={
            hasActiveFilters
              ? 'Try modifying or clearing your filters.'
              : 'Create a ticket to start tracking tasks and workflow.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Ticket'}
          onAction={hasActiveFilters ? clearFilters : () => setIsTicketFormOpen(true)}
        />
      ) : (
        <Card className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold select-none">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredTickets.length > 0 &&
                        selectedTicketIds.size === filteredTickets.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Ticket ID</th>
                  <th className="py-3 px-3">Title</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => {
                  const isChecked = selectedTicketIds.has(t.id);
                  const prio = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                  const statColor = t.status?.name ? STATUS_COLORS[t.status.name] : null;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isChecked ? 'bg-slate-50/90' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(t.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {t.ticket_number}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 max-w-sm">
                        <div
                          onClick={() => setActiveTicketForDetails(t)}
                          className="cursor-pointer hover:underline truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {t.category ? (
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {t.category.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                            statColor
                              ? `${statColor.bg} ${statColor.text} ${statColor.border}`
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.status?.name || 'Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${prio.bg} ${prio.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                          {prio.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveTicketForDetails(t)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTicket(t);
                              setIsTicketFormOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="Edit ticket"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ticket Details Drawer */}
      <TicketDetails
        isOpen={Boolean(activeTicketForDetails)}
        ticket={activeTicketForDetails}
        statuses={statuses}
        categories={categories}
        onClose={() => setActiveTicketForDetails(null)}
        onEdit={(ticket) => {
          setActiveTicketForDetails(null);
          setEditingTicket(ticket);
          setIsTicketFormOpen(true);
        }}
        onDelete={async (ticketId) => {
          await ticketService.deleteTicket(ticketId);
          setActiveTicketForDetails(null);
          await loadData();
        }}
        onStatusChange={async (ticketId, newStatusId) => {
          await ticketService.moveTicketStatus(ticketId, newStatusId);
          await loadData();
        }}
        onRefreshTicket={async (ticketId) => {
          const updated = await ticketService.getTicketById(ticketId);
          if (updated) setActiveTicketForDetails(updated);
          await loadData();
        }}
      />

      {/* Ticket Create / Edit Modal */}
      <TicketForm
        isOpen={isTicketFormOpen}
        onClose={() => {
          setIsTicketFormOpen(false);
          setEditingTicket(null);
        }}
        onSubmit={async (formData) => {
          if (editingTicket) {
            await ticketService.updateTicket(editingTicket.id, formData);
          } else {
            await ticketService.createTicket(formData);
          }
          await loadData();
        }}
        projects={projects}
        statuses={statuses}
        categories={categories}
        initialData={editingTicket}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleting}
        onClose={() => setIsBulkDeleting(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedTicketIds.size} Selected Tickets`}
        message="Are you sure you want to delete the selected tickets? Their attachments and history logs will be permanently removed."
        confirmLabel="Delete Selected"
      />
    </div>
  );
};
