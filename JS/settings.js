document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
    // Unifying all settings boot sequences into one clean pipeline
    setupProfileSettings();
    setupThemeSettings();
    setupDataManagement();
    setupSubjectManager();
    setupAesthetics();
    initAuthUI();
}

function setupProfileSettings() {
    const nameInput = document.getElementById('settingsNameInput');
    const saveBtn = document.getElementById('saveNameBtn');

    if (!nameInput || !saveBtn) return;

    const savedName = localStorage.getItem('userDisplayName') || 'jiruuuu... :)';
    nameInput.value = savedName === 'jiruuuu... :)' ? '' : savedName;

    saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            localStorage.setItem('userDisplayName', newName);
        } else {
            localStorage.removeItem('userDisplayName'); 
        }
        
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        setTimeout(() => saveBtn.textContent = originalText, 1500);
    });
}

function setupThemeSettings() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const isOLED = localStorage.getItem('themeOLED') === 'true';
    themeToggle.checked = isOLED;
    applyTheme(isOLED);

    themeToggle.addEventListener('change', (e) => {
        const isDarkest = e.target.checked;
        localStorage.setItem('themeOLED', isDarkest);
        applyTheme(isDarkest);
    });
}

function applyTheme(isOLED) {
    if (isOLED) {
        document.documentElement.style.setProperty('--color-bg', '#000000');
        document.documentElement.style.setProperty('--color-surface', '#0a0a0a');
    } else {
        document.documentElement.style.setProperty('--color-bg', '#0a0a0a');
        document.documentElement.style.setProperty('--color-surface', '#1a1a1a');
    }
}

function setupDataManagement() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importDataInput');
    const resetBtn = document.getElementById('factoryResetBtn');

    if (!exportBtn || !importBtn || !importInput || !resetBtn) return;

    // 1. Export JSON
    exportBtn.addEventListener('click', () => {
        try {
            const appData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                appData[key] = localStorage.getItem(key);
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            
            const dateStr = new Date().toISOString().split('T')[0];
            downloadAnchorNode.setAttribute("download", `billus_diary_backup_${dateStr}.json`);
            
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err) {
            console.error("Backup failed:", err);
            alert("Failed to generate backup.");
        }
    });

    // 2. Import JSON
    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm("This will overwrite your current data. Are you sure?")) {
                    localStorage.clear();
                    Object.keys(importedData).forEach(key => {
                        localStorage.setItem(key, importedData[key]);
                    });
                    
                    alert("Data restored successfully. The app will now reload.");
                    window.location.reload();
                }
            } catch (err) {
                console.error("Restore failed:", err);
                alert("Invalid backup file format.");
            }
        };
        reader.readAsText(file);
    });

    // 3. Factory Reset
    resetBtn.addEventListener('click', () => {
        if (confirm("WARNING: This will permanently delete all tasks, journal entries, and settings. This cannot be undone. Are you absolutely sure?")) {
            localStorage.clear();
            window.location.reload();
        }
    });
}

