import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CheckCircle2, Clock, Eye, Layers, Upload, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Project, Ticket, ProjectStats } from '../../types';

export interface ProjectOverviewProps {
  project: Project;
  stats: ProjectStats;
  recentTickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenReport: () => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  stats,
  recentTickets,
  onSelectTicket,
  onOpenReport,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Tickets</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalTickets}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">In this project</span>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Tickets</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-sky-700">{stats.activeTickets}</p>
          <span className="text-[11px] text-sky-600/80 mt-1 block">Work in progress</span>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Under Review</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.underReviewTickets}</p>
          <span className="text-[11px] text-amber-600/80 mt-1 block">Awaiting sign-off</span>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Uploaded</span>
            <Upload className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.uploadedTickets}</p>
          <span className="text-[11px] text-purple-600/80 mt-1 block">Final delivered</span>
        </Card>

        <Card className="p-4 bg-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{stats.completionPercentage}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Charts & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution Chart */}
        <Card className="p-5 lg:col-span-7 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Status Distribution</h3>
              <p className="text-xs text-slate-400">Current ticket count per workflow stage</p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenReport} className="text-xs">
              View Report
            </Button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.statusDistribution}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="statusName"
                  stroke="#94a3b8"
                  fontSize={11}
                  interval={0}
                  tick={{ fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  allowDecimals={false}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val: any) => [`${val ?? 0} tickets`, 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Tickets & Activity */}
        <Card className="p-5 lg:col-span-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-900">Recent Tickets</h3>
              <span className="text-xs text-slate-400">{recentTickets.length} items</span>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No tickets in this project yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTickets.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-mono font-semibold text-slate-700">
                          {t.ticket_number}
                        </span>
                        <Badge variant="slate" className="text-[10px] py-0 px-1.5">
                          {t.status?.name || 'Status'}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-800 truncate">{t.title}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Project: {project.name}</span>
            <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
