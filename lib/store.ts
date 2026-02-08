import { Project, ScheduleItem, Message, ScheduleItemStatus, DailyLog, WeatherCondition, ParsedLogData } from '@/types/models';
import { seedProjects, seedScheduleItems, seedMessages, seedDailyLogs } from './seedData';

// Storage keys
const KEYS = {
  projects: 'constructionglue-projects',
  scheduleItems: 'constructionglue-schedule-items',
  messages: 'constructionglue-messages',
  readTimestamps: 'constructionglue-read-timestamps',
  dailyLogs: 'constructionglue-daily-logs',
  initialized: 'constructionglue-initialized-v2',
};

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined';

// Initialize store with seed data if empty
export function initializeStore(): void {
  if (!isBrowser) return;

  const isInitialized = localStorage.getItem(KEYS.initialized);
  if (!isInitialized) {
    localStorage.setItem(KEYS.projects, JSON.stringify(seedProjects));
    localStorage.setItem(KEYS.scheduleItems, JSON.stringify(seedScheduleItems));
    localStorage.setItem(KEYS.messages, JSON.stringify(seedMessages));
    localStorage.setItem(KEYS.dailyLogs, JSON.stringify(seedDailyLogs));
    localStorage.setItem(KEYS.readTimestamps, JSON.stringify({}));
    localStorage.setItem(KEYS.initialized, 'true');
  }
}

// Generic helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  initializeStore();
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ============ PROJECTS ============

export function getProjects(): Project[] {
  return getFromStorage<Project[]>(KEYS.projects, []);
}

export function getProjectById(projectId: string): Project | undefined {
  const projects = getProjects();
  return projects.find(p => p.id === projectId);
}

export function getProjectsForUser(userId: string): Project[] {
  const projects = getProjects();
  return projects.filter(p => p.teamMemberIds.includes(userId));
}

// ============ SCHEDULE ITEMS ============

