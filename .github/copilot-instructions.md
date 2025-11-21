# OT List - AI Coding Instructions

## Project Overview
OT List is an **Operating Theatre scheduling application** built with React + Vite frontend and PocketBase backend. It manages surgical procedures across multiple operating rooms and dates, with real-time synchronization.

## Architecture

### Frontend Stack
- **React 19** with React Router 7 for routing
- **Vite** for bundling with SWC for fast compilation
- **Tailwind CSS 4** for styling (imported via `@tailwindcss/vite`)
- **Path alias**: `@/` maps to `src/` (configured in `vite.config.js`)

### Backend: PocketBase
- **Embedded BaaS**: PocketBase binary in `./pb/` serves both API and built frontend
- **Schema**: Defined in `pb_schema.json`, migrations in `pb/pb_migrations/`
- **Real-time**: Uses PocketBase realtime subscriptions for live updates
- **Collections**: `users`, `departments`, `operatingRooms`, `otLists`, `otDays`, `procedures`, `patients`, `surgeons`, `procedureComments`

### Data Model Hierarchy
```
departments → otLists → otDays (specific dates)
              └─ operatingRooms (multiple)
                   └─ procedures (ordered list)
                        └─ patients
```

## Key Patterns & Conventions

### 1. Optimistic UI Updates
**Critical pattern**: When creating procedures, use temporary IDs (`tempid-${getTempId()}`) to provide instant feedback before backend confirms.

Example in `procedure-list-context.jsx`:
```jsx
const tempProcedureId = `tempid-${getTempId()}`;
const placeholderProcedure = { id: tempProcedureId, ...data };
dispatchData({ type: "ADD_PROCEDURE", payload: placeholderProcedure });
// Then update with real ID after backend response
```

### 2. Real-time Subscriptions
Always subscribe/unsubscribe to PocketBase collections for live updates:
```jsx
pb.collection("procedures").subscribe("*", (e) => {
  // Handle create/update/delete events
});
// Return cleanup function: () => pb.collection("procedures").unsubscribe()
```

### 3. Reducer-Based State Management
Use reducers for complex state (see `src/reducers/`):
- `procedure-list-reducer.jsx`: Actions include `SET_LIST`, `ADD_PROCEDURE`, `UPDATE_PROCEDURE`, `ADD_UPDATING`, `DONE_UPDATING`, `ADD_FAILED`
- Tracks loading states per item: `updating: []`, `update_failed: []`

### 4. Expanded Relations
Always fetch expanded relations for rich data:
```jsx
const options = {
  expand: "patient,addedBy,procedureDay.otList",
  sort: "+order"
};
```

### 5. Context Providers
Two main contexts wrap the app (see `main.jsx`):
- `AuthContext`: Handles PocketBase authentication with auto-refresh
- `ProcedureListContext`: Manages procedures state, CRUD operations, subscriptions

## Development Workflow

### Running Locally
```powershell
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: PocketBase backend (serves built frontend at ./dist)
npm run pb:serve
```

Frontend runs on `http://localhost:5173`, PocketBase on `http://localhost:8090` (or configured `VITE_PB_BASE_URL`).

### Build & Deploy
```powershell
npm run build
# PocketBase serves static files from ./dist via --publicDir flag
```

### PocketBase Schema Changes
1. Modify `pb_schema.json` manually OR use PocketBase Admin UI
2. Migrations auto-generated in `pb/pb_migrations/`
3. TypeScript types in `pb/pb_data/types.d.ts`

## Code Style & Conventions

### Component Structure
- **Pages**: `src/pages/` - Route components with layout logic
- **Components**: Reusable UI in `src/components/`
- **Modals**: Dialog components in `src/modals/`
- **Forms**: Specialized form components in `src/forms/`

### Imports
Always use `@/` path alias:
```jsx
import { pb } from "@/lib/pb";
import FormField from "@/components/form-field";
```

### Styling
Use `tailwind-merge` for conditional classes:
```jsx
import { twMerge } from "tailwind-merge";
<div className={twMerge("base-classes", condition && "conditional")} />
```

### Error Handling
Wrap PocketBase calls in try-catch and show user-friendly errors via modal components (`error-modal.jsx`, `fatal-error-modal.jsx`).

## Common Tasks

### Adding a New Procedure Field
1. Update `pb_schema.json` → `procedures` collection
2. Update `procedure-form.jsx` to include field
3. Update `procedure-item.jsx` or `procedure-list-editor.jsx` to display
4. Test with real-time updates active

### Authentication
All protected routes require authentication. Use `useAuth()` hook:
```jsx
const { user, isAuthed, login, logout } = useAuth();
```

### Role-Based Access
User roles: `admin`, `doctor`, `receptionist`
- Admins: Full access
- Doctors: Can create/update procedures, OT days
- Receptionists: View-only (check PocketBase rules in `pb_schema.json`)

## Gotchas

1. **StrictMode disabled**: See `main.jsx` - double-mounting caused issues with PocketBase subscriptions
2. **Subscription cleanup**: Always return unsubscribe function from useEffect
3. **Temporary IDs**: Check for `tempid-` prefix when handling procedure updates
4. **Order field**: Procedures have `order` field for manual sorting - handle reordering carefully
5. **Expand syntax**: Use dot notation for nested relations: `procedureDay.otList.department`

## Debugging

- **PocketBase logs**: Terminal running `npm run pb:serve`
- **React DevTools**: Inspect context values for auth/procedure state
- **Network tab**: Watch PocketBase API calls to `/_/` endpoints
- **Real-time events**: Console logs in subscription handlers show live updates
