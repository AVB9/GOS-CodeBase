document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    const gridEl = document.getElementById('miniCalGrid');
    const calWrapper = document.getElementById('miniCalWrapper');
    const sliderEl = document.getElementById('dailySlider');
    const monthDisplay = document.getElementById('plannerMonthDisplay');
    
    const sheet = document.getElementById('agendaBottomSheet');
    const dragZone = document.getElementById('sheetDragZone');
    const sheetDateDisplay = document.getElementById('sheetDateDisplay');
    
    const returnTodayBtn = document.getElementById('returnTodayBtn');
    let todayObserver = null;
    
    const pillsContainer = document.getElementById('subjectPillsContainer');
    const topicInput = document.getElementById('targetTopicInput');

    if (!gridEl || !sliderEl) return;

    let currentViewDate = new Date();
    currentViewDate.setDate(1); 
    let activeSelectedDateStr = null;
    let currentSheetSubjectId = null;

    // --- 1. DATA HELPERS ---
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    
    // Smart Contrast Calculator
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
        localStorage.setItem('plannerTargets', JSON.stringify(targs)); 
        updateHomeWidget(); 
        if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED'); 
    };

    const getCompleted = () => JSON.parse(localStorage.getItem('plannerCompleted')) || [];
    const saveCompleted = (arr) => {
        localStorage.setItem('plannerCompleted', JSON.stringify(arr));
        if (window.AppEvents) AppEvents.emit('PLANNER_UPDATED');
    };

    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    window.forcePlannerRefresh = () => { renderCalendarAndCards(true); updateHomeWidget(); };

    // --- 2. THE RENDER ENGINE ---
    const renderCalendarAndCards = (skipAutoScroll = false) => {
        gridEl.innerHTML = '';
        sliderEl.innerHTML = '';
        
        const targets = getTargets();
        const completed = getCompleted();
        const subjects = getSubjects();
        
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
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
            cell.id = `cal-cell-${dateKey}`;

            if (dateKey === todayStr) cell.classList.add('today');
            if (dateKey === activeSelectedDateStr) cell.classList.add('selected');

            if (dayTask) {
                if (dateObj <= todayObjReal) cell.classList.add('has-task'); 
                else cell.classList.add('future-task'); 
            }
            if (isCompleted) cell.classList.add('completed');

            cell.addEventListener('click', () => {
                document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                document.getElementById(`card-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

            card.addEventListener('click', () => {
                if (!dayTask) return; 
                if (dateObj > todayObjReal) { alert("Cannot mark future days as complete."); return; }

                let compArr = getCompleted();
                const currentlyCompleted = compArr.includes(dateKey);

                if (currentlyCompleted) {
                    compArr = compArr.filter(id => id !== dateKey);
                    card.classList.remove('completed');
                    cell.classList.remove('completed');
                } else {
                    compArr.push(dateKey);
                    card.classList.add('completed');
                    cell.classList.add('completed');
                    if (navigator.vibrate) navigator.vibrate(50);
                }
                saveCompleted(compArr);
            });

            sliderEl.appendChild(card);
        }

        // THE PRODUCTION FIX: Bulletproof Today Observer
        if (todayObserver) todayObserver.disconnect();
        const isCurrentMonth = (year === todayObjReal.getFullYear() && month === todayObjReal.getMonth());

        if (!isCurrentMonth) {
            returnTodayBtn.classList.remove('hidden');
        } else {
            const todayCard = document.getElementById(`card-${todayStr}`);
            if (todayCard) {
                todayObserver = new IntersectionObserver((entries) => {
                    // THE MAGIC LOCK: If the tab is display: none, ignore the observer completely!
                    const plannerTab = document.getElementById('tab-planner');
                    if (!plannerTab || !plannerTab.classList.contains('active')) return;

                    entries[0].isIntersecting ? returnTodayBtn.classList.add('hidden') : returnTodayBtn.classList.remove('hidden');
                }, { root: sliderEl, threshold: 0.1 });
                todayObserver.observe(todayCard);
            }
        }

        if (!skipAutoScroll) {
            setTimeout(() => document.getElementById(`card-${todayStr}`)?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' }), 50);
        }
    };

    // --- 3. BOTTOM SHEET LOGIC ---
    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const targets = getTargets();
        const subjects = getSubjects();
        currentSheetSubjectId = targets[dateStr] ? targets[dateStr].subjectId : subjects[0].id;

        pillsContainer.innerHTML = '';
        subjects.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = `subject-pill ${sub.id === currentSheetSubjectId ? 'active' : ''}`;
            btn.textContent = sub.name;
            
            if (sub.id === currentSheetSubjectId) {
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = getContrastColor(sub.color);
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                currentSheetSubjectId = sub.id;
                
                pillsContainer.querySelectorAll('.subject-pill').forEach(p => {
                    p.classList.remove('active');
                    p.style.cssText = ''; 
                });
                
                btn.classList.add('active');
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = getContrastColor(sub.color);
            });
            pillsContainer.appendChild(btn);
        });

        topicInput.value = targets[dateStr] ? (targets[dateStr].topic || '') : '';
        AppEvents.emit('TAB_CHANGED', { tab: 'hide-nav' }); 
        sliderEl.classList.add('hidden');
        sheet.classList.add('active');
    };

    const closeBottomSheet = () => {
        sheet.classList.remove('active');
        sheet.style.transform = ''; 
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        AppEvents.emit('TAB_CHANGED', { tab: 'show-nav' }); 
        sliderEl.classList.remove('hidden');
    };

    document.getElementById('saveTargetBtn').addEventListener('click', () => {
        const textInput = topicInput.value.trim();
        if (!textInput) { alert("Please enter a target to save."); return; }
        const targets = getTargets();
        targets[activeSelectedDateStr] = { subjectId: currentSheetSubjectId, topic: textInput };
        saveTargets(targets);
        closeBottomSheet();
        renderCalendarAndCards(true);
    });

    document.getElementById('clearTargetBtn').addEventListener('click', () => {
        const targets = getTargets();
        delete targets[activeSelectedDateStr];
        saveTargets(targets);
        closeBottomSheet();
        renderCalendarAndCards(true);
    });

    // --- 4. TIGHTENED DRAG PHYSICS ---
    let startY = 0;
    let currentY = 0;
    dragZone.addEventListener('touchstart', (e) => startY = e.touches[0].clientY, { passive: true });
    dragZone.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            e.preventDefault(); // Locks the screen from scrolling behind the sheet
            sheet.style.transform = `translateY(${deltaY}px)`;
            sheet.style.transition = 'none';
        }
    }, { passive: false }); 
    dragZone.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        if (currentY - startY > 60) closeBottomSheet(); 
        else sheet.style.transform = ''; 
    });

    // --- 5. BULLETPROOF CALENDAR SWIPING ---
    let calTouchStartX = 0;
    calWrapper.addEventListener('touchstart', (e) => calTouchStartX = e.changedTouches[0].screenX, { passive: true });
    calWrapper.addEventListener('touchend', (e) => {
        const calTouchEndX = e.changedTouches[0].screenX;
        if (calTouchEndX < calTouchStartX - 60) { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(true); }
        if (calTouchEndX > calTouchStartX + 60) { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(true); }
    }, { passive: true });

    // --- 6. HOME WIDGET LINK ---
    const updateHomeWidget = () => {
        const taskContainer = document.getElementById('dashTaskContainer');
        const widgetCard = document.getElementById('homeTargetWidget');
        if(!taskContainer) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const todayStr = getDateKey(new Date());
        const dayTask = targets[todayStr];

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

    // --- 7. BUTTON NAV & EVENT LISTENERS ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(true); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(true); });

    // THE PRODUCTION FIX: Smooth scroll to today if already in the DOM!
    returnTodayBtn.addEventListener('click', () => {
        const todayStr = getDateKey(new Date());
        const todayCard = document.getElementById(`card-${todayStr}`);
        
        if (todayCard) {
            // Smoothly slide over if we are still in the current month
            todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            // Rebuild and jump instantly if we are in a different month
            currentViewDate = new Date();
            currentViewDate.setDate(1); 
            activeSelectedDateStr = null; 
            renderCalendarAndCards(false); 
        }
        if (navigator.vibrate) navigator.vibrate(50);
    });

    // Boot
    renderCalendarAndCards();
    updateHomeWidget();
}