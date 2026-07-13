# Phase 1 — Fluent UI Chat Frontend (Vite + React + TS)

Frontend only. No backend calls, no Firebase/Supabase. All data comes from an in-memory mock behind a typed service layer that you can later swap for your Django API.

## Stack conversion

Replace the current TanStack Start scaffold with a plain Vite React SPA:

- Remove: `src/router.tsx`, `src/routes/`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`, TanStack Start/Router deps, TanStack-specific Vite plugins.
- Add: `react-router-dom` v6, `@fluentui/react-components`, `@fluentui/react-icons`, `@griffel/react`.
- New entry: `index.html` + `src/main.tsx` + `src/App.tsx` with `BrowserRouter`.
- Keep Tailwind out of the app. Replace `src/styles.css` with a minimal reset only (html/body/#root sizing, focus-visible). All component styling uses Fluent `makeStyles` + `tokens`.

## Phase 1 scope

Screens:

1. Welcome / Landing
2. Register
3. Sign in
4. Forgot password (email → confirmation)
5. Reset password (new password form)
6. Main Chat Workspace (3-pane desktop, drawer on mobile)
7. New Conversation (dialog: search users, DM or group)

Cross-cutting:

- Light/dark theme toggle (persisted to `localStorage`)
- Responsive from 375px → desktop
- Loading skeletons, empty states, error states, offline/reconnecting banner, failed-message retry, toasts, confirmation dialogs, disabled/permission-locked controls
- Accessible names on icon-only buttons, `relationship` on every Tooltip, `Field` wrapper on form controls, keyboard nav + visible focus

Chat features included in Phase 1:

- Send / edit / delete / reply
- Emoji reactions
- Text + image + document attachments with preview and upload-progress UI
- Delivered/read states, typing indicators, presence, last-seen
- Optimistic send with failed/retry
- Date separators, unread divider, infinite scroll upward
- Search conversations in the sidebar
- Unread badges, last-message previews
- Copy message text, mention users in groups
- Pin / mute / archive conversation (UI + mock state)

Deferred to Phase 2: full User Profile page, Account Settings, Group Details, global Search page, forwarding, browser notifications, shared-media summary, block, admin promote/demote flows.

## File layout

```text
index.html
src/
  main.tsx
  App.tsx                      # Router + FluentProvider + theme context
  providers/
    ThemeProvider.tsx          # light/dark toggle, persisted
    AuthProvider.tsx           # mock auth state
    ConnectionProvider.tsx     # online/offline/reconnecting banner state
  routes/
    PublicRoute.tsx
    ProtectedRoute.tsx
  pages/
    LandingPage.tsx
    RegisterPage.tsx
    SignInPage.tsx
    ForgotPasswordPage.tsx
    ResetPasswordPage.tsx
    ChatPage.tsx               # 3-pane workspace shell
  features/chat/
    ConversationSidebar.tsx
    ConversationListItem.tsx
    ConversationSearch.tsx
    ChatHeader.tsx
    MessageTimeline.tsx
    MessageGroup.tsx
    MessageBubble.tsx
    MessageActions.tsx         # edit/delete/reply/react/copy
    ReactionBar.tsx
    TypingIndicator.tsx
    DateSeparator.tsx
    UnreadDivider.tsx
    Composer.tsx
    AttachmentPreview.tsx
    UploadProgress.tsx
    EmptyConversation.tsx
    NewConversationDialog.tsx
    MentionPopover.tsx
  components/
    AppShell.tsx               # responsive 3-pane / drawer switch
    ThemeToggle.tsx
    PresenceDot.tsx
    Avatar.tsx                 # wraps Fluent Persona/Avatar
    Skeletons.tsx
    OfflineBanner.tsx
    ConfirmDialog.tsx
    Toaster.tsx                # wraps Fluent Toast primitives
    IconButtonWithLabel.tsx
  services/
    types.ts                   # Domain types + service interfaces
    auth/
      AuthService.ts           # interface
      MockAuthService.ts
    chat/
      ChatService.ts           # interface
      MockChatService.ts
    users/
      UserService.ts
      MockUserService.ts
    index.ts                   # DI: exports singletons; swap here for Django impl later
  hooks/
    useAuth.ts
    useConversations.ts
    useMessages.ts             # optimistic send, infinite scroll
    usePresence.ts
    useTyping.ts
    useMediaQuery.ts
    useToast.ts
  mocks/
    seed.ts                    # seed users, conversations, messages
  styles/
    reset.css                  # minimal only
    tokens.ts                  # spacing/typography helpers built on Fluent tokens
  utils/
    date.ts                    # relative time, date-separator grouping
    validation.ts              # email/password/username rules
```

## Routing

- `/` Landing
- `/register`, `/signin`, `/forgot-password`, `/reset-password`
- `/chat` and `/chat/:conversationId` (protected)
- Unknown → 404 page

Protected routes redirect to `/signin` when `AuthProvider` has no session.

## Service layer contract

`services/types.ts` defines:

- `User`, `Presence`, `Conversation` (dm | group), `Message`, `Reaction`, `Attachment`, `MessageStatus` ('sending' | 'sent' | 'delivered' | 'read' | 'failed').
- Interfaces: `AuthService` (signIn/signUp/signOut/requestReset/resetPassword/getCurrentUser), `ChatService` (listConversations, getMessages(paged), sendMessage(optimistic), editMessage, deleteMessage, react, setTyping, markRead, pin/mute/archive, createConversation), `UserService` (searchUsers, getUser).
- All methods return `Promise<T>`; mocks add small artificial latency and can simulate failures for testing failed/retry UI.
- `services/index.ts` exports concrete instances. Swapping to Django = replace those exports with fetch-based implementations of the same interfaces; no component changes.

## Theming & styling

- `FluentProvider` at the root with `webLightTheme` / `webDarkTheme` chosen by `ThemeProvider`.
- Every component uses `makeStyles` + `tokens` (colors, spacing, typography, radii, shadows). No hex, no Tailwind, no arbitrary px.
- Fluent typography components (`Title1/2/3`, `Body1`, `Caption1`, etc.) instead of raw text sizes.

## Responsive layout

- ≥1024px: three panes (sidebar | timeline | details slot reserved but hidden in Phase 1).
- 768–1023px: two panes (sidebar | timeline).
- <768px: one pane at a time; sidebar becomes a Fluent `Drawer`; back button in header returns to list.

## Interface states covered in Phase 1

Skeletons for conversation list and message timeline; empty conversation list; empty message history; offline/reconnecting banner (driven by `navigator.onLine` + `ConnectionProvider`); failed message with retry action; attachment upload failure with retry; auth + form validation errors via `Field` `validationState`; confirmation dialogs for delete message / leave conversation; toasts for successful actions (message copied, conversation created); disabled controls while sending/offline.

## Out of scope for Phase 1 (Phase 2 plan will follow)

User Profile page, Account Settings, Group Details, global Search page, forwarding, browser notifications, shared-media summary, block user, admin promote/demote, delete-account flow.

## Verification before finishing Phase 1

- `bun run build` and typecheck clean.
- Manual pass on desktop + 375px mobile viewport in preview: auth flows, send/edit/delete/react/reply, optimistic + failed retry, upload progress + failure, offline banner toggling, theme toggle persists, keyboard nav reaches every control with visible focus.
