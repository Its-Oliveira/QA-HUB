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

export const jiraCards: JiraCard[] = [
  { id: "1", key: "QA-102", title: "Auth Flow Regression", description: "Verification of JWT token expiration logic across microservices. Intermittent failures on staging-beta.", status: "Em Revisão QA", priority: "HIGH", assignee: "Leonardo Tadeu", assigneeAvatar: "LT", updatedAt: "2025-04-12T10:00:00Z", timeIndicator: "48h" },
  { id: "2", key: "QA-105", title: "Payment Gateway Sandbox", description: "Validate Stripe integration for European SEPA transactions. Pending response from dev-team.", status: "Em Revisão QA", priority: "MEDIUM", assignee: "Ana Silva", assigneeAvatar: "AS", updatedAt: "2025-04-11T14:30:00Z", timeIndicator: "03h" },
  { id: "3", key: "QA-108", title: "Mobile Responsiveness UI", description: "Safari-only alignment issues in the checkout drawer component. Visual regression suite running.", status: "Em Revisão QA", priority: "LOW", assignee: "Carlos Mendes", assigneeAvatar: "CM", updatedAt: "2025-04-10T09:15:00Z", timeIndicator: "2h" },
  { id: "4", key: "QA-110", title: "Legacy Browser Support", description: "Resolution Strategy: Manual sanity check on IE11 fallback layers.", status: "Backlog", priority: "LOW", assignee: "Leonardo Tadeu", assigneeAvatar: "LT", updatedAt: "2025-04-09T16:00:00Z" },
  { id: "5", key: "QA-112", title: "API Schema Validation", description: "Resolution Strategy: Automated script deployment for Swagger contract testing.", status: "Backlog", priority: "HIGH", assignee: "Ana Silva", assigneeAvatar: "AS", updatedAt: "2025-04-08T11:00:00Z" },
  { id: "6", key: "QA-115", title: "Accessibility Audit v2", description: "Resolution Strategy: Screen reader simulation across new dashboard modules.", status: "Backlog", priority: "MEDIUM", assignee: "Carlos Mendes", assigneeAvatar: "CM", updatedAt: "2025-04-07T08:45:00Z" },
  { id: "7", key: "QA-120", title: "Database Migration Tests", description: "Validate data integrity after PostgreSQL 15 migration. Check foreign key constraints.", status: "Em Produção", priority: "HIGH", assignee: "Leonardo Tadeu", assigneeAvatar: "LT", updatedAt: "2025-04-06T12:00:00Z" },
  { id: "8", key: "QA-122", title: "SSO Integration Tests", description: "End-to-end testing of SAML 2.0 single sign-on flow with Azure AD.", status: "Em Produção", priority: "MEDIUM", assignee: "Ana Silva", assigneeAvatar: "AS", updatedAt: "2025-04-05T15:30:00Z" },
];

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

export const initialReminders: Reminder[] = [
  { id: "1", title: "Review QA-102 test results", description: "Check JWT token expiration test results on staging", dueDate: "2025-04-13T10:00:00Z", category: "Review", priority: "HIGH", completed: false, jiraCardRef: "QA-102" },
  { id: "2", title: "Create card for login bug", description: "Document the intermittent login failure on mobile", dueDate: "2025-04-14T14:00:00Z", category: "Create Card", priority: "MEDIUM", completed: false },
  { id: "3", title: "Run regression suite", description: "Execute full regression on staging before release", dueDate: "2025-04-12T09:00:00Z", category: "Test Task", priority: "HIGH", completed: true },
];

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

export const initialTests: TestEntry[] = [
  { id: "1", name: "Checkout Flow E2E", featureDescription: "Complete checkout flow including cart, address, payment and confirmation", status: "Em andamento", environment: "staging", updatedAt: "2025-04-12T10:00:00Z", documentation: "## Test Plan\n\n1. Add items to cart\n2. Fill shipping address\n3. Select payment method\n4. Confirm order\n\n**Expected:** Order confirmation with correct total", links: ["https://docs.example.com/checkout"] },
  { id: "2", name: "User Registration Validation", featureDescription: "Form validation for all registration fields including email format and password strength", status: "Concluído", environment: "prod", updatedAt: "2025-04-11T14:30:00Z", documentation: "All validations passing. Edge cases covered.", links: [] },
  { id: "3", name: "Dashboard Performance", featureDescription: "Load time and rendering performance for main dashboard with 1000+ records", status: "Bloqueado", environment: "dev", updatedAt: "2025-04-10T09:15:00Z", documentation: "**Blocked:** Waiting for test data seeder script from backend team.", links: ["https://jira.example.com/QA-99"] },
  { id: "4", name: "Search Autocomplete", featureDescription: "Typeahead search with debounce and result highlighting", status: "Não iniciado", environment: "staging", updatedAt: "2025-04-09T16:00:00Z", documentation: "", links: [] },
];

export interface AutomationEntry {
  id: string;
  feature: string;
  testFile: string;
  status: "Automated" | "In Progress" | "Pending";
  lastRunDate: string;
  notes: string;
}

export const initialAutomation: AutomationEntry[] = [
  { id: "1", feature: "Login Flow", testFile: "cypress/e2e/login.cy.ts", status: "Automated", lastRunDate: "2025-04-12", notes: "Includes SSO and 2FA flows" },
  { id: "2", feature: "Checkout Process", testFile: "cypress/e2e/checkout.cy.ts", status: "In Progress", lastRunDate: "2025-04-10", notes: "Payment step pending" },
  { id: "3", feature: "User Profile", testFile: "cypress/e2e/profile.cy.ts", status: "Automated", lastRunDate: "2025-04-11", notes: "" },
  { id: "4", feature: "Search & Filters", testFile: "cypress/e2e/search.cy.ts", status: "Pending", lastRunDate: "", notes: "Waiting for API stabilization" },
  { id: "5", feature: "Dashboard Widgets", testFile: "cypress/e2e/dashboard.cy.ts", status: "In Progress", lastRunDate: "2025-04-09", notes: "Charts rendering tests" },
  { id: "6", feature: "Notifications", testFile: "cypress/e2e/notifications.cy.ts", status: "Pending", lastRunDate: "", notes: "" },
];
