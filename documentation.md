The Architecture Brief 

1. home.js

    1.0 [GLOBAL ASSETS & DATA]

        Holds the HOME_ASSETS dictionary (greetings, SVG icons, and time-logic). By keeping this at the top, you never have to hunt through functions just to change a word or an icon.

    2.0 [INITIALIZATION]

        The DOMContentLoaded event and the initHomeTab orchestrator. This is the "engine starter."

    3.0 [UI COMPONENTS]

        3.1 [GREETING WIDGET]: Our newly optimized, 10-line greeting and crossfade logic.

        3.2 [GOAL MODAL]: The countdown math (keeping your flawless timezone split-string fix).

        3.3 [STANDBY MODE]: The fullscreen clock and WakeLock hardware API logic.

2. settings.js

    1.0 [UTILITIES]

        Shared helper functions: UI feedback rendering and reusable password input generation.

    2.0 [INITIALIZATION]

        The DOMContentLoaded event and orchestrator function.

    3.0 [APPEARANCE CONTROLLER]

        Handles OLED theme toggles, dynamic CSS variable injection for accent/text colors, and custom background image storage.

    4.0 [SUBJECT MANAGER]

        Handles the custom subject definitions and the double-tap-to-edit logic.

    5.0 [DATA MANAGEMENT]

        Handles local JSON export, import, and factory reset logic.

    6.0 [AUTHENTICATION CONTROLLER]

        Handles Firebase state changes, login/signup toggle logic, and password resets.

3. db.js

    1.0 [FIREBASE KERNEL & CONFIG]

        Holds the core Firebase initialization, offline persistence setup, and the SYNC_CONFIG dictionary that tells the app which keys to track.

    2.0 [AppDB CONTROLLER]

        Holds all authentication methods, the real-time onSnapshot listener, the standard pushToCloud, and our new forcePushToCloud method.

    3.0 [OPTIMISTIC UI SHIELD & WIRETAP]

        The Storage.prototype.setItem interceptor. This detects local changes, raises the UI shield so Firebase doesn't overwrite your typing, and triggers the standard debounced cloud sync.

4. todo.js

1.0 [GLOBAL UTILITIES]
Shared helper functions attached to the window object: the global Toast UI and the Ultimate Completion Checker.
2.0 [INITIALIZATION & STATE]
The DOM elements, core state variables (current date, active folders, selected subjects), and the core data fetchers/savers (getGroups, loadTasks, saveTasks).
3.0 [SCROLL ENGINE (TSE)]
The Native Todo Scroll Engine logic that calculates absolute positions and triggers smooth scrolling for both mobile and desktop.
4.0 [DYNAMIC SUBJECT TRAY]
The true hierarchical sub tray logic (Root level -> Folder level -> Subject selection) and the input focus/blur behaviors.
5.0 [TASK RENDERING]
The core engine that generates the HTML for Mobile lists and Desktop Kanban cards, including the inline double-tap-to-edit logic.
6.0 [DRAG & DROP SYSTEM]
The touch-based flying glass clones for mobile reordering, and the desktop Kanban column dropzone logic.
7.0 [CONTROLS & EVENTS]
The top-level UI controls: adding tasks, date navigation (arrows and date picker), clipboard exporting, and global AppEvents listeners.

5. planner.js

1.0 [GLOBAL UTILITIES]
Shared helper functions attached to the window object (the global Toast UI).
2.0 [INITIALIZATION & STATE]
The DOM elements, core state variables (currentViewDate, activeFolderId), and the exact data fetchers/savers (getGroups, getTargets, saveTargets).
3.0 [CALENDAR MATH ENGINE]
The logic that calculates leap years, start days, overdue states, and generates the massive monthData object.
4.0 [MOBILE RENDERER]
The engine that draws the top mini-calendar, the bottom swiping slider cards, and handles the complex long-press/swipe touch logic.
5.0 [DESKTOP RENDERER]
The engine that draws the Kanban-style desktop grid, calculates the progress bar, and houses the fixed Edit/Add target buttons.
6.0 [DYNAMIC SUBJECT TRAY & MODALS]
The true hierarchical sub tray logic (Root level -> Folder level) shared across both the Mobile Bottom Sheet and the Desktop Edit Modal.
7.0 [CONTROLS & EVENTS]
Month navigation (arrows and swipe), the "Return to Today" button, Home Dashboard widget injection, and AppEvents listeners.
