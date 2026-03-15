// =================================================================
// BILLU'S DIARY: THE CLOUD KERNEL
// =================================================================

// 1. Initialize Supabase
const SUPABASE_URL = 'https://sysgubflyrderrgodztd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ziAs_ghCKVOeseu0fP4Q-w_sOz38oAD';

// THE FIX: We name our instance "supabaseClient" because the CDN library already owns the word "supabase"
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AppDB = {
    session: null,

    // --- AUTHENTICATION ---
    async checkSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        this.session = session;
        return session;
    },

    async register(email, password) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        
        // Supabase returns session as null if they need to verify their email first!
        if (!data.session) {
            return { requiresVerification: true };
        }
        
        // If email verification is off, do the ghost migration instantly
        this.session = data.session;
        await this.pushToCloud(); 
        return { requiresVerification: false };
    },

    async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        this.session = data.session;
        // Pull their cloud data down to this device
        await this.pullFromCloud();
        return data;
    },

    async logout() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        this.session = null;
    },

    async resetPassword(email) {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
    },

    async updatePassword(newPassword) {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    // --- THE SYNC ENGINE ---
    
    // Grabs EVERYTHING in localStorage and throws it to Supabase
    async pushToCloud() {
        if (!this.session) return; // Don't sync if offline/logged out

        // Package the entire state
        const appState = {
            plannerTargets: localStorage.getItem('plannerTargets'),
            plannerCompleted: localStorage.getItem('plannerCompleted'),
            plannerSubjects: localStorage.getItem('plannerSubjects'),
            journalEntries: localStorage.getItem('journalEntries'),
            todoList: localStorage.getItem('todoList'),
            userDisplayName: localStorage.getItem('userDisplayName')
        };

        const { error } = await supabaseClient
            .from('user_data')
            .upsert({ 
                user_id: this.session.user.id, 
                app_state: appState,
                updated_at: new Date().toISOString()
            });

        if (error) console.error("Cloud Sync Failed:", error);
        else console.log("Cloud Sync Successful!");
    },

    // Pulls data from Supabase and injects it into localStorage
    async pullFromCloud() {
        if (!this.session) return;

        const { data, error } = await supabaseClient
            .from('user_data')
            .select('app_state')
            .eq('user_id', this.session.user.id)
            .single();

        if (error || !data) {
            console.log("No cloud data found. Starting fresh.");
            return;
        }

        // Unpack the cloud state into the phone
        const state = data.app_state;
        if (state.plannerTargets) localStorage.setItem('plannerTargets', state.plannerTargets);
        if (state.plannerCompleted) localStorage.setItem('plannerCompleted', state.plannerCompleted);
        if (state.plannerSubjects) localStorage.setItem('plannerSubjects', state.plannerSubjects);
        if (state.journalEntries) localStorage.setItem('journalEntries', state.journalEntries);
        if (state.todoList) localStorage.setItem('todoList', state.todoList);
        if (state.userDisplayName) localStorage.setItem('userDisplayName', state.userDisplayName);

        // Force the UI to refresh with the new data
        if (window.forcePlannerRefresh) window.forcePlannerRefresh();
        if (window.renderTodos) window.renderTodos();
        console.log("Data pulled from cloud successfully.");
    }
};

// Expose it globally so all your tabs can talk to it
window.AppDB = AppDB;

// =================================================================
// THE SILENT WIRETAP (AUTO-SYNC ENGINE)
// =================================================================

// We only care about backing up these specific keys
const SYNC_KEYS = [
    'plannerTargets', 
    'plannerCompleted', 
    'plannerSubjects', 
    'journalEntries', 
    'todoList', 
    'userDisplayName'
];

let syncTimeout = null;

// Intercept EVERY save to localStorage in the entire app
const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
    // 1. Let the app save the data locally instantly (keeps UI fast)
    originalSetItem.apply(this, arguments);

    // 2. If it's one of our crucial cloud keys, wake up the Kernel
    if (SYNC_KEYS.includes(key) && AppDB.session) {
        
        // 3. Debounce: Wait 2 seconds before syncing. 
        // If the user types fast or double-clicks rapidly, we don't spam Supabase!
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            console.log(`Kernel detected change in '${key}'. Syncing to cloud...`);
            AppDB.pushToCloud();
        }, 2000);
    }
};