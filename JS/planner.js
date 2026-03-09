document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    const gridEl = document.getElementById('miniCalGrid');
    const sliderEl = document.getElementById('dailySlider');
    const monthDisplay = document.getElementById('plannerMonthDisplay');
    const sheet = document.getElementById('agendaBottomSheet');
    const sheetContent = document.getElementById('sheetContent');
    const sheetDateDisplay = document.getElementById('sheetDateDisplay');
    const bottomNav = document.getElementById('bottomNav');

    if (!gridEl || !sliderEl) return;

    let currentViewDate = new Date();
    currentViewDate.setDate(1); 
    let activeSelectedDateStr = null;

    // --- DATA HELPERS ---
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    const saveSubjects = (subs) => localStorage.setItem('plannerSubjects', JSON.stringify(subs));
    
    // Targets: { "2026-03-10": [{ id, subjectId, topic }] } (Time removed)
    const getTargets = () => JSON.parse(localStorage.getItem('plannerTargets')) || {};
    const saveTargets = (targs) => { localStorage.setItem('plannerTargets', JSON.stringify(targs)); window.updateHomeWidget(); };

    const getCompleted = () => JSON.parse(localStorage.getItem('plannerCompleted')) || [];
    const saveCompleted = (arr) => localStorage.setItem('plannerCompleted', JSON.stringify(arr));

    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // --- RENDER MINI CALENDAR & DAILY CARDS ---
    const renderCalendarAndCards = () => {
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
            
            // 1. Build Calendar Cell
            const cell = document.createElement('div');
            cell.className = 'cal-day';
            cell.textContent = d;

            if (dateKey === todayStr) cell.classList.add('today');
            if (dateKey === activeSelectedDateStr) cell.classList.add('selected');

            const dayTasks = targets[dateKey] || [];
            if (dayTasks.length > 0) cell.classList.add('has-task');
            if (completed.includes(dateKey)) cell.classList.add('completed');

            cell.addEventListener('click', () => {
                document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                
                const targetCard = document.getElementById(`card-${dateKey}`);
                if(targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                
                openBottomSheet(dateKey, dateObj);
            });
            gridEl.appendChild(cell);

            // 2. Build Daily Slider Card
            const card = document.createElement('div');
            card.className = `daily-card ${completed.includes(dateKey) ? 'completed' : ''}`;
            card.id = `card-${dateKey}`;
            
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            let cardContentHTML = `<span class="agenda-empty" style="color: var(--color-text-muted); font-style: italic;">Tap to plan this day</span>`;
            
            if (dayTasks.length > 0) {
                // Render session playlist on the card without times
                cardContentHTML = `<div style="display:flex; flex-direction:column; gap:8px;">` + 
                    dayTasks.map((t, index) => {
                        const sub = subjects.find(s => s.id === t.subjectId) || subjects[0];
                        return `<div style="display:flex; gap:8px; align-items:flex-start;">
                            <span style="font-size:0.75rem; color:var(--color-text-muted); min-width: 15px; margin-top: 2px;">${index + 1}.</span>
                            <div style="display:flex; flex-direction:column; gap: 4px;">
                                <span class="subject-tag" style="background-color:${sub.color};">${sub.name}</span>
                                <span class="daily-card-topic" style="font-size:0.9rem; white-space: normal;">${t.topic}</span>
                            </div>
                        </div>`;
                    }).join('') + `</div>`;
            } else if (completed.includes(dateKey)) {
                cardContentHTML = `<span style="color: #1fcc61; font-weight: bold;">Day Marked Complete</span>`;
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

            // Card Click = Toggle Complete (If not future)
            card.addEventListener('click', () => {
                if (dateObj > todayObjReal) {
                    alert("Cannot mark future days as complete.");
                    return;
                }

                let compArr = getCompleted();
                if (compArr.includes(dateKey)) {
                    compArr = compArr.filter(id => id !== dateKey);
                } else {
                    compArr.push(dateKey);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
                saveCompleted(compArr);
                renderCalendarAndCards(); 

                if (dateKey !== todayStr) {
                    setTimeout(() => {
                        const todayCard = document.getElementById(`card-${todayStr}`);
                        if(todayCard) todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }, 400);
                }
            });

            sliderEl.appendChild(card);
        }

        setTimeout(() => {
            const todayCard = document.getElementById(`card-${todayStr}`);
            if(todayCard) todayCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        }, 100);
    };

    // --- BOTTOM SHEET LOGIC (SESSION PLAYLIST) ---
    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        renderSheetContent();
        
        if (bottomNav) bottomNav.classList.add('nav-hidden');
        sliderEl.classList.add('hidden');
        sheet.classList.add('active');
    };

    const renderSheetContent = () => {
        const targets = getTargets();
        const subjects = getSubjects();
        const dayTasks = targets[activeSelectedDateStr] || [];

        // Simplified UI without time inputs
        let html = `
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 15px; border: 1px solid var(--color-glass-border);">
                <select id="hourlySubject" class="settings-input" style="padding: 12px 15px; width: 100%;">
                    ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="hourlyTopic" class="settings-input" style="padding: 12px 15px; flex: 1;" placeholder="What to study? (e.g., Kinematics)">
                    <button id="addHourlyBtn" class="btn-primary" style="padding: 12px 25px;">Add</button>
                </div>
            </div>
            <div id="hourlyTaskList" style="display: flex; flex-direction: column; gap: 10px;">
        `;

        if (dayTasks.length === 0) {
            html += `<div class="agenda-empty" style="text-align:center; margin-top: 10px;">No sessions planned yet.</div>`;
        } else {
            dayTasks.forEach((task, index) => {
                const sub = subjects.find(s => s.id === task.subjectId) || subjects[0];
                html += `
                    <div style="display: flex; gap: 15px; align-items: center; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; border: 1px solid var(--color-glass-border);">
                        <div style="font-weight: 800; font-size: 1.1rem; color: var(--color-text-muted); opacity: 0.5;">${index + 1}</div>
                        <div style="display: flex; flex-direction: column; gap: 5px; flex: 1; overflow: hidden;">
                            <span class="subject-tag" style="background-color: ${sub.color};">${sub.name}</span>
                            <span style="font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text);">${task.topic}</span>
                        </div>
                        <button class="icon-btn delete-hourly-btn" data-id="${task.id}" style="color: var(--color-text-muted); font-size: 1.5rem; padding: 0 5px;">×</button>
                    </div>
                `;
            });
        }
        html += `</div>`;
        sheetContent.innerHTML = html;

        // Attach Add Event
        document.getElementById('addHourlyBtn').addEventListener('click', () => {
            const sInput = document.getElementById('hourlySubject').value;
            const textInput = document.getElementById('hourlyTopic').value.trim();

            if (!textInput) {
                alert("Please enter a topic to study.");
                return;
            }

            const targets = getTargets();
            if (!targets[activeSelectedDateStr]) targets[activeSelectedDateStr] = [];
            
            // Push to the array (no time needed, order dictates sequence)
            targets[activeSelectedDateStr].push({
                id: 'task_' + Date.now(),
                subjectId: sInput,
                topic: textInput
            });

            saveTargets(targets);
            renderSheetContent();
            renderCalendarAndCards();
        });

        // Attach Delete Events
        document.querySelectorAll('.delete-hourly-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.getAttribute('data-id');
                const targets = getTargets();
                targets[activeSelectedDateStr] = targets[activeSelectedDateStr].filter(t => t.id !== taskId);
                
                if (targets[activeSelectedDateStr].length === 0) delete targets[activeSelectedDateStr];
                
                saveTargets(targets);
                renderSheetContent();
                renderCalendarAndCards();
            });
        });
    };

    const closeBottomSheet = () => {
        sheet.classList.remove('active');
        sheet.style.transform = ''; 
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        if (bottomNav) bottomNav.classList.remove('nav-hidden');
        sliderEl.classList.remove('hidden');
    };

    // Sheet Swipe Down Physics
    let startY = 0;
    let currentY = 0;
    sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0 && sheetContent.scrollTop === 0) {
            sheet.style.transform = `translateY(${deltaY}px)`;
            sheet.style.transition = 'none';
        }
    });
    sheet.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        if (currentY - startY > 100 && sheetContent.scrollTop === 0) {
            closeBottomSheet(); 
        } else {
            sheet.style.transform = ''; 
        }
    });

    // --- HOME WIDGET UPDATE LOGIC ---
    window.updateHomeWidget = () => {
        const targetValue = document.getElementById('targetValue');
        const targetSubText = document.getElementById('targetSubText');
        if(!targetValue || !targetSubText) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const todayStr = getDateKey(new Date());
        const dayTasks = targets[todayStr] || [];

        if (dayTasks.length > 0) {
            targetValue.style.display = 'none'; 
            
            targetSubText.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px; margin-top: 5px;">` + 
                dayTasks.slice(0, 3).map((t, index) => {
                    const sub = subjects.find(s => s.id === t.subjectId) || subjects[0];
                    return `<div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-size:0.8rem; font-weight: 800; color:var(--color-text-muted); opacity: 0.6;">${index + 1}.</span>
                        <span class="subject-tag" style="background-color:${sub.color}; font-size:0.65rem;">${sub.name}</span>
                        <span style="font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--color-text);">${t.topic}</span>
                    </div>`;
                }).join('') + `</div>`;
        } else {
            targetValue.style.display = 'block';
            targetValue.textContent = '---';
            targetValue.style.color = 'var(--color-primary)';
            targetSubText.innerHTML = 'No target set for today.';
        }
    };

    // --- MONTH NAVIGATION ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(); });

    // Boot
    renderCalendarAndCards();
    window.updateHomeWidget();
}