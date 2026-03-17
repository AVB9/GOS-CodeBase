document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    // Mobile DOM
    const gridEl = document.getElementById('miniCalGrid');
    const calWrapper = document.getElementById('miniCalWrapper');
    const sliderEl = document.getElementById('dailySlider');
    const sheet = document.getElementById('agendaBottomSheet');
    const dragZone = document.getElementById('sheetDragZone');
    const sheetDateDisplay = document.getElementById('sheetDateDisplay');
    const returnTodayBtn = document.getElementById('returnTodayBtn');
    const pillsContainer = document.getElementById('subjectPillsContainer');
    const topicInput = document.getElementById('targetTopicInput');

    // Desktop (NEET OS) DOM
    const desktopGrid = document.getElementById('desktopCalendarGrid');
    const desktopEditModal = document.getElementById('desktopEditModalOverlay');
    const desktopModalDateTitle = document.getElementById('desktopModalDateTitle');
    const desktopPillsContainer = document.getElementById('desktopModalSubjectPills');
    const desktopTopicInput = document.getElementById('desktopEditTopicInput');
    const desktopProgressText = document.getElementById('desktopProgressText');
    const desktopProgressBar = document.getElementById('desktopProgressBar');

    // SHARED DOM
    const monthDisplay = document.getElementById('plannerMonthDisplay');

    if (!gridEl || !sliderEl || !desktopGrid) return;

    // THE SINGLE BRAIN: One date object controls BOTH planners
    let currentViewDate = new Date();
    currentViewDate.setDate(1); 

    let activeSelectedDateStr = null;
    let currentSheetSubjectId = null;
    let todayObserver = null;
    let isFirstTimeOpeningPlanner = true; 

    // ==========================================
    // DATA LAYER
    // ==========================================
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    
    const getContrastColor = (hex) => {
        if (!hex) return '#ffffff';
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    };
    
    const getTargets = () => JSON.parse(localStorage.getItem('plannerTargets')) || {};
    const saveTargets = (targs) => { 
        try {
            localStorage.setItem('plannerTargets', JSON.stringify(targs)); 
            if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED'); 
        } catch (e) { console.error('Storage error', e); }
    };

    const getCompleted = () => JSON.parse(localStorage.getItem('plannerCompleted')) || [];
    const saveCompleted = (arr) => {
        try {
            localStorage.setItem('plannerCompleted', JSON.stringify(arr));
            if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED');
        } catch (e) { console.error('Storage error', e); }
    };

    const getDateKey = (date) => {
        if (!(date instanceof Date) || isNaN(date)) date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    window.forcePlannerRefresh = () => { 
        renderCalendarAndCards(true); 
        renderDesktopCalendar();
        updateHomeWidget(); 
    };

    // ==========================================
    // 1. MOBILE SLIDER PLANNER LOGIC
    // ==========================================
    const renderCalendarAndCards = (skipAutoScroll = false) => {
        gridEl.innerHTML = '';
        sliderEl.innerHTML = '';
        
        const targets = getTargets();
        const completed = getCompleted();
        const subjects = getSubjects();
        
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        
        // Update the Shared Master Header
        monthDisplay.textContent = currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; 

        const todayObjReal = new Date();
        todayObjReal.setHours(0,0,0,0);
        const todayStr = getDateKey(todayObjReal);

        for(let i = 1; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            gridEl.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateKey = getDateKey(dateObj);
            const dayTask = targets[dateKey];
            const isCompleted = completed.includes(dateKey);
            
            const cell = document.createElement('div');
            cell.className = 'cal-day';
            cell.textContent = d;
            if (dateKey === todayStr) cell.classList.add('today');
            if (dateKey === activeSelectedDateStr) cell.classList.add('selected');

            if (dayTask) {
                if (dateObj <= todayObjReal) cell.classList.add('has-task'); 
                else cell.classList.add('future-task'); 
            }
            if (isCompleted) cell.classList.add('completed');

            cell.addEventListener('click', () => {
                document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                document.getElementById(`card-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                returnTodayBtn.classList.toggle('hidden', dateKey === todayStr);
                openBottomSheet(dateKey, dateObj);
            });
            gridEl.appendChild(cell);

            const card = document.createElement('div');
            card.className = `daily-card ${isCompleted ? 'completed' : ''}`;
            card.id = `card-${dateKey}`;
            
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            let cardContentHTML = `<span class="empty-task-text">Tap to plan this day</span>`;
            
            if (dayTask) {
                const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
                const textColor = getContrastColor(sub.color); 
                cardContentHTML = `
                    <div style="display:flex; flex-direction:column; gap: 8px;">
                        <span class="subject-tag" style="background-color:${sub.color}; color:${textColor};">${sub.name}</span>
                        <span class="daily-card-topic">${dayTask.topic || 'No topic details'}</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="daily-card-date">
                    <span class="daily-card-day">${dayName}</span>
                    <span class="daily-card-num">${d}</span>
                </div>
                <div class="daily-card-content">
                    ${cardContentHTML}
                </div>
            `;

            card.addEventListener('click', () => toggleCompletion(dateKey, dateObj, todayObjReal));
            sliderEl.appendChild(card);
        }

        if (todayObserver) todayObserver.disconnect();
        if (year !== todayObjReal.getFullYear() || month !== todayObjReal.getMonth()) {
            returnTodayBtn.classList.remove('hidden');
        } else {
            const todayCard = document.getElementById(`card-${todayStr}`);
            if (todayCard) {
                todayObserver = new IntersectionObserver((entries) => {
                    const plannerTab = document.getElementById('tab-planner');
                    if (plannerTab?.classList.contains('active')) {
                        returnTodayBtn.classList.toggle('hidden', entries[0].isIntersecting);
                    }
                }, { root: sliderEl, threshold: 0.5 }); 
                todayObserver.observe(todayCard);
            }
        }

        if (!skipAutoScroll && !isFirstTimeOpeningPlanner) {
            setTimeout(() => document.getElementById(`card-${todayStr}`)?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' }), 50);
        }
    };

    // ==========================================
    // 2. DESKTOP (NEET OS) PLANNER LOGIC
    // ==========================================
    const renderDesktopCalendar = () => {
        desktopGrid.innerHTML = '';
        const targets = getTargets();
        const completed = getCompleted();
        const subjects = getSubjects();
        
        // Use the EXACT same date as mobile
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; 

        const todayObjReal = new Date();
        todayObjReal.setHours(0,0,0,0);
        const todayStr = getDateKey(todayObjReal);

        let totalTasksThisMonth = 0;
        let completedTasksThisMonth = 0;

        for(let i = 1; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty';
            desktopGrid.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateKey = getDateKey(dateObj);
            const dayTask = targets[dateKey];
            const isCompleted = completed.includes(dateKey);
            
            if (dayTask) {
                totalTasksThisMonth++;
                if (isCompleted) completedTasksThisMonth++;
            }

            const cell = document.createElement('div');
            cell.className = `day-cell ${dateKey === todayStr ? 'today' : ''} ${isCompleted ? 'completed' : ''}`;
            
            let contentHTML = `<div class="date-num">${d}</div>`;
            
            if (dayTask) {
                const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
                const textColor = getContrastColor(sub.color); 
                contentHTML += `
                    <span class="subject-tag desktop-tag" style="background-color:${sub.color}; color:${textColor};">${sub.name}</span>
                    <div class="task-content" style="margin-top: 25px;">
                        <span class="desktop-task-topic">${dayTask.topic || 'No topic details'}</span>
                    </div>
                    <button class="day-edit-btn" title="Edit Plan">✎</button>
                `;
            } else {
                // If it's an empty cell, show a plus icon on hover
                contentHTML += `<button class="day-edit-btn" title="Add Plan">＋</button>`;
            }

            cell.innerHTML = contentHTML;

            // Wire up the separate buttons
            const editBtn = cell.querySelector('.day-edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Stops the completion toggle from firing
                    openDesktopModal(dateKey, dateObj);
                });
            }

            // Clicking the background of the cell toggles completion (or opens modal if empty)
            cell.addEventListener('click', () => {
                if (dayTask) {
                    toggleCompletion(dateKey, dateObj, todayObjReal);
                } else {
                    openDesktopModal(dateKey, dateObj);
                }
            });
            
            desktopGrid.appendChild(cell);
        }

        // Update Stats
        desktopProgressText.textContent = `${completedTasksThisMonth} / ${totalTasksThisMonth} Tasks`;
        const percent = totalTasksThisMonth === 0 ? 0 : (completedTasksThisMonth / totalTasksThisMonth) * 100;
        desktopProgressBar.style.width = `${percent}%`;
    };

    const toggleCompletion = (dateKey, dateObj, todayObjReal) => {
        const targets = getTargets();
        if (!targets[dateKey]) return; 
        if (dateObj > todayObjReal) { alert("Cannot mark future days as complete."); return; }

        let compArr = getCompleted();
        if (compArr.includes(dateKey)) {
            compArr = compArr.filter(id => id !== dateKey);
        } else {
            compArr.push(dateKey);
            if (navigator.vibrate) navigator.vibrate(50);
        }
        saveCompleted(compArr);
        forcePlannerRefresh();
    };

    // ==========================================
    // 3. EDIT MODALS (Mobile Sheet vs Desktop Box)
    // ==========================================
    const renderSubjectPills = (container, currentId, onSelect) => {
        container.innerHTML = '';
        const subjects = getSubjects();
        subjects.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = `subject-pill ${sub.id === currentId ? 'active' : ''}`;
            btn.textContent = sub.name;
            
            if (sub.id === currentId) {
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = getContrastColor(sub.color);
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                container.querySelectorAll('.subject-pill').forEach(p => { p.classList.remove('active'); p.style.cssText = ''; });
                btn.classList.add('active');
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = getContrastColor(sub.color);
                onSelect(sub.id);
            });
            container.appendChild(btn);
        });
    };

    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const targets = getTargets();
        currentSheetSubjectId = targets[dateStr] ? targets[dateStr].subjectId : getSubjects()[0].id;
        
        renderSubjectPills(pillsContainer, currentSheetSubjectId, (id) => currentSheetSubjectId = id);
        topicInput.value = targets[dateStr] ? (targets[dateStr].topic || '') : '';
        
        AppEvents.emit('TAB_CHANGED', { tab: 'hide-nav' }); 
        sliderEl.classList.add('hidden');
        sheet.classList.add('active');
    };

    const closeBottomSheet = () => {
        sheet.classList.remove('active');
        sheet.style.transform = ''; 
        document.querySelectorAll('#miniCalGrid .cal-day').forEach(el => el.classList.remove('selected'));
        AppEvents.emit('TAB_CHANGED', { tab: 'show-nav' }); 
        sliderEl.classList.remove('hidden');
    };

    const openDesktopModal = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        desktopModalDateTitle.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const targets = getTargets();
        currentSheetSubjectId = targets[dateStr] ? targets[dateStr].subjectId : getSubjects()[0].id;
        
        renderSubjectPills(desktopPillsContainer, currentSheetSubjectId, (id) => currentSheetSubjectId = id);
        desktopTopicInput.value = targets[dateStr] ? (targets[dateStr].topic || '') : '';
        
        desktopEditModal.style.display = 'flex';
    };

    // Save/Clear Listeners (Mobile)
    document.getElementById('saveTargetBtn').addEventListener('click', () => {
        const textInput = topicInput.value.trim();
        if (!textInput) { alert("Please enter a target to save."); return; }
        const targets = getTargets();
        targets[activeSelectedDateStr] = { subjectId: currentSheetSubjectId, topic: textInput };
        saveTargets(targets);
        closeBottomSheet();
        forcePlannerRefresh();
    });

    document.getElementById('clearTargetBtn').addEventListener('click', () => {
        const targets = getTargets();
        delete targets[activeSelectedDateStr];
        saveTargets(targets);
        closeBottomSheet();
        forcePlannerRefresh();
    });

    // Save/Clear Listeners (Desktop)
    document.getElementById('desktopSaveTaskBtn').addEventListener('click', () => {
        const textInput = desktopTopicInput.value.trim();
        if (!textInput) { alert("Please enter a target to save."); return; }
        const targets = getTargets();
        targets[activeSelectedDateStr] = { subjectId: currentSheetSubjectId, topic: textInput };
        saveTargets(targets);
        desktopEditModal.style.display = 'none';
        forcePlannerRefresh();
    });

    document.getElementById('desktopClearTaskBtn').addEventListener('click', () => {
        const targets = getTargets();
        delete targets[activeSelectedDateStr];
        saveTargets(targets);
        desktopEditModal.style.display = 'none';
        forcePlannerRefresh();
    });

    // ==========================================
    // UI EVENT LISTENERS
    // ==========================================
    // Mobile Sheet Drag Physics
    let startY = 0, currentY = 0;
    dragZone.addEventListener('touchstart', (e) => startY = e.touches[0].clientY, { passive: true });
    dragZone.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        if (currentY - startY > 0) {
            e.preventDefault(); 
            sheet.style.transform = `translateY(${currentY - startY}px)`;
            sheet.style.transition = 'none';
        }
    }, { passive: false }); 
    dragZone.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        (currentY - startY > 60) ? closeBottomSheet() : sheet.style.transform = ''; 
    });

    // SHARED Month Navigation!
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() - 1); 
        forcePlannerRefresh();
    });
    
    document.getElementById('plannerNextMonth').addEventListener('click', () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() + 1); 
        forcePlannerRefresh();
    });

    // Home Widget Sync
    const updateHomeWidget = () => {
        const taskContainer = document.getElementById('dashTaskContainer');
        const widgetCard = document.getElementById('homeTargetWidget');
        if(!taskContainer) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const dayTask = targets[getDateKey(new Date())];

        if (dayTask && dayTask.subjectId !== 'off') {
            const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
            taskContainer.innerHTML = `
                <div class="task-preview" style="border-left-color: ${sub.color};">
                    <div class="task-preview-subject" style="color: ${sub.color};">${sub.name}</div>
                    <div class="task-preview-topic">${dayTask.topic}</div>
                </div>
            `;
        } else {
            taskContainer.innerHTML = `<div class="empty-task-text">No task scheduled for today.</div>`;
        }

        if (widgetCard && !widgetCard.dataset.wired) {
            widgetCard.dataset.wired = "true"; 
            widgetCard.addEventListener('click', () => document.querySelector('.bottom-pill-btn[data-target="tab-planner"]')?.click());
        }
    };

    // Global Events
    if (window.AppEvents) {
        AppEvents.on('TAB_CHANGED', ({ tab }) => {
            if (tab === 'tab-planner' && isFirstTimeOpeningPlanner) {
                isFirstTimeOpeningPlanner = false;
                setTimeout(() => document.getElementById(`card-${getDateKey(new Date())}`)?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' }), 10);
            }
        });
        AppEvents.on('PLANNER_UPDATED', () => updateHomeWidget());
    }

    // Boot Up
    renderCalendarAndCards();
    renderDesktopCalendar();
    updateHomeWidget();
}