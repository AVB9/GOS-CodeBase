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
