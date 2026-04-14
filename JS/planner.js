// =================================================================
// 1.0 [GLOBAL UTILITIES]
// =================================================================
window.showAppToast = window.showAppToast || function(msg) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
};

// =================================================================
// 2.0 [INITIALIZATION & STATE]
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    // --- SHARED DOM ---
    const monthDisplay = document.getElementById('plannerMonthDisplay');

    // --- MOBILE DOM ---
    const gridEl = document.getElementById('miniCalGrid');
    const calWrapper = document.getElementById('miniCalWrapper');
    const sliderEl = document.getElementById('dailySlider');
    const sheet = document.getElementById('agendaBottomSheet');
    const dragZone = document.getElementById('sheetDragZone');
    const sheetDateDisplay = document.getElementById('sheetDateDisplay');
    const returnTodayBtn = document.getElementById('returnTodayBtn');
    const pillsContainer = document.getElementById('subjectPillsContainer');
    const topicInput = document.getElementById('targetTopicInput');

    // --- DESKTOP DOM ---
    const desktopGrid = document.getElementById('desktopCalendarGrid');
    const desktopEditModal = document.getElementById('desktopEditModalOverlay');
    const desktopModalDateTitle = document.getElementById('desktopModalDateTitle');
    const desktopPillsContainer = document.getElementById('desktopModalSubjectPills');
    const desktopTopicInput = document.getElementById('desktopEditTopicInput');
    const desktopProgressText = document.getElementById('desktopProgressText');
    const desktopProgressBar = document.getElementById('desktopProgressBar');

    // Soft guard: If primary elements are missing, halt gracefully.
    if (!gridEl || !sliderEl || !desktopGrid) return;

    // --- CORE STATE VARIABLES ---
    let currentViewDate = new Date();
    currentViewDate.setDate(1); 

    let activeSelectedDateStr = null;
    let currentSheetSubjectId = null; 
    let activeFolderId = null; // DYNAMIC SUB-TRAY STATE
    let todayObserver = null;
    let isFirstTimeOpeningPlanner = true; 

    // --- BULLETPROOF DATABASE PARSERS & SAVERS ---
    const getGroups = () => {
        try {
            const groups = JSON.parse(localStorage.getItem('appSubjects'));
            if (!groups || !Array.isArray(groups) || groups.length === 0) {
                return [{ id: 'group_default', name: 'General', isDeletable: false, subjects: [] }];
            }
            // CRITICAL FIX: Guarantee every group has a subjects array to prevent .some() crashes
            return groups.map(g => {
                g.subjects = Array.isArray(g.subjects) ? g.subjects : [];
                return g;
            });
        } catch (e) {
            return [{ id: 'group_default', name: 'General', isDeletable: false, subjects: [] }];
        }
    };

    const getSubjects = () => {
        const groups = getGroups();
        let flat = [];
        groups.forEach(g => { flat = flat.concat(g.subjects); });
        return flat;
    };
    
    const getTargets = () => {
        try { return JSON.parse(localStorage.getItem('plannerTargets')) || {}; } 
        catch(e) { return {}; }
    };
    
    const saveTargets = (targs) => { 
        try { localStorage.setItem('plannerTargets', JSON.stringify(targs)); if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED'); } 
        catch (e) {} 
    };

    const getCompleted = () => {
        try { return JSON.parse(localStorage.getItem('plannerCompleted')) || []; } 
        catch(e) { return []; }
    };
    
    const saveCompleted = (arr) => {
        try { localStorage.setItem('plannerCompleted', JSON.stringify(arr)); if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED'); } 
        catch (e) {} 
    };

    const getDateKey = (date) => {
        if (!(date instanceof Date) || isNaN(date)) date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // =================================================================
    // 3.0 [CALENDAR MATH ENGINE]
    // =================================================================
    const generateMonthData = () => {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; 

        const todayObjReal = new Date();
        todayObjReal.setHours(0,0,0,0);
        const todayStr = getDateKey(todayObjReal);

        const targets = getTargets();
        const completed = getCompleted();
        const subjects = getSubjects();

        const monthData = { year, month, startDay, daysInMonth, todayStr, todayObjReal, days: [] };

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateKey = getDateKey(dateObj);
            const dayTask = targets[dateKey] || null;
            const isCompleted = completed.includes(dateKey);
            const isOverdue = (dayTask && !isCompleted && dateObj < todayObjReal);
            const isFuture = dateObj > todayObjReal;
            
            let subjectData = null;
            if (dayTask && dayTask.subjectId) {
                subjectData = subjects.find(s => s.id === dayTask.subjectId) || null;
            }

            monthData.days.push({
                dayNum: d, dateObj, dateKey,
                isToday: dateKey === todayStr,
                isCompleted, isOverdue, isFuture,
                hasTask: !!dayTask,
                taskTopic: dayTask ? dayTask.topic : '',
                subject: subjectData
            });
        }
        return monthData;
    };

    window.forcePlannerRefresh = () => { 
        const monthData = generateMonthData();
        renderMobile(monthData); 
        renderDesktop(monthData);
        updateHomeWidget(); 
    };

    const toggleCompletion = (dateKey, dateObj, todayObjReal) => {
        const targets = getTargets();
        if (!targets[dateKey]) return; 
        
        if (dateObj > todayObjReal) { 
            window.showAppToast("gmasti tho dekho koi inki!!"); 
            return; 
        }

        let compArr = getCompleted();

        if (compArr.includes(dateKey)) {
            compArr = compArr.filter(id => id !== dateKey);
        } else { 
            compArr.push(dateKey); 
            if (navigator.vibrate) navigator.vibrate(50);
            setTimeout(() => window.showAppToast("MUUWWAHAAAA!!!"), 100);
        }
        
        saveCompleted(compArr);
        forcePlannerRefresh();
    };

    const handleClearTask = () => {
        const targets = getTargets();
        delete targets[activeSelectedDateStr];
        saveTargets(targets);

        let compArr = getCompleted();
        if (compArr.includes(activeSelectedDateStr)) {
            compArr = compArr.filter(id => id !== activeSelectedDateStr);
            saveCompleted(compArr);
        }
        forcePlannerRefresh();
    };

    // =================================================================
    // 4.0 [MOBILE RENDERER]
    // =================================================================
    const renderMobile = (data) => {
        gridEl.innerHTML = '';
        sliderEl.innerHTML = '';
        if (monthDisplay) monthDisplay.textContent = currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        for(let i = 1; i < data.startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            gridEl.appendChild(empty);
        }

        data.days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = `cal-day ${day.isToday ? 'today' : ''} ${day.dateKey === activeSelectedDateStr ? 'selected' : ''} ${day.isCompleted ? 'completed' : ''} ${day.isOverdue ? 'overdue' : ''}`;
            if (day.hasTask) cell.classList.add(day.isFuture ? 'future-task' : 'has-task');
            cell.textContent = day.dayNum;

            cell.addEventListener('click', () => {
                document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                document.getElementById(`card-${day.dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                openBottomSheet(day.dateKey, day.dateObj);
            });
            gridEl.appendChild(cell);

            const card = document.createElement('div');
            card.className = `daily-card ${day.isCompleted ? 'completed' : ''} ${day.isOverdue ? 'overdue' : ''} ${day.isToday ? 'today' : ''}`;
            card.id = `card-${day.dateKey}`;
            
            const dayName = day.dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            let cardContentHTML = `<span class="empty-task-text">Tap to plan this day</span>`;
            
            if (day.hasTask) {
                if (day.subject) {
                    cardContentHTML = `
                        <div style="display:flex; flex-direction:column; gap: 8px;">
                            <span class="subject-tag" style="background-color: color-mix(in srgb, ${day.subject.color} 20%, var(--color-surface)); color: ${day.subject.color}; border-color: ${day.subject.color};">${day.subject.name}</span>
                            <span class="daily-card-topic">${day.taskTopic}</span>
                        </div>
                    `;
                } else {
                    cardContentHTML = `
                        <div style="display:flex; flex-direction:column; justify-content:center; height:100%;">
                            <span class="daily-card-topic" style="font-size: 1.15em; line-height: 1.4;">${day.taskTopic}</span>
                        </div>
                    `;
                }
            }

            card.innerHTML = `
                <div class="daily-card-date"><span class="daily-card-day">${dayName}</span><span class="daily-card-num">${day.dayNum}</span></div>
                <div class="daily-card-content">${cardContentHTML}</div>
            `;

            let startX = 0, startY = 0, startTime = 0;
            let holdTimer = null;
            let isLongPress = false;

            card.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
                isLongPress = false;
                clearTimeout(holdTimer);

                if (day.hasTask) {
                    holdTimer = setTimeout(() => {
                        isLongPress = true;
                        if (navigator.vibrate) navigator.vibrate(50); 
                        document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
                        const targetCell = Array.from(document.querySelectorAll('#miniCalGrid .cal-day')).find(el => el.textContent == day.dayNum && !el.classList.contains('empty'));
                        if(targetCell) targetCell.classList.add('selected');
                        openBottomSheet(day.dateKey, day.dateObj);
                    }, 400);
                }
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                if (Math.abs(currentX - startX) > 10 || Math.abs(currentY - startY) > 10) {
                    clearTimeout(holdTimer);
                }
            }, { passive: true });

            card.addEventListener('touchend', (e) => {
                clearTimeout(holdTimer);
                if (isLongPress) return; 

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY; 
                const duration = Date.now() - startTime;

                const updateFocusRing = () => {
                    document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
                    const targetCell = Array.from(document.querySelectorAll('#miniCalGrid .cal-day')).find(el => el.textContent == day.dayNum && !el.classList.contains('empty'));
                    if(targetCell) targetCell.classList.add('selected');
                };

                if (duration < 400 && diffY < -40 && Math.abs(diffY) > Math.abs(diffX)) {
                    updateFocusRing();
                    openBottomSheet(day.dateKey, day.dateObj);
                    return;
                }

                if (duration < 400 && Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
                    updateFocusRing();
                    if (day.hasTask) {
                        toggleCompletion(day.dateKey, day.dateObj, data.todayObjReal);
                    } else {
                        openBottomSheet(day.dateKey, day.dateObj);
                    }
                }
            });

            card.addEventListener('click', (e) => {
                if (e.pointerType === "mouse") {
                    document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
                    const targetCell = Array.from(document.querySelectorAll('#miniCalGrid .cal-day')).find(el => el.textContent == day.dayNum && !el.classList.contains('empty'));
                    if(targetCell) targetCell.classList.add('selected');

                     if (day.hasTask) toggleCompletion(day.dateKey, day.dateObj, data.todayObjReal);
                     else openBottomSheet(day.dateKey, day.dateObj);
                }
            });

            sliderEl.appendChild(card);
        });

        if (todayObserver) todayObserver.disconnect();
        const isCurrentMonth = (data.year === data.todayObjReal.getFullYear() && data.month === data.todayObjReal.getMonth());

        if (!isCurrentMonth) {
            returnTodayBtn?.classList.remove('hidden');
        } else {
            const todayCard = document.getElementById(`card-${data.todayStr}`);
            if (todayCard) {
                todayObserver = new IntersectionObserver((entries) => {
                    returnTodayBtn?.classList.toggle('hidden', entries[0].isIntersecting);
                }, { root: sliderEl, threshold: 0.2 }); 
                todayObserver.observe(todayCard);
            }
        }
    };

    // =================================================================
    // 5.0 [DESKTOP RENDERER]
    // =================================================================
    const renderDesktop = (data) => {
        desktopGrid.innerHTML = '';
        let totalTasks = 0;
        let completedTasks = 0;

        for(let i = 1; i < data.startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty';
            desktopGrid.appendChild(empty);
        }

        data.days.forEach(day => {
            if (day.hasTask) {
                totalTasks++;
                if (day.isCompleted) completedTasks++;
            }

            const cell = document.createElement('div');
            cell.className = `day-cell ${day.isToday ? 'today' : ''} ${day.isCompleted ? 'completed' : ''} ${day.isOverdue ? 'overdue' : ''}`;
            
            let contentHTML = `<div class="date-num">${day.dayNum}</div>`;
            
            if (day.hasTask) {
                if (day.subject) {
                    contentHTML += `
                        <span class="subject-tag desktop-tag" style="background-color: color-mix(in srgb, ${day.subject.color} 20%, var(--color-surface)); color: ${day.subject.color}; border-color: ${day.subject.color};">${day.subject.name}</span>
                        <div class="task-content" style="margin-top: 25px;">
                            <span class="desktop-task-topic">${day.taskTopic}</span>
                        </div>
                        <button class="day-edit-btn" title="Edit Plan">✎</button>
                    `;
                } else {
                    // NO PILL: Standard natural flow, no extra margins needed
                    contentHTML += `
                        <div class="task-content">
                            <span class="desktop-task-topic">${day.taskTopic}</span>
                        </div>
                        <button class="day-edit-btn" title="Edit Plan">✎</button>
                    `;
                }
            } else {
                contentHTML += `<button class="day-edit-btn" title="Add Plan">＋</button>`;
            }

            cell.innerHTML = contentHTML;

            const editBtn = cell.querySelector('.day-edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    openDesktopModal(day.dateKey, day.dateObj);
                });
            }

            cell.addEventListener('click', () => {
                if (day.hasTask) toggleCompletion(day.dateKey, day.dateObj, data.todayObjReal);
                else openDesktopModal(day.dateKey, day.dateObj);
            });
            
            desktopGrid.appendChild(cell);
        });

        if (desktopProgressText) desktopProgressText.textContent = `${completedTasks} / ${totalTasks} Targets`;
        if (desktopProgressBar) desktopProgressBar.style.width = `${totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100}%`;
    };

    // =================================================================
    // 6.0 [DYNAMIC SUB-TRAY & MODALS]
    // =================================================================
    const renderDynamicTray = (container, currentId, onSelect) => {
        if (!container) return;
        container.innerHTML = '';
        const groups = getGroups();

        if (activeFolderId === null) {
            // --- ROOT LEVEL ---
            const generalGroup = groups.find(g => g.id === 'group_default');
            if (generalGroup && Array.isArray(generalGroup.subjects)) {
                generalGroup.subjects.forEach(sub => renderSubjectPill(container, sub, currentId, onSelect));
            }

            groups.forEach(group => {
                if (group.id !== 'group_default' && Array.isArray(group.subjects) && group.subjects.length > 0) {
                    const folderPill = document.createElement('div');
                    folderPill.className = 'todo-tint-pill';
                    folderPill.style.borderStyle = 'dashed';
                    folderPill.innerHTML = `📁 ${group.name}`;
                    
                    folderPill.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        activeFolderId = group.id; // OPEN SUB-TRAY
                        renderDynamicTray(container, currentId, onSelect);
                    });
                    container.appendChild(folderPill);
                }
            });

        } else {
            // --- SUB-TRAY LEVEL ---
            const backPill = document.createElement('div');
            backPill.className = 'todo-tint-pill';
            backPill.innerHTML = `← Back`;
            backPill.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                activeFolderId = null; // CLOSE SUB-TRAY
                onSelect(null); // FIX: Clear the invisible selection!
                renderDynamicTray(container, null, onSelect);
            });
            container.appendChild(backPill);

            const activeGroup = groups.find(g => g.id === activeFolderId);
            if (activeGroup && Array.isArray(activeGroup.subjects)) {
                activeGroup.subjects.forEach(sub => renderSubjectPill(container, sub, currentId, onSelect));
            } else {
                activeFolderId = null; // Failsafe
            }
        }
    };

    const renderSubjectPill = (container, sub, currentId, onSelect) => {
        const btn = document.createElement('div');
        btn.className = `todo-tint-pill ${sub.id === currentId ? 'selected' : ''}`;
        btn.textContent = sub.name;
        
        if (sub.id === currentId) {
            btn.style.backgroundColor = `color-mix(in srgb, ${sub.color} 20%, var(--color-surface))`;
            btn.style.borderColor = sub.color;
            btn.style.color = sub.color;
        }
        
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (btn.classList.contains('selected')) {
                onSelect(null); // Deselect -> General
                renderDynamicTray(container, null, onSelect);
            } else {
                onSelect(sub.id); // Select
                renderDynamicTray(container, sub.id, onSelect);
            }
        });
        container.appendChild(btn);
    };

    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        if (sheetDateDisplay) sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const targets = getTargets();
        currentSheetSubjectId = targets[dateStr] ? targets[dateStr].subjectId : null;

        activeFolderId = null;
        if (currentSheetSubjectId) {
            const groups = getGroups();
            const parentGroup = groups.find(g => Array.isArray(g.subjects) && g.subjects.some(s => s.id === currentSheetSubjectId));
            if (parentGroup && parentGroup.id !== 'group_default') {
                activeFolderId = parentGroup.id;
            }
        }

        if (pillsContainer) renderDynamicTray(pillsContainer, currentSheetSubjectId, (id) => currentSheetSubjectId = id);
        
        if (topicInput) topicInput.value = targets[dateStr] ? (targets[dateStr].topic || '') : '';
        if (window.AppEvents) AppEvents.emit('TAB_CHANGED', { tab: 'hide-nav' }); 
        sliderEl?.classList.add('hidden');
        sheet?.classList.add('active');
    };

    const closeBottomSheet = () => {
        if (sheet) {
            sheet.classList.remove('active');
            sheet.style.transform = ''; 
        }
        if (window.AppEvents) AppEvents.emit('TAB_CHANGED', { tab: 'show-nav' }); 
        sliderEl?.classList.remove('hidden');
    };

    const openDesktopModal = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        if (desktopModalDateTitle) desktopModalDateTitle.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const targets = getTargets();
        currentSheetSubjectId = targets[dateStr] ? targets[dateStr].subjectId : null;

        activeFolderId = null;
        if (currentSheetSubjectId) {
            const groups = getGroups();
            const parentGroup = groups.find(g => Array.isArray(g.subjects) && g.subjects.some(s => s.id === currentSheetSubjectId));
            if (parentGroup && parentGroup.id !== 'group_default') {
                activeFolderId = parentGroup.id;
            }
        }

        if (desktopPillsContainer) renderDynamicTray(desktopPillsContainer, currentSheetSubjectId, (id) => currentSheetSubjectId = id);
        
        if (desktopTopicInput) desktopTopicInput.value = targets[dateStr] ? (targets[dateStr].topic || '') : '';
        if (desktopEditModal) desktopEditModal.style.display = 'flex';
    };

    document.getElementById('saveTargetBtn')?.addEventListener('click', () => {
        const textInput = topicInput?.value.trim() || '';
        if (!textInput) { alert("Please enter a target to save."); return; }
        const targets = getTargets();
        targets[activeSelectedDateStr] = { subjectId: currentSheetSubjectId, topic: textInput };
        saveTargets(targets);
        closeBottomSheet();
        forcePlannerRefresh();
    });

    document.getElementById('clearTargetBtn')?.addEventListener('click', () => { handleClearTask(); closeBottomSheet(); });

    document.getElementById('desktopSaveTaskBtn')?.addEventListener('click', () => {
        const textInput = desktopTopicInput?.value.trim() || '';
        if (!textInput) { alert("Please enter a target to save."); return; }
        const targets = getTargets();
        targets[activeSelectedDateStr] = { subjectId: currentSheetSubjectId, topic: textInput };
        saveTargets(targets);
        if (desktopEditModal) desktopEditModal.style.display = 'none';
        forcePlannerRefresh();
    });

    document.getElementById('desktopClearTaskBtn')?.addEventListener('click', () => { handleClearTask(); if (desktopEditModal) desktopEditModal.style.display = 'none'; });

    // =================================================================
    // 7.0 [CONTROLS & EVENTS]
    // =================================================================
    let startY = 0, currentY = 0;
    dragZone?.addEventListener('touchstart', (e) => startY = e.touches[0].clientY, { passive: true });
    dragZone?.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        if (currentY - startY > 0) {
            e.preventDefault(); 
            sheet.style.transform = `translateY(${currentY - startY}px)`;
            sheet.style.transition = 'none';
        }
    }, { passive: false }); 
    dragZone?.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        (currentY - startY > 60) ? closeBottomSheet() : sheet.style.transform = ''; 
    });

    document.getElementById('plannerPrevMonth')?.addEventListener('click', () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() - 1); 
        forcePlannerRefresh();
    });
    
    document.getElementById('plannerNextMonth')?.addEventListener('click', () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() + 1); 
        forcePlannerRefresh();
    });

    let mcStartX = 0, mcStartY = 0;
    calWrapper?.addEventListener('touchstart', (e) => {
        mcStartX = e.touches[0].clientX;
        mcStartY = e.touches[0].clientY;
    }, { passive: true });

    calWrapper?.addEventListener('touchend', (e) => {
        const diffX = mcStartX - e.changedTouches[0].clientX;
        const diffY = Math.abs(mcStartY - e.changedTouches[0].clientY);

        if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY) {
            if (diffX > 0) currentViewDate.setMonth(currentViewDate.getMonth() + 1); 
            else currentViewDate.setMonth(currentViewDate.getMonth() - 1); 
            forcePlannerRefresh();
        }
    }, { passive: true });

    const monthNavWrapper = monthDisplay?.closest('.date-navigator');
    let isMonthSwiping = false;
    let mdStartX = 0;

    if (monthNavWrapper) {
        monthNavWrapper.addEventListener('touchstart', (e) => {
            mdStartX = e.touches[0].clientX;
            isMonthSwiping = false;
        }, { passive: true });

        monthNavWrapper.addEventListener('touchmove', (e) => {
            if (Math.abs(e.touches[0].clientX - mdStartX) > 10) {
                isMonthSwiping = true;
            }
        }, { passive: true });

        monthNavWrapper.addEventListener('touchend', (e) => {
            if (isMonthSwiping) {
                const diffX = mdStartX - e.changedTouches[0].clientX;
                if (diffX > 40) currentViewDate.setMonth(currentViewDate.getMonth() + 1);
                else if (diffX < -40) currentViewDate.setMonth(currentViewDate.getMonth() - 1);
                forcePlannerRefresh();
                
                setTimeout(() => isMonthSwiping = false, 50);
            }
        });
    }

    if (monthDisplay) {
        monthDisplay.style.cursor = 'pointer';
        monthDisplay.addEventListener('click', (e) => {
            if (isMonthSwiping) {
                e.preventDefault();
                return;
            }

            const monthModal = document.getElementById('monthPickerModalOverlay');
            const grid = document.getElementById('monthGrid');
            if (!monthModal || !grid) return;

            grid.innerHTML = '';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentM = currentViewDate.getMonth();
            const realCurrentMonth = new Date().getMonth();

            months.forEach((m, i) => {
                const btn = document.createElement('button');
                btn.className = `month-grid-btn ${i === currentM ? 'active' : ''} ${i === realCurrentMonth ? 'current-month' : ''}`;
                btn.textContent = m;
                btn.addEventListener('click', () => {
                    currentViewDate.setMonth(i);
                    forcePlannerRefresh();
                    monthModal.style.display = 'none';
                });
                grid.appendChild(btn);
            });

            monthModal.style.display = 'flex';
        });
    }

    returnTodayBtn?.addEventListener('click', () => {
        currentViewDate = new Date(); 
        currentViewDate.setDate(1);
        forcePlannerRefresh();
        
        const todayStr = getDateKey(new Date());
        
        activeSelectedDateStr = todayStr; 
        document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
        const todayCell = Array.from(document.querySelectorAll('#miniCalGrid .cal-day')).find(el => el.textContent == new Date().getDate() && el.classList.contains('today'));
        if (todayCell) todayCell.classList.add('selected');

        setTimeout(() => {
            document.getElementById(`card-${todayStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }, 50);
        
        if (navigator.vibrate) navigator.vibrate(50);
    });

    const updateHomeWidget = () => {
        const taskContainer = document.getElementById('dashTaskContainer');
        const widgetCard = document.getElementById('homeTargetWidget');
        if(!taskContainer) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const dayTask = targets[getDateKey(new Date())];

        if (dayTask) {
            const sub = dayTask.subjectId ? subjects.find(s => s.id === dayTask.subjectId) : null;
            
            if (sub) {
                taskContainer.innerHTML = `
                    <div class="task-preview" style="border-left-color: ${sub.color};">
                        <div class="task-preview-subject" style="color: ${sub.color};">${sub.name}</div>
                        <div class="task-preview-topic">${dayTask.topic}</div>
                    </div>
                `;
            } else {
                // NO PILL: Vertically centered, larger text, neutral border
                taskContainer.innerHTML = `
                    <div class="task-preview" style="border-left-color: var(--color-glass-border); display: flex; flex-direction: column; justify-content: center; min-height: 60px;">
                        <div class="task-preview-topic" style="font-size: 1.1em; font-weight: 500; margin-top: 0;">${dayTask.topic}</div>
                    </div>
                `;
            }
        } else {
            taskContainer.innerHTML = `<div class="empty-task-text">No target scheduled for today.</div>`;
        }

        if (widgetCard && !widgetCard.dataset.wired) {
            widgetCard.dataset.wired = "true"; 
            widgetCard.addEventListener('click', () => document.querySelector('.bottom-pill-btn[data-target="tab-planner"]')?.click());
        }
    };

    if (window.AppEvents) {
        AppEvents.on('TAB_CHANGED', ({ tab }) => {
            if (tab === 'tab-planner') {
                if (returnTodayBtn) {
                    returnTodayBtn.style.cssText = 'opacity: 0 !important; visibility: hidden !important; transition: none !important;';
                }
                
                if (isFirstTimeOpeningPlanner) {
                    isFirstTimeOpeningPlanner = false;
                    setTimeout(() => document.getElementById(`card-${getDateKey(new Date())}`)?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' }), 10);
                }

                setTimeout(() => {
                    if (returnTodayBtn) returnTodayBtn.style.cssText = '';
                }, 300);
            }
        });
        AppEvents.on('PLANNER_UPDATED', () => updateHomeWidget());
        AppEvents.on('SUBJECTS_UPDATED', () => forcePlannerRefresh());
    }

    const initialData = generateMonthData();
    renderMobile(initialData);
    renderDesktop(initialData);
    updateHomeWidget();
}