export function getScheduleItemsForProject(projectId: string): ScheduleItem[] {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  return items
    .filter(item => item.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

export function getScheduleItemById(itemId: string): ScheduleItem | undefined {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  return items.find(item => item.id === itemId);
}

export function createScheduleItem(
  projectId: string,
  title: string,
  dueDate: string,
  description?: string,
  assignedTo?: string
): ScheduleItem {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  const projectItems = items.filter(item => item.projectId === projectId);
  const maxOrder = projectItems.length > 0
    ? Math.max(...projectItems.map(i => i.order))
    : 0;

  const now = new Date().toISOString();
  const newItem: ScheduleItem = {
    id: `schedule-${Date.now()}`,
    projectId,
    title,
    description,
    dueDate,
    status: 'not_started',
    assignedTo,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  items.push(newItem);
  saveToStorage(KEYS.scheduleItems, items);
  return newItem;
}

export function updateScheduleItemStatus(
  itemId: string,
  status: ScheduleItemStatus
): ScheduleItem | undefined {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  const index = items.findIndex(item => item.id === itemId);

  if (index === -1) return undefined;

  items[index] = {
    ...items[index],
    status,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(KEYS.scheduleItems, items);
  return items[index];
}

export function updateScheduleItem(
  itemId: string,
  updates: Partial<Pick<ScheduleItem, 'title' | 'description' | 'dueDate' | 'assignedTo'>>
): ScheduleItem | undefined {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  const index = items.findIndex(item => item.id === itemId);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  saveToStorage(KEYS.scheduleItems, items);
  return items[index];
}

export function deleteScheduleItem(itemId: string): boolean {
  const items = getFromStorage<ScheduleItem[]>(KEYS.scheduleItems, []);
  const index = items.findIndex(item => item.id === itemId);
  if (index === -1) return false;
  items.splice(index, 1);
  saveToStorage(KEYS.scheduleItems, items);
  return true;
}

// ============ MESSAGES ============

export function getMessagesForThread(
  projectId: string,
  scheduleItemId: string | null = null
): Message[] {
  const messages = getFromStorage<Message[]>(KEYS.messages, []);
  return messages
    .filter(msg =>
      msg.projectId === projectId &&
      msg.scheduleItemId === scheduleItemId
    )
    .sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function createMessage(
  projectId: string,
  scheduleItemId: string | null,
  authorId: string,
  authorName: string,
  authorRole: string,
  content: string
): Message {
  const messages = getFromStorage<Message[]>(KEYS.messages, []);

  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    projectId,
    scheduleItemId,
    authorId,
    authorName,
    authorRole: authorRole as Message['authorRole'],
    content,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  saveToStorage(KEYS.messages, messages);
  return newMessage;
}

// ============ READ TRACKING ============

type ReadTimestamps = Record<string, string>; // threadKey -> ISO timestamp

function getThreadKey(projectId: string, scheduleItemId: string | null): string {
  return scheduleItemId
    ? `${projectId}:${scheduleItemId}`
    : `${projectId}:general`;
}

export function getLastReadTimestamp(
  userId: string,
  projectId: string,
  scheduleItemId: string | null = null
): string | null {
  const allTimestamps = getFromStorage<Record<string, ReadTimestamps>>(
    KEYS.readTimestamps,
    {}
  );
  const userTimestamps = allTimestamps[userId] || {};
  const threadKey = getThreadKey(projectId, scheduleItemId);
  return userTimestamps[threadKey] || null;
}

export function markThreadAsRead(
  userId: string,
  projectId: string,
  scheduleItemId: string | null = null
): void {
  const allTimestamps = getFromStorage<Record<string, ReadTimestamps>>(
    KEYS.readTimestamps,
    {}
  );

  if (!allTimestamps[userId]) {
    allTimestamps[userId] = {};
  }

  const threadKey = getThreadKey(projectId, scheduleItemId);
  allTimestamps[userId][threadKey] = new Date().toISOString();

  saveToStorage(KEYS.readTimestamps, allTimestamps);
}

export function getUnreadCountForThread(
  userId: string,
  projectId: string,
  scheduleItemId: string | null = null
): number {
  const lastRead = getLastReadTimestamp(userId, projectId, scheduleItemId);
  const messages = getMessagesForThread(projectId, scheduleItemId);

  if (!lastRead) {
    // Never read - all messages except user's own are unread
    return messages.filter(msg => msg.authorId !== userId).length;
  }

  const lastReadTime = new Date(lastRead).getTime();
  return messages.filter(msg =>
    msg.authorId !== userId &&
    new Date(msg.createdAt).getTime() > lastReadTime
  ).length;
}

// ============ DAILY LOGS ============

export function getDailyLogsForProject(projectId: string): DailyLog[] {
  const logs = getFromStorage<DailyLog[]>(KEYS.dailyLogs, []);
  return logs
    .filter(log => log.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDailyLogByDate(projectId: string, date: string): DailyLog | undefined {
  const logs = getFromStorage<DailyLog[]>(KEYS.dailyLogs, []);
  return logs.find(log => log.projectId === projectId && log.date === date);
}

export function upsertDailyLog(
  projectId: string,
  date: string,
  updates: { rawEntry: string; weather?: WeatherCondition; crewCount?: number; visitors?: string }
): DailyLog {
  const logs = getFromStorage<DailyLog[]>(KEYS.dailyLogs, []);
  const index = logs.findIndex(log => log.projectId === projectId && log.date === date);
  const now = new Date().toISOString();

  if (index !== -1) {
    logs[index] = {
      ...logs[index],
      ...updates,
      updatedAt: now,
    };
    saveToStorage(KEYS.dailyLogs, logs);
    return logs[index];
  }

  const newLog: DailyLog = {
    id: `dailylog-${Date.now()}`,
    projectId,
    date,
    rawEntry: updates.rawEntry,
    weather: updates.weather,
    crewCount: updates.crewCount,
    visitors: updates.visitors,
    createdAt: now,
    updatedAt: now,
  };

  logs.push(newLog);
  saveToStorage(KEYS.dailyLogs, logs);
  return newLog;
}

export function updateDailyLogParsedData(
  projectId: string,
  date: string,
  parsedData: ParsedLogData
): DailyLog | undefined {
  const logs = getFromStorage<DailyLog[]>(KEYS.dailyLogs, []);
  const index = logs.findIndex(log => log.projectId === projectId && log.date === date);
  if (index === -1) return undefined;

  logs[index] = {
    ...logs[index],
    parsedData,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(KEYS.dailyLogs, logs);
  return logs[index];
}

// ============ ALL MESSAGES FOR PROJECT ============

export function getAllMessagesForProject(projectId: string): Message[] {
  const messages = getFromStorage<Message[]>(KEYS.messages, [])
  return messages
    .filter(msg => msg.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

// ============ CHANNEL READ TRACKING ============

export function markChannelAsRead(userId: string, projectId: string, channelId: string): void {
  const key = 'constructionglue-channel-read-timestamps'
  const allTimestamps = getFromStorage<Record<string, Record<string, string>>>(key, {})
  if (!allTimestamps[userId]) allTimestamps[userId] = {}
  allTimestamps[userId][`${projectId}:${channelId}`] = new Date().toISOString()
  saveToStorage(key, allTimestamps)
}

export function getChannelLastReadTimestamp(userId: string, projectId: string, channelId: string): string | null {
  const key = 'constructionglue-channel-read-timestamps'
  const allTimestamps = getFromStorage<Record<string, Record<string, string>>>(key, {})
  const userTimestamps = allTimestamps[userId] || {}
  return userTimestamps[`${projectId}:${channelId}`] || null
}

export function getUnreadCountsByChannel(userId: string, projectId: string): Record<string, number> {
  const { detectTags } = require('@/lib/detectTags')
  const { CHANNELS } = require('@/lib/channels')
  const allMessages = getAllMessagesForProject(projectId)
  const key = 'constructionglue-channel-read-timestamps'
  const allTimestamps = getFromStorage<Record<string, Record<string, string>>>(key, {})
  const userTimestamps = allTimestamps[userId] || {}

  const counts: Record<string, number> = {}

  for (const channel of CHANNELS) {
    const channelKey = `${projectId}:${channel.id}`
    const lastRead = userTimestamps[channelKey] || null
    const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0

    let channelMessages: typeof allMessages = []

    if (channel.type === 'general') {
      channelMessages = allMessages.filter(msg => msg.scheduleItemId === null)
    } else if (channel.type === 'tag-filter' || channel.type === 'schedule-view') {
      channelMessages = allMessages.filter(msg => {
        const tags = detectTags(msg.content)
        return tags.some((tag: { id: string }) => channel.tagIds.includes(tag.id))
      })
    } else {
      // navigation channels like daily-log don't have unread counts
      counts[channel.id] = 0
      continue
    }

    counts[channel.id] = channelMessages.filter(msg =>
      msg.authorId !== userId &&
      new Date(msg.createdAt).getTime() > lastReadTime
    ).length
  }

  return counts
}

// ============ RESET ============

export function resetStore(): void {
  if (!isBrowser) return;
  localStorage.removeItem(KEYS.initialized);
  initializeStore();
}
