document.addEventListener('DOMContentLoaded', () => {
    initSettingsTab();
});

function initSettingsTab() {
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

    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error("Invalid file structure");
                }

                if (confirm("This will overwrite your current data with the backup. Are you sure?")) {
                    Object.keys(importedData).forEach(key => {
                        if (importedData[key] !== null && importedData[key] !== undefined) {
                            localStorage.setItem(key, importedData[key]);
                        }
                    });
                    
                    alert("Data restored successfully. The app will now reload.");
                    window.location.reload();
                }
            } catch (err) {
                console.error("Restore failed:", err);
                alert("Invalid backup file format. Please ensure it is a valid backup.");
            }
        };
        reader.readAsText(file);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm("WARNING: This will permanently delete all tasks, journal entries, and settings. This cannot be undone. Are you absolutely sure?")) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('todo_') || key.startsWith('journal_') || 
                    ['plannerTargets', 'plannerCompleted', 'plannerSubjects', 'userDisplayName', 'userUltimateGoalName', 'userUltimateGoalDate', 'appCustomBg', 'themeOLED', 'appAccentColor', 'appTextColor'].includes(key)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
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
    
    const getSubjects = () => {
        try {
            const stored = localStorage.getItem('plannerSubjects');
            return stored ? JSON.parse(stored) : defaultSubjects;
        } catch (e) {
            console.warn("Corrupted subjects data detected, reverting to defaults.");
            return defaultSubjects; 
        }
    };

    const saveSubjects = (subs) => {
        try {
            localStorage.setItem('plannerSubjects', JSON.stringify(subs));
        } catch (e) {
            console.error("Failed to save subjects to storage.", e);
        }
    };

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

    const handleAddSubject = () => {
        const name = nameInput.value.trim();
        if (name) {
            const subjects = getSubjects();
            subjects.push({ id: 'sub_' + Date.now(), name: name, color: colorInput.value });
            saveSubjects(subjects);
            
            nameInput.value = '';
            colorInput.value = '#ff3b3b'; 
            if (colorWrapper) colorWrapper.style.backgroundColor = '#ff3b3b'; 
            
            renderSubjects();
            subList.scrollTop = subList.scrollHeight;
        }
    };

    addBtn.addEventListener('click', handleAddSubject);

    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            handleAddSubject();
        }
    });
}