function setupSubjectManager() {
    const manageBtn = document.getElementById('manageSubjectsBtn');
    const modal = document.getElementById('subjectModalOverlay');
    const closeBtn = document.getElementById('closeSubjectModalBtn');
    const cancelBtn = document.getElementById('cancelSubjectModalBtn'); 
    const addBtn = document.getElementById('addSubjectBtn');
    const subList = document.getElementById('subjectList');

    const colorInput = document.getElementById('newSubjectColor');
    const colorWrapper = document.getElementById('colorPickerWrapper');
    const nameInput = document.getElementById('newSubjectName');

    if (!manageBtn || !modal) return;

    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    const saveSubjects = (subs) => localStorage.setItem('plannerSubjects', JSON.stringify(subs));

    const renderSubjects = () => {
        subList.innerHTML = '';
        getSubjects().forEach(sub => {
            const div = document.createElement('div');
            div.className = 'subject-manager-item';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:15px; height:15px; border-radius:50%; background:${sub.color};"></div>
                    <span>${sub.name}</span>
                </div>
                ${sub.id === 'off' ? '' : `<button class="subject-delete-btn" data-id="${sub.id}">×</button>`}
            `;
            subList.appendChild(div);
        });
    };

    // Event Delegation for Delete Buttons
    subList.addEventListener('click', (e) => {
        if (e.target.classList.contains('subject-delete-btn')) {
            const id = e.target.getAttribute('data-id');
            const newSubs = getSubjects().filter(s => s.id !== id);
            saveSubjects(newSubs);
            renderSubjects();
        }
    });

    if (colorInput && colorWrapper) {
        colorInput.addEventListener('input', (e) => {
            colorWrapper.style.backgroundColor = e.target.value;
        });
    }

    manageBtn.addEventListener('click', () => { renderSubjects(); modal.style.display = 'flex'; });
    
    const closeModalHandler = () => { 
        modal.style.display = 'none'; 
        if (window.AppEvents) AppEvents.emit('SUBJECTS_UPDATED');
    };

    closeBtn.addEventListener('click', closeModalHandler);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModalHandler);

    // Helper function to handle adding a subject
    const handleAddSubject = () => {
        const name = nameInput.value.trim();
        if (name) {
            const subjects = getSubjects();
            subjects.push({ id: 'sub_' + Date.now(), name: name, color: colorInput.value });
            saveSubjects(subjects);
            
            // Reset the form
            nameInput.value = '';
            colorInput.value = '#ff3b3b'; 
            if (colorWrapper) colorWrapper.style.backgroundColor = '#ff3b3b'; 
            
            renderSubjects();
            
            // Auto-scroll to the bottom so you see your new subject
            subList.scrollTop = subList.scrollHeight;
        }
    };

    // Trigger on Button Click
    addBtn.addEventListener('click', handleAddSubject);

    // Trigger on ENTER KEY
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents accidental form submission reloads
            handleAddSubject();
        }
    });
}

function setupAesthetics() {
    // --- 1. MATCHY-MATCHY ACCENT COLOR ---
    const themeInput = document.getElementById('themeColorPicker');
    
    const savedThemeColor = localStorage.getItem('appAccentColor') || '#ff3b3b';
    document.documentElement.style.setProperty('--color-primary', savedThemeColor);
    if(themeInput) themeInput.value = savedThemeColor;

    if (themeInput) {
        themeInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--color-primary', newColor);
            localStorage.setItem('appAccentColor', newColor);
        });
    }

    // --- 2. MAIN TEXT COLOR ---
    const textInput = document.getElementById('textColorPicker');
    
    const savedTextColor = localStorage.getItem('appTextColor') || '#ffffff';
    document.documentElement.style.setProperty('--color-text', savedTextColor);
    if(textInput) textInput.value = savedTextColor;

    if (textInput) {
        textInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--color-text', newColor);
            localStorage.setItem('appTextColor', newColor);
        });
    }

    // --- 3. BLURRED FADED BACKGROUND UPLOAD ---
    const bgContainer = document.getElementById('dynamicBackground');
    const uploader = document.getElementById('bgUploader');
    const clearBtn = document.getElementById('clearBgBtn');

    const savedBg = localStorage.getItem('appCustomBg');
    if (savedBg && bgContainer) bgContainer.style.backgroundImage = `url(${savedBg})`;

    if (uploader) {
        uploader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
                    
                    try {
                        localStorage.setItem('appCustomBg', dataUrl);
                        if (bgContainer) bgContainer.style.backgroundImage = `url(${dataUrl})`;
                    } catch (err) {
                        alert("Image is too large to save! Try a smaller picture.");
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('appCustomBg');
            if (bgContainer) bgContainer.style.backgroundImage = 'none';
            if (uploader) uploader.value = '';
        });
    }
}
// =================================================================
// AUTHENTICATION UI STATE (SUPABASE INTEGRATED & SMART UI)
// =================================================================
function initAuthUI() {
    // Settings Card Elements
    const loggedOutSettingsView = document.getElementById('loggedOutSettingsView');
    const loggedInSettingsView = document.getElementById('loggedInSettingsView');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const openAuthModalBtn = document.getElementById('openAuthModalBtn');
    const openUpdatePasswordBtn = document.getElementById('openUpdatePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Auth Modal Elements (Smart Modal)
    const authModalOverlay = document.getElementById('authModalOverlay');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalSubtitle = document.getElementById('authModalSubtitle');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const primaryAuthBtn = document.getElementById('primaryAuthBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const authToggleText = document.getElementById('authToggleText');
    const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
    
    // Auth Modal Eye Toggle Elements
    const togglePasswordVisBtn = document.getElementById('togglePasswordVisBtn');
    const eyeIconHidden = document.getElementById('eyeIconHidden');
    const eyeIconVisible = document.getElementById('eyeIconVisible');

    // Update Password Modal Elements
    const updatePasswordModalOverlay = document.getElementById('updatePasswordModalOverlay');
    const closeUpdatePasswordBtn = document.getElementById('closeUpdatePasswordBtn');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');
    
    // Update Password Eye Toggle Elements
    const toggleUpdatePasswordVisBtn = document.getElementById('toggleUpdatePasswordVisBtn');
    const updateEyeIconHidden = document.getElementById('updateEyeIconHidden');
    const updateEyeIconVisible = document.getElementById('updateEyeIconVisible');

    // --- SESSION CHECKER ---
    const checkSession = async () => {
        try {
            const session = await AppDB.checkSession();
            if (session) {
                loggedOutSettingsView.style.display = 'none';
                loggedInSettingsView.style.display = 'flex';
                userEmailDisplay.textContent = `Synced as: ${session.user.email}`;
            } else {
                loggedOutSettingsView.style.display = 'flex';
                loggedInSettingsView.style.display = 'none';
            }
        } catch (error) {
            console.error("Session check failed:", error);
        }
    };

    // --- PASSWORD VISIBILITY TOGGLES ---
    if (togglePasswordVisBtn) {
        togglePasswordVisBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIconHidden.style.display = 'none';
                eyeIconVisible.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                eyeIconHidden.style.display = 'block';
                eyeIconVisible.style.display = 'none';
            }
        });
    }

    if (toggleUpdatePasswordVisBtn) {
        toggleUpdatePasswordVisBtn.addEventListener('click', () => {
            if (newPasswordInput.type === 'password') {
                newPasswordInput.type = 'text';
                updateEyeIconHidden.style.display = 'none';
                updateEyeIconVisible.style.display = 'block';
            } else {
                newPasswordInput.type = 'password';
                updateEyeIconHidden.style.display = 'block';
                updateEyeIconVisible.style.display = 'none';
            }
        });
    }

    // --- SMART MODAL STATE TOGGLE ---
    let isLoginMode = true;

    const toggleModalMode = () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authModalTitle.textContent = "Welcome Back";
            authModalSubtitle.textContent = "Log in to sync your diary";
            primaryAuthBtn.textContent = "Login";
            authToggleText.textContent = "New here?";
            toggleAuthModeBtn.textContent = "Create an account";
            if (forgotPasswordBtn) forgotPasswordBtn.style.display = 'block';
        } else {
            authModalTitle.textContent = "Create Account";
            authModalSubtitle.textContent = "Securely back up your data";
            primaryAuthBtn.textContent = "Sign Up";
            authToggleText.textContent = "Already have an account?";
            toggleAuthModeBtn.textContent = "Log in";
            if (forgotPasswordBtn) forgotPasswordBtn.style.display = 'none'; // Hide forgot password when signing up
        }
    };

    if (toggleAuthModeBtn) toggleAuthModeBtn.addEventListener('click', toggleModalMode);

    // --- MODAL CONTROLS ---
    openAuthModalBtn.addEventListener('click', () => {
        isLoginMode = false; // Set to false so toggle sets it back to true (Login mode)
        toggleModalMode(); 
        authModalOverlay.style.display = 'flex';
    });
    closeAuthModalBtn.addEventListener('click', () => authModalOverlay.style.display = 'none');
    
    openUpdatePasswordBtn.addEventListener('click', () => updatePasswordModalOverlay.style.display = 'flex');
    closeUpdatePasswordBtn.addEventListener('click', () => updatePasswordModalOverlay.style.display = 'none');

    // --- THE ONE SMART AUTH BUTTON ---
    primaryAuthBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if(!email || !password) return alert("Please enter both email and password.");
        
        const originalText = primaryAuthBtn.textContent;
        primaryAuthBtn.textContent = isLoginMode ? "Logging in..." : "Creating Account...";
        primaryAuthBtn.disabled = true;

        try {
            if (isLoginMode) {
                // LOGIN
                await AppDB.login(email, password);
                emailInput.value = ''; passwordInput.value = '';
                authModalOverlay.style.display = 'none';
                await checkSession();
            } else {
                // SIGN UP & MIGRATION
                const result = await AppDB.register(email, password);
                
                if (result && result.requiresVerification) {
                    alert("Account created! 🚨 IMPORTANT: Please check your email inbox to verify your account before logging in.");
                    toggleModalMode(); // Swap to login screen so they are ready
                    passwordInput.value = ''; // clear password
                } else {
                    alert("Account created! Your local data is now synced.");
                    emailInput.value = ''; passwordInput.value = '';
                    authModalOverlay.style.display = 'none';
                    await checkSession();
                }
            }
        } catch (error) {
            if (error.message.includes("Email not confirmed")) {
                alert("Please check your email and click the confirmation link before logging in!");
            } else {
                alert(error.message || "Authentication failed. Please check your details.");
            }
        } finally {
            primaryAuthBtn.textContent = originalText;
            primaryAuthBtn.disabled = false;
        }
    });

    // --- FORGOT PASSWORD ---
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if(!email) return alert("Please type your email address in the box above first.");
            
            try {
                await AppDB.resetPassword(email);
                alert(`A password reset link has been sent to: ${email}`);
            } catch (error) {
                alert(error.message || "Failed to send reset link.");
            }
        });
    }

    // --- UPDATE PASSWORD ---
    saveNewPasswordBtn.addEventListener('click', async () => {
        const newPass = newPasswordInput.value;
        if(!newPass || newPass.length < 6) return alert("New password must be at least 6 characters.");
        
        const originalText = saveNewPasswordBtn.textContent;
        saveNewPasswordBtn.textContent = "Updating...";
        saveNewPasswordBtn.disabled = true;

        try {
            await AppDB.updatePassword(newPass);
            alert("Password updated successfully!");
            newPasswordInput.value = '';
            updatePasswordModalOverlay.style.display = 'none';
        } catch (error) {
            alert(error.message || "Failed to update password.");
        } finally {
            saveNewPasswordBtn.textContent = originalText;
            saveNewPasswordBtn.disabled = false;
        }
    });

    // --- LOGOUT ---
    logoutBtn.addEventListener('click', async () => {
        const originalText = logoutBtn.textContent;
        logoutBtn.textContent = "Logging out...";
        logoutBtn.disabled = true;

        try {
            await AppDB.logout();
            await checkSession();
        } catch (error) {
            alert(error.message || "Failed to log out.");
        } finally {
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
        }
    });

    // Run on boot to check if user is already logged in
    checkSession();

    // --- SMART RECOVERY INTERCEPTOR ---
    // If the user just clicked a "Reset Password" link in their email...
    if (window.location.hash.includes('type=recovery')) {
        // Clean the ugly token out of the address bar
        window.history.replaceState(null, document.title, window.location.pathname);
        
        // Wait a split second for the Supabase session to lock in, then pop the modal!
        setTimeout(() => {
            alert("Welcome back! Please enter your new password now.");
            updatePasswordModalOverlay.style.display = 'flex';
        }, 500);
    }
}