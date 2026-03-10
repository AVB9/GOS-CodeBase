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
    
    const returnTodayBtn = document.getElementById('returnTodayBtn');
    let todayObserver = null;
    
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
    
    // NEW: Smart Contrast Calculator (Returns black or white based on background brightness)
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
                const textColor = getContrastColor(sub.color); // Calculates optimal text color
                
                cardContentHTML = `
                    <div style="display:flex; flex-direction:column; gap: 8px;">
                        <span class="subject-tag" style="background-color:${sub.color}; color:${textColor};">${sub.name}</span>
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
                
                const currentScroll = sliderEl.scrollLeft;
                renderCalendarAndCards(true); 
                sliderEl.scrollLeft = currentScroll;
                
                setTimeout(() => {
                    const currentCard = document.getElementById(`card-${dateKey}`);
                    if(currentCard) currentCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                }, 10);
            });

            sliderEl.appendChild(card);
        }

        // --- SMART "TODAY" BUTTON LOGIC ---
        if (todayObserver) todayObserver.disconnect();
        
        const isCurrentMonth = (year === todayObjReal.getFullYear() && month === todayObjReal.getMonth());

        if (!isCurrentMonth) {
            returnTodayBtn.classList.remove('hidden');
        } else {
            const todayCard = document.getElementById(`card-${todayStr}`);
            if (todayCard) {
                todayObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) returnTodayBtn.classList.add('hidden');
                    else returnTodayBtn.classList.remove('hidden');
                }, { root: sliderEl, threshold: 0.1 });
                todayObserver.observe(todayCard);
            }
        }

        // Original Auto-Scroll
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
        
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
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
                btn.style.color = getContrastColor(sub.color); // Smart text color
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
                btn.style.color = getContrastColor(sub.color); // Smart text color
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

// --- HOME WIDGET UPDATE LOGIC (NEET OS EXACT MATCH) ---
    window.updateHomeWidget = () => {
        const taskContainer = document.getElementById('dashTaskContainer');
        const widgetCard = document.getElementById('homeTargetWidget');
        if(!taskContainer) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const todayStr = getDateKey(new Date());
        const dayTask = targets[todayStr];

        // If there is a task AND it's not the "Day Off" subject
        if (dayTask && dayTask.subjectId !== 'off') {
            const sub = subjects.find(s => s.id === dayTask.subjectId) || subjects[0];
            
            taskContainer.innerHTML = `
                <div class="task-preview" style="border-left-color: ${sub.color};">
                    <div class="task-preview-subject" style="color: ${sub.color};">${sub.name}</div>
                    <div class="task-preview-topic">${dayTask.topic}</div>
                </div>
            `;
        } else {
            // Naked NEET OS State: No vertical line, just muted text
            taskContainer.innerHTML = `<div style="color:var(--color-text-muted); margin-top:10px;">No task scheduled for today.</div>`;
        }

        // Add the click-to-navigate functionality
        if (widgetCard && !widgetCard.dataset.wired) {
            widgetCard.dataset.wired = "true"; 
            widgetCard.addEventListener('click', () => {
                const plannerNavBtn = document.querySelector('.bottom-pill-btn[data-target="tab-planner"]');
                if (plannerNavBtn) plannerNavBtn.click(); 
            });
        }
    };

    // --- BUTTON NAV ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(true); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(true); });

    returnTodayBtn.addEventListener('click', () => {
        currentViewDate = new Date();
        currentViewDate.setDate(1); 
        
        activeSelectedDateStr = null; 
        
        renderCalendarAndCards(false); 
        if (navigator.vibrate) navigator.vibrate(50);
    });

    // Boot
    renderCalendarAndCards();
    window.updateHomeWidget();
    
    // --- FIX: SCROLL TO TODAY WHEN TAB BECOMES VISIBLE ---
    const plannerTab = document.getElementById('tab-planner');
    if (plannerTab) {
        const tabObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                // The moment the tab is actually displayed on screen, scroll to today!
                const todayStr = getDateKey(new Date());
                const todayCard = document.getElementById(`card-${todayStr}`);
                
                if (todayCard) {
                    // A tiny 50ms delay ensures the browser has fully painted the CSS before scrolling
                    setTimeout(() => {
                        todayCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                    }, 50);
                }
            }
        }, { threshold: 0.01 }); // Triggers as soon as 1% of the tab is visible
        
        tabObserver.observe(plannerTab);
    }
}