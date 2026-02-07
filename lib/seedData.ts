import { User, Project, ScheduleItem, Message, DailyLog, ParsedLogData } from '@/types/models';

// Users matching auth credentials
export const seedUsers: User[] = [
  {
    id: 'user_super',
    email: 'supervisor@construction.com',
    name: 'Mike Sullivan',
    role: 'superintendent',
    projectIds: ['project-1'],
  },
  {
    id: 'user_pm',
    email: 'pm@construction.com',
    name: 'Sarah Chen',
    role: 'project_manager',
    projectIds: ['project-1', 'project-2'],
  },
];

// Sample projects
export const seedProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Oakwood Apartments',
    address: '1250 Oakwood Drive, Austin, TX 78701',
    contractNumber: 'OAK-2026-001',
    status: 'active',
    startDate: '2026-01-15',
    endDate: '2026-08-30',
    teamMemberIds: ['user_super', 'user_pm'],
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-28T14:30:00.000Z',
  },
  {
    id: 'project-2',
    name: 'Downtown Office Remodel',
    address: '500 Congress Ave, Suite 200, Austin, TX 78701',
    contractNumber: 'DTO-2026-042',
    status: 'active',
    startDate: '2026-02-01',
    endDate: '2026-05-15',
    teamMemberIds: ['user_pm'],
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-01-30T11:00:00.000Z',
  },
];

// Sample schedule items across projects
export const seedScheduleItems: ScheduleItem[] = [
  {
    id: 'schedule-1',
    projectId: 'project-1',
    title: 'Foundation Pouring',
    description: 'Complete foundation pour for Building A',
    dueDate: '2026-02-15',
    status: 'completed',
    assignedTo: 'user_super',
    order: 1,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-02-14T16:00:00.000Z',
  },
  {
    id: 'schedule-2',
    projectId: 'project-1',
    title: 'Framing - Building A',
    description: 'Complete structural framing for Building A',
    dueDate: '2026-03-01',
    status: 'in_progress',
    assignedTo: 'user_super',
    order: 2,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  },
  {
    id: 'schedule-3',
    projectId: 'project-1',
    title: 'Electrical Rough-In',
    description: 'Install electrical wiring before drywall',
    dueDate: '2026-03-20',
    status: 'not_started',
    assignedTo: 'user_pm',
    order: 3,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'schedule-4',
    projectId: 'project-2',
    title: 'Demolition Phase',
    description: 'Remove existing walls and fixtures',
    dueDate: '2026-02-10',
    status: 'at_risk',
    assignedTo: 'user_pm',
    order: 1,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-02-05T14:00:00.000Z',
  },
  {
    id: 'schedule-5',
    projectId: 'project-2',
    title: 'HVAC Installation',
    description: 'Install new HVAC system',
    dueDate: '2026-03-01',
    status: 'blocked',
    assignedTo: 'user_pm',
    order: 2,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-02-08T09:00:00.000Z',
  },
];

// Sample messages (General thread and schedule item comments)
export const seedMessages: Message[] = [
  {
    id: 'msg-1',
    projectId: 'project-1',
    scheduleItemId: null, // General thread
    authorId: 'user_super',
    authorName: 'Mike Sullivan',
    authorRole: 'superintendent',
    content: 'Team, we need to finalize the concrete supplier by end of week. Any concerns?',
    createdAt: '2026-01-28T09:00:00.000Z',
  },
  {
    id: 'msg-2',
    projectId: 'project-1',
    scheduleItemId: null, // General thread
    authorId: 'user_pm',
    authorName: 'Sarah Chen',
    authorRole: 'project_manager',
    content: 'I\'ve reviewed the bids. Summit Concrete has the best price and timeline. Recommending we go with them.',
    createdAt: '2026-01-28T10:30:00.000Z',
  },
  {
    id: 'msg-3',
    projectId: 'project-1',
    scheduleItemId: 'schedule-2', // Comment on Framing task
    authorId: 'user_super',
    authorName: 'Mike Sullivan',
    authorRole: 'superintendent',
    content: 'Framing crew arrived this morning. We\'re on track to finish ahead of schedule.',
    createdAt: '2026-02-20T08:00:00.000Z',
  },
  {
    id: 'msg-4',
    projectId: 'project-2',
    scheduleItemId: null, // General thread
    authorId: 'user_pm',
    authorName: 'Sarah Chen',
    authorRole: 'project_manager',
    content: 'Downtown project kickoff meeting scheduled for Monday 9am. Please confirm attendance.',
    createdAt: '2026-01-30T14:00:00.000Z',
  },
  {
    id: 'msg-5',
    projectId: 'project-2',
    scheduleItemId: 'schedule-5', // Comment on HVAC task
    authorId: 'user_pm',
    authorName: 'Sarah Chen',
    authorRole: 'project_manager',
    content: 'HVAC is blocked waiting on demo completion. Need to expedite demo to unblock this.',
    createdAt: '2026-02-08T09:00:00.000Z',
  },
];

