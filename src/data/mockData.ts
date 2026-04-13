export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
}

export const users: User[] = [
  { id: "1", name: "Leonardo Tadeu", email: "leonardo@qahub.com", password: "admin123", avatar: "LT" },
  { id: "2", name: "Ana Silva", email: "ana@qahub.com", password: "admin123", avatar: "AS" },
  { id: "3", name: "Carlos Mendes", email: "carlos@qahub.com", password: "admin123", avatar: "CM" },
];

export type CardStatus = "Backlog" | "Em Revisão QA" | "Em Produção";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface JiraCard {
  id: string;
  key: string;
  title: string;
  description: string;
  status: CardStatus;
  priority: Priority;
  assignee: string;
  assigneeAvatar: string;
  updatedAt: string;
  timeIndicator?: string;
}

export const jiraCards: JiraCard[] = [];

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  category: "Create Card" | "Test Task" | "Review" | "Other";
  priority: Priority;
  completed: boolean;
  jiraCardRef?: string;
}

export const initialReminders: Reminder[] = [];

export type TestStatus = "Não iniciado" | "Em andamento" | "Bloqueado" | "Concluído";
export type Environment = "staging" | "dev" | "prod";

export interface TestEntry {
  id: string;
  name: string;
  featureDescription: string;
  status: TestStatus;
  environment: Environment;
  updatedAt: string;
  documentation: string;
  links: string[];
}

export const initialTests: TestEntry[] = [];

export interface AutomationEntry {
  id: string;
  feature: string;
  testFile: string;
  status: "Automated" | "In Progress" | "Pending";
  lastRunDate: string;
  notes: string;
}

export const initialAutomation: AutomationEntry[] = [];
