export type Role = 'superintendent' | 'project_manager' | 'foreman' | 'subcontractor';

export type ProjectStatus = 'active' | 'completed' | 'on_hold';

export type ScheduleItemStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk' | 'blocked';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  projectIds: string[];
}

export interface Project {
  id: string;
  name: string;
  address: string;
  contractNumber: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  teamMemberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: ScheduleItemStatus;
  assignedTo?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type WeatherCondition = 'Clear' | 'Cloudy' | 'Rain' | 'Snow' | 'Hot' | 'Cold';

export interface ParsedLogData {
  weather?: { condition: string; details: string };
  crew?: { company: string; count: number; role?: string }[];
  deliveries?: { material: string; status: string; details: string }[];
  inspections?: { inspector: string; area: string; result: string; details: string }[];
  delays?: { issue: string; impact: string }[];
  workCompleted?: { description: string; location?: string; scheduleItemId?: string; scheduleItemTitle?: string }[];
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  rawEntry: string;
  weather?: WeatherCondition;
  crewCount?: number;
  visitors?: string;
  parsedData?: ParsedLogData;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  scheduleItemId: string | null;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  createdAt: string;
}