// Sample daily logs
export const seedDailyLogs: DailyLog[] = [
  {
    id: 'dailylog-1',
    projectId: 'project-1',
    date: '2026-02-03',
    rawEntry: 'Cloudy morning, cleared up by noon. Had 14 guys on site today - 4 from Martinez Electric doing rough-in on 2nd floor, 10 from our crew on framing. Got the east wall of Building A framed out, ahead of schedule. Inspector came by around 2pm, passed the foundation work on units 101-104. Still waiting on the steel delivery for the lintels, supposed to be here tomorrow. Called the supplier twice, they said it shipped Monday. Mike from the GC stopped by asking about the roof timeline - told him we need the steel first.',
    weather: 'Cloudy',
    crewCount: 14,
    visitors: 'Building inspector, Mike from GC',
    parsedData: {
      weather: { condition: 'Cloudy', details: 'Cloudy morning, cleared up by noon' },
      crew: [
        { company: 'Martinez Electric', count: 4, role: 'Electrical rough-in' },
        { company: 'Own crew', count: 10, role: 'Framing' },
      ],
      inspections: [
        { inspector: 'Building inspector', area: 'Foundation - units 101-104', result: 'Passed', details: 'Came by around 2pm' },
      ],
      deliveries: [
        { material: 'Steel lintels', status: 'Pending', details: 'Supposed to arrive tomorrow, supplier says shipped Monday' },
      ],
      delays: [
        { issue: 'Waiting on steel delivery for lintels', impact: 'Blocking roof timeline' },
      ],
      workCompleted: [
        { description: 'East wall of Building A framed out', location: 'Building A', scheduleItemId: 'schedule-2', scheduleItemTitle: 'Framing - Building A' },
        { description: 'Electrical rough-in on 2nd floor', location: '2nd floor', scheduleItemId: 'schedule-3', scheduleItemTitle: 'Electrical Rough-In' },
      ],
    },
    createdAt: '2026-02-03T16:30:00.000Z',
    updatedAt: '2026-02-03T16:45:00.000Z',
  },
  {
    id: 'dailylog-2',
    projectId: 'project-1',
    date: '2026-02-04',
    rawEntry: 'Cold start this morning, 38 degrees at 7am. Steel finally showed up at 9:30, two hours late. Had to reorganize the crew while we waited. Put 6 guys on interior cleanup and material staging. Once steel arrived we got the lintels set on units 101 and 102. Framing crew finished the north wall sections. Had a safety meeting at lunch - reminded everyone about fall protection on the scaffolding. No incidents today. Plumber is scheduled for Thursday to start rough-in. Need to confirm with Sarah about the permit status for Building B.',
    weather: 'Cold',
    crewCount: 12,
    visitors: '',
    parsedData: {
      weather: { condition: 'Cold', details: '38 degrees at 7am' },
      crew: [
        { company: 'Own crew', count: 12 },
      ],
      deliveries: [
        { material: 'Steel lintels', status: 'Delivered', details: 'Arrived at 9:30, two hours late' },
      ],
      delays: [
        { issue: 'Steel delivery 2 hours late', impact: 'Had to reorganize crew, put 6 on interior cleanup while waiting' },
        { issue: 'Permit status for Building B unknown', impact: 'Need to confirm with Sarah' },
      ],
      workCompleted: [
        { description: 'Lintels set on units 101 and 102', location: 'Units 101-102' },
        { description: 'North wall sections framed', scheduleItemId: 'schedule-2', scheduleItemTitle: 'Framing - Building A' },
        { description: 'Interior cleanup and material staging', location: 'Interior' },
        { description: 'Safety meeting - fall protection on scaffolding' },
      ],
    },
    createdAt: '2026-02-04T17:00:00.000Z',
    updatedAt: '2026-02-04T17:15:00.000Z',
  },
];
