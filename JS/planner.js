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
    const bottomNav = document.getElementById('bottomNav');
    
    const pillsContainer = document.getElementById('subjectPillsContainer');
    const topicInput = document.getElementById('targetTopicInput');

    if (!gridEl || !sliderEl) return;

    let currentViewDate = new Date();
    currentViewDate.setDate(1); 
    let activeSelectedDateStr = null;
    let currentSheetSubjectId = null;

    // --- DATA HELPERS ---
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    
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

    window.forcePlannerRefresh = () => renderCalendarAndCards(true);

    // --- RENDER MINI CALENDAR & DAILY CARDS ---
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
            
            // 1. Build Calendar Cell
            const cell = document.createElement('div');
            cell.className = 'cal-day';
            cell.textContent = d;

            if (dateKey === todayStr) cell.classList.add('today');
            if (dateKey === activeSelectedDateStr) cell.classList.add('selected');

            const dayTask = targets[dateKey];
            
            // Apply new aesthetic CSS states
            if (dayTask) cell.classList.add('has-task');
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
            
            if (dayTask) {
                const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
                cardContentHTML = `
                    <div style="display:flex; flex-direction:column; gap: 8px;">
                        <span class="subject-tag" style="background-color:${sub.color};">${sub.name}</span>
                        <span class="daily-card-topic">${dayTask.topic || 'No topic details'}</span>
                    </div>
                `;
            } else if (completed.includes(dateKey)) {
                cardContentHTML = `<span style="color: #1fcc61; font-weight: bold; font-size: 1.1rem;">Day Marked Complete</span>`;
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

            // Card Click = Toggle Complete
            card.addEventListener('click', () => {
                if (dateObj > todayObjReal) { alert("Cannot mark future days as complete."); return; }

                let compArr = getCompleted();
                if (compArr.includes(dateKey)) compArr = compArr.filter(id => id !== dateKey);
                else {
                    compArr.push(dateKey);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
                saveCompleted(compArr);
                
                // Freeze the exact scroll position
                const currentScroll = sliderEl.scrollLeft;
                renderCalendarAndCards(true); // Pass true to skip auto-scroll
                sliderEl.scrollLeft = currentScroll;
                
                // Keep UI snapped exactly on the clicked card
                setTimeout(() => {
                    const currentCard = document.getElementById(`card-${dateKey}`);
                    if(currentCard) currentCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                }, 10);
            });

            sliderEl.appendChild(card);
        }

        if (!skipAutoScroll) {
            setTimeout(() => {
                const todayCard = document.getElementById(`card-${todayStr}`);
                if(todayCard) todayCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            }, 100);
        }
    };

    // --- BOTTOM SHEET LOGIC ---
    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = `Plan: ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        const targets = getTargets();
        const existingData = targets[dateStr];
        const subjects = getSubjects();

        currentSheetSubjectId = existingData ? existingData.subjectId : subjects[0].id;

        pillsContainer.innerHTML = '';
        subjects.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = `subject-pill ${sub.id === currentSheetSubjectId ? 'active' : ''}`;
            btn.textContent = sub.name;
            
            if (sub.id === currentSheetSubjectId) {
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = '#ffffff';
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                currentSheetSubjectId = sub.id;
                
                pillsContainer.querySelectorAll('.subject-pill').forEach(p => {
                    p.classList.remove('active');
                    p.style.backgroundColor = '';
                    p.style.borderColor = '';
                    p.style.color = '';
                });
                
                btn.classList.add('active');
                btn.style.backgroundColor = sub.color;
                btn.style.borderColor = sub.color;
                btn.style.color = '#ffffff';
            });
            
            pillsContainer.appendChild(btn);
        });

        topicInput.value = existingData ? (existingData.topic || '') : '';
        
        if (bottomNav) bottomNav.classList.add('nav-hidden');
        sliderEl.classList.add('hidden');
        sheet.classList.add('active');
    };

    const closeBottomSheet = () => {
        sheet.classList.remove('active');
        sheet.style.transform = ''; 
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        if (bottomNav) bottomNav.classList.remove('nav-hidden');
        sliderEl.classList.remove('hidden');
    };

    // Save and Clear Targets
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

    // --- MASSIVE DRAG ZONE PHYSICS ---
    let startY = 0;
    let currentY = 0;
    dragZone.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    dragZone.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            sheet.style.transform = `translateY(${deltaY}px)`;
            sheet.style.transition = 'none';
        }
    });
    dragZone.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        if (currentY - startY > 60) closeBottomSheet(); 
        else sheet.style.transform = ''; 
    });

    // --- BULLETPROOF MINI CALENDAR SWIPING ---
    let calTouchStartX = 0;
    calWrapper.addEventListener('touchstart', (e) => { calTouchStartX = e.changedTouches[0].screenX; }, { passive: true });
    calWrapper.addEventListener('touchend', (e) => {
        const calTouchEndX = e.changedTouches[0].screenX;
        if (calTouchEndX < calTouchStartX - 60) {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(true);
        }
        if (calTouchEndX > calTouchStartX + 60) {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(true);
        }
    }, { passive: true });

    // --- HOME WIDGET UPDATE LOGIC ---
    window.updateHomeWidget = () => {
        const targetValue = document.getElementById('targetValue');
        const targetSubText = document.getElementById('targetSubText');
        if(!targetValue || !targetSubText) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const todayStr = getDateKey(new Date());
        const dayTask = targets[todayStr];

        if (dayTask) {
            const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
            targetValue.style.display = 'block'; 
            targetValue.textContent = sub.name;
            targetValue.style.color = sub.color;
            targetValue.style.fontSize = '1.8rem';
            targetSubText.innerHTML = `<div style="font-size: 0.95rem; color: var(--color-text); margin-top: 5px;">${dayTask.topic}</div>`;
        } else {
            targetValue.style.display = 'block';
            targetValue.textContent = '---';
            targetValue.style.color = 'var(--color-primary)';
            targetValue.style.fontSize = '2.5rem';
            targetSubText.innerHTML = 'No target set for today.';
        }
    };

    // --- BUTTON NAV ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(true); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(true); });

    // Boot
    renderCalendarAndCards();
    window.updateHomeWidget();
}