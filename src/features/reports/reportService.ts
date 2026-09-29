import { Project, Ticket, ProjectReportData } from '../../types';
import { projectService } from '../projects/projectService';
import { ticketService } from '../tickets/ticketService';
import { statusService } from '../../services/statusService';

export const reportService = {
  /**
   * Compile full project report data
   */
  async generateProjectReport(projectId: string, ticketsSubset?: Ticket[]): Promise<ProjectReportData> {
    const project = await projectService.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const statuses = await statusService.getStatuses(projectId);
    const tickets = ticketsSubset || (await ticketService.getTickets(projectId));

    const totalTickets = tickets.length;
    const finalStatusIds = new Set(statuses.filter((s) => s.is_final).map((s) => s.id));
    const uploadedTickets = tickets.filter((t) => finalStatusIds.has(t.status_id)).length;
    const completionPercentage = totalTickets > 0 ? Math.round((uploadedTickets / totalTickets) * 100) : 0;

    const statusCounts: Record<string, number> = {};
    statuses.forEach((st) => {
      statusCounts[st.name] = 0;
    });

    tickets.forEach((t) => {
      const statusName = t.status?.name || statuses.find((s) => s.id === t.status_id)?.name;
      if (statusName) {
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      }
    });

    return {
      project,
      reportGeneratedDate: new Date().toISOString(),
      totalTickets,
      statusCounts,
      completionPercentage,
      tickets,
    };
  },
};