function setupAesthetics() {
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
// UPGRADED AUTH UI (CUSTOM INLINE ALERTS & GOOGLE AUTH)
// =================================================================
function initAuthUI() {
    const loggedOutSettingsView = document.getElementById('loggedOutSettingsView');
    const loggedInSettingsView = document.getElementById('loggedInSettingsView');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const openAuthModalBtn = document.getElementById('openAuthModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const authModalOverlay = document.getElementById('authModalOverlay');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const authModalTitle = document.getElementById('authModalTitle');
    const authModalSubtitle = document.getElementById('authModalSubtitle');
    const primaryAuthBtn = document.getElementById('primaryAuthBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const authToggleText = document.getElementById('authToggleText');
    const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
    
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const googleAuthText = document.getElementById('googleAuthText');
    const authFeedback = document.getElementById('authFeedback');

    const openUpdatePasswordBtn = document.getElementById('openUpdatePasswordBtn');
    const updatePasswordModalOverlay = document.getElementById('updatePasswordModalOverlay');
    const closeUpdatePasswordBtn = document.getElementById('closeUpdatePasswordBtn');
    const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');
    const updateAuthFeedback = document.getElementById('updateAuthFeedback');

    const showFeedback = (element, msg, type = 'error') => {
        if (!element) return;
        element.textContent = msg;
        element.style.display = 'block';
        if (type === 'error') {
            element.style.backgroundColor = 'rgba(255, 59, 59, 0.1)';
            element.style.color = '#ff3b3b';
            element.style.border = '1px solid rgba(255, 59, 59, 0.3)';
        } else {
            element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            element.style.color = '#4caf50';
            element.style.border = '1px solid rgba(76, 175, 80, 0.3)';
        }
    };

    const clearFeedback = (element) => { if (element) element.style.display = 'none'; };

    const checkSession = async () => {
        try {
            const session = await AppDB.checkSession();
            if (session) {
                loggedOutSettingsView.style.display = 'none';
                loggedInSettingsView.style.display = 'flex';
                userEmailDisplay.textContent = `Synced as: ${session.email}`;
            } else {
                loggedOutSettingsView.style.display = 'flex';
                loggedInSettingsView.style.display = 'none';
            }
        } catch (error) { console.error("Session check failed:", error); }
    };

    let isLoginMode = true;

    const toggleModalMode = () => {
        isLoginMode = !isLoginMode;
        clearFeedback(authFeedback); 
        
        if (isLoginMode) {
            authModalTitle.textContent = "Welcome Back";
            authModalSubtitle.textContent = "Log in to sync your diary";
            primaryAuthBtn.textContent = "Login";
            authToggleText.textContent = "New here?";
            toggleAuthModeBtn.textContent = "Create an account";
            if (googleAuthText) googleAuthText.textContent = "Log in with Google"; 
            if (forgotPasswordBtn) forgotPasswordBtn.style.display = 'block';
        } else {
            authModalTitle.textContent = "Create Account";
            authModalSubtitle.textContent = "Securely back up your data";
            primaryAuthBtn.textContent = "Sign Up";
            authToggleText.textContent = "Already have an account?";
            toggleAuthModeBtn.textContent = "Log in";
            if (googleAuthText) googleAuthText.textContent = "Sign up with Google"; 
            if (forgotPasswordBtn) forgotPasswordBtn.style.display = 'none'; 
        }
    };

    if (toggleAuthModeBtn) toggleAuthModeBtn.addEventListener('click', toggleModalMode);

    // ==========================================
    // MAIN AUTH MODAL LOGIC
    // ==========================================
    openAuthModalBtn.addEventListener('click', () => {
        isLoginMode = true; 
        toggleModalMode(); toggleModalMode(); 
        clearFeedback(authFeedback);
        
        // BUILD THE INPUTS
        const container = document.getElementById('mainAuthInputContainer');
        if (container) {
            container.innerHTML = `
                <input type="email" id="authEmail" class="auth-input" placeholder="Email address" autocomplete="username" style="margin-bottom: 15px; width: 100%;" />
                <div class="password-wrapper" style="width: 100%;">
                    <input type="password" id="authPassword" class="auth-input" placeholder="Password" autocomplete="current-password" style="margin-bottom: 0; padding-right: 40px; width: 100%;" />
                    <button id="togglePasswordVisBtn" class="password-eye-btn" type="button">
                        <svg id="eyeIconHidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        <svg id="eyeIconVisible" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            `;

            document.getElementById('togglePasswordVisBtn').addEventListener('click', () => {
                const passInput = document.getElementById('authPassword');
                const eyeHidden = document.getElementById('eyeIconHidden');
                const eyeVisible = document.getElementById('eyeIconVisible');
                if (passInput.type === 'password') {
                    passInput.type = 'text';
                    eyeHidden.style.display = 'none';
                    eyeVisible.style.display = 'block';
                } else {
                    passInput.type = 'password';
                    eyeHidden.style.display = 'block';
                    eyeVisible.style.display = 'none';
                }
            });

            document.getElementById('authEmail').addEventListener('input', () => clearFeedback(authFeedback));
            document.getElementById('authPassword').addEventListener('input', () => clearFeedback(authFeedback));
        }

        authModalOverlay.style.display = 'flex';
    });
    
    closeAuthModalBtn.addEventListener('click', () => {
        // DESTROY THE INPUTS
        const container = document.getElementById('mainAuthInputContainer');
        if (container) container.innerHTML = '';
        authModalOverlay.style.display = 'none';
    });

    primaryAuthBtn.addEventListener('click', async () => {
        const emailInput = document.getElementById('authEmail');
        const passInput = document.getElementById('authPassword');
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passInput ? passInput.value : '';
        
        if(!email || !password) return showFeedback(authFeedback, "Please enter both email and password.", "error");
        
        const originalText = primaryAuthBtn.textContent;
        primaryAuthBtn.textContent = isLoginMode ? "Logging in..." : "Creating Account...";
        primaryAuthBtn.disabled = true;

        try {
            if (isLoginMode) {
                await AppDB.login(email, password);
                window.location.reload(); 
            } else {
                await AppDB.register(email, password);
                window.location.reload(); 
            }
        } catch (error) {
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
            if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
            if (error.code === 'auth/weak-password') msg = "Password must be at least 6 characters.";
            
            showFeedback(authFeedback, msg, "error");
            primaryAuthBtn.textContent = originalText;
            primaryAuthBtn.disabled = false;
        }
    });

    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            const originalText = googleAuthText.textContent;
            googleAuthText.textContent = "Connecting...";
            googleAuthBtn.disabled = true;

            try {
                await AppDB.loginWithGoogle();
                window.location.reload(); 
            } catch (error) {
                let msg = error.message;
                if (error.code === 'auth/popup-closed-by-user') msg = "Google sign-in was canceled."; 
                showFeedback(authFeedback, msg, "error");
                googleAuthText.textContent = originalText;
                googleAuthBtn.disabled = false;
            }
        });
    }

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('authEmail');
            const email = emailInput ? emailInput.value.trim() : '';
            if(!email) return showFeedback(authFeedback, "Please type your email address first.", "error");
            
            try {
                await AppDB.resetPassword(email);
                showFeedback(authFeedback, `Reset link sent to ${email}`, "success");
            } catch (error) {
                let msg = error.message;
                if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
                showFeedback(authFeedback, msg, "error");
            }
        });
    }

    // ==========================================
    // UPDATE PASSWORD MODAL LOGIC
    // ==========================================
    if (openUpdatePasswordBtn) {
        openUpdatePasswordBtn.addEventListener('click', () => {
            clearFeedback(updateAuthFeedback);
            
            // BUILD THE NEW PASSWORD INPUT
            const container = document.getElementById('updatePasswordContainer');
            if (container) {
                container.innerHTML = `
                    <div class="password-wrapper" style="width: 100%;">
                        <input type="password" id="newPasswordInput" class="auth-input" placeholder="Enter new password..." style="margin-bottom: 0; padding-right: 40px; width: 100%;" />
                        <button id="toggleUpdatePasswordVisBtn" class="password-eye-btn" type="button">
                            <svg id="updateEyeIconHidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                            <svg id="updateEyeIconVisible" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                `;

                document.getElementById('toggleUpdatePasswordVisBtn').addEventListener('click', () => {
                    const passInput = document.getElementById('newPasswordInput');
                    const eyeHidden = document.getElementById('updateEyeIconHidden');
                    const eyeVisible = document.getElementById('updateEyeIconVisible');
                    if (passInput.type === 'password') {
                        passInput.type = 'text';
                        eyeHidden.style.display = 'none';
                        eyeVisible.style.display = 'block';
                    } else {
                        passInput.type = 'password';
                        eyeHidden.style.display = 'block';
                        eyeVisible.style.display = 'none';
                    }
                });

                document.getElementById('newPasswordInput').addEventListener('input', () => clearFeedback(updateAuthFeedback));
            }
            
            updatePasswordModalOverlay.style.display = 'flex';
        });
    }
    
    if (closeUpdatePasswordBtn) {
        closeUpdatePasswordBtn.addEventListener('click', () => {
            // DESTROY THE INPUT
            const container = document.getElementById('updatePasswordContainer');
            if (container) container.innerHTML = '';
            updatePasswordModalOverlay.style.display = 'none';
        });
    }

    if (saveNewPasswordBtn) {
        saveNewPasswordBtn.addEventListener('click', async () => {
            const passInput = document.getElementById('newPasswordInput');
            const newPass = passInput ? passInput.value : '';
            
            if(!newPass || newPass.length < 6) return showFeedback(updateAuthFeedback, "Password must be at least 6 characters.", "error");
            
            const originalText = saveNewPasswordBtn.textContent;
            saveNewPasswordBtn.textContent = "Updating...";
            saveNewPasswordBtn.disabled = true;

            try {
                await AppDB.updatePassword(newPass);
                showFeedback(updateAuthFeedback, "Password updated successfully!", "success");
                setTimeout(() => {
                    const container = document.getElementById('updatePasswordContainer');
                    if (container) container.innerHTML = '';
                    updatePasswordModalOverlay.style.display = 'none';
                }, 1500);
            } catch (error) {
                showFeedback(updateAuthFeedback, error.message, "error");
            } finally {
                saveNewPasswordBtn.textContent = originalText;
                saveNewPasswordBtn.disabled = false;
            }
        });
    }

    logoutBtn.addEventListener('click', async () => {
        const originalText = logoutBtn.textContent;
        logoutBtn.textContent = "Logging out...";
        logoutBtn.disabled = true;

        try {
            await AppDB.logout(); 
        } catch (error) {
            alert(error.message || "Failed to log out.");
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
        } 
    });

    checkSession();
}