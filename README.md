# Kanso Projects — Personal Project & Ticket Management Workspace

A lightweight, high-performance personal workspace designed specifically for solo engineers, independent builders, and consultants to manage software projects, track issues, and visualize progress using an intuitive Kanban workflow.

---

## 🚀 Core Features

- **Personalized Project Management**: Create and track multiple projects with automated progress calculation and health metrics.
- **Visual Kanban Board**:
  - Drag-and-drop tickets smoothly between status columns (`@dnd-kit/core`).
  - Strict status progression: `Just Written` → `In Progress` → `Under Review` → `Changes Required` → `Completed` → `Uploaded`.
  - The **Uploaded** status is strictly final (`is_final = true`) and anchored as the last column.
- **Categorization & Custom Taxonomy**:
  - Default categories: `UI/UX`, `Frontend`, `Backend`, `Database`, `Content`, `Testing`, `MobileApp frontend`, `Mobile app backend`, `Other`.
  - Add custom categories dynamically at runtime without modifying code.
- **File Attachments & Artifact Storage**:
  - Supports `PNG`, `JPG`, `PDF`, `DOCX`, `XLSX`, `ZIP`, `TXT` up to 25MB each.
  - Stored in Supabase Storage under `projects/{projectId}/tickets/{ticketId}/{filename}`.
  - In-app image and text preview, instant downloads, and deletion with confirmation.
- **Auditable Ticket History**:
  - Chronological timeline tracking status movements, priority changes, renames, and file uploads.
- **Search, Filters & Multi-Select**:
  - Fast search across ticket ID, title, description, and notes.
  - Multi-attribute filtering (Status, Category, Priority, Date ranges).
  - Bulk actions: batch status change, batch export, batch delete.
- **Independent Project Reports**:
  - Instant generation of status distribution and ticketing reports.
  - One-click export to **PDF**, **Excel (.xlsx)**, **CSV**, and **JSON**.
- **Dual-Mode Persistence**:
  - Direct integration with **Supabase PostgreSQL & Storage**.
  - Built-in zero-latency local persistent fallback (IndexedDB / localStorage) that works offline and survives page refreshes permanently.
- **Solo-Focused UX**:
  - Excludes unwanted team clutter (no assignees, story points, sprint planning, or approval chains).

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend & Database**: Supabase PostgreSQL (with Row Level Security)
- **Authentication**: Supabase Auth (Sign Up, Login, Forgot Password, Reset Password)
- **File Storage**: Supabase Storage (`project-files` bucket)
- **Drag-and-Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Charts & Analytics**: Recharts
- **Forms & Validation**: React Hook Form, Zod
- **Report Exports**: jsPDF, jspdf-autotable, SheetJS (xlsx)
- **Routing**: React Router DOM v7
- **Server State**: TanStack Query

---

## 📁 Folder Structure

```
├── supabase/
│   └── migrations/
│       └── 20260928_initial_schema.sql  # Supabase schema, RLS, & bucket setup
├── src/
│   ├── components/                     # Reusable UI primitives (Button, Modal, Card, Input, FileUpload, etc.)
│   ├── config/                         # Centralized statuses & categories configuration
│   │   ├── ticketStatuses.ts
│   │   └── ticketCategories.ts
│   ├── features/
│   │   ├── projects/                   # Project cards, forms, overview analytics, and service
│   │   ├── tickets/                    # Ticket card, Kanban board, details drawer, form, and service
│   │   └── reports/                    # Report preview modal, PDF/Excel/CSV/JSON export utilities
│   ├── pages/                          # Page components (Dashboard, Projects, Board, All Tickets, Files, Reports, Settings, Auth)
│   ├── services/                       # Database & API connectors
│   │   ├── supabaseClient.ts           # Supabase client initializer
│   │   ├── storageService.ts           # File storage upload/download handler
│   │   ├── localStore.ts               # Relational local persistent database engine
│   │   ├── statusService.ts            # Status workflow service
│   │   ├── categoryService.ts          # Category taxonomy service
│   │   ├── historyService.ts           # Audit log service
│   │   └── attachmentService.ts        # Attachment metadata service
│   ├── types/                          # Centralized TypeScript definitions
│   ├── App.tsx                         # Router configuration
│   └── main.tsx                        # Application entry point
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

*Note: You can also configure or test your Supabase connection directly inside the in-app Settings page without restarting the dev server!*

---

## 🗄 Database & Supabase Setup

1. In your Supabase dashboard, navigate to the **SQL Editor**.
2. Run the migration script located at `supabase/migrations/20260928_initial_schema.sql`.
3. This creates:
   - `users`, `projects`, `categories`, `statuses`, `tickets`, `attachments`, `ticket_history`
   - Row Level Security (RLS) policies scoped to authenticated users
   - The `project-files` storage bucket and access policies

---

## 💻 Development & Build Commands

```bash
# Run local development server
npm run dev

# Compile TypeScript and build for production
npm run build

# Run lint / TypeScript type checks
npm run lint
```
