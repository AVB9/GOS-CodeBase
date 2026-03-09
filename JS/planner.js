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
    const editBtn = document.getElementById('sheetEditBtn');
    const bottomNav = document.getElementById('bottomNav');

    if (!gridEl || !sliderEl) return;

    let currentViewDate = new Date();
    currentViewDate.setDate(1); 
    let activeSelectedDateStr = null;

    // --- DATA HELPERS ---
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    const saveSubjects = (subs) => localStorage.setItem('plannerSubjects', JSON.stringify(subs));
    
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

        const todayStr = getDateKey(new Date());

        // Fill empty spaces for Calendar
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

            if (targets[dateKey]) cell.classList.add('has-task');
            if (completed.includes(dateKey)) cell.classList.add('completed');

            cell.addEventListener('click', () => {
                document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                
                // Snap slider to the clicked date
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
            const data = targets[dateKey];
            
            let cardContentHTML = `<span class="agenda-empty" style="color: var(--color-text-muted); font-style: italic;">Tap to mark complete</span>`;
            
            if (data) {
                const subjectObj = subjects.find(s => s.id === data.subjectId) || subjects[0];
                cardContentHTML = `
                    <div class="subject-tag" style="background-color: ${subjectObj.color};">${subjectObj.name}</div>
                    <div class="daily-card-topic">${data.topic || 'No topic details'}</div>
                `;
            } else if (completed.includes(dateKey)) {
                cardContentHTML = `<span style="color: #1fcc61; font-weight: bold;">Completed</span>`;
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
                let compArr = getCompleted();
                if (compArr.includes(dateKey)) {
                    compArr = compArr.filter(id => id !== dateKey);
                } else {
                    compArr.push(dateKey);
                    // Confetti trigger if you want!
                    if (navigator.vibrate) navigator.vibrate(50);
                }
                saveCompleted(compArr);
                renderCalendarAndCards(); // Refresh UI
            });

            sliderEl.appendChild(card);
        }

        // Auto-scroll to today on initial load
        setTimeout(() => {
            const todayCard = document.getElementById(`card-${todayStr}`);
            if(todayCard) todayCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        }, 100);
    };

    // --- MONTH NAVIGATION ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendarAndCards(); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendarAndCards(); });

    // --- BOTTOM SHEET LOGIC ---
    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const targets = getTargets();
        const subjects = getSubjects();
        const data = targets[dateStr];

        if (data) {
            const subjectObj = subjects.find(s => s.id === data.subjectId) || subjects[0];
            sheetContent.innerHTML = `
                <div class="subject-tag" style="background-color: ${subjectObj.color}; padding: 6px 12px; font-size: 0.9rem;">${subjectObj.name}</div>
                <div style="font-size: 1.1rem; color: var(--color-text); margin-top: 15px; line-height: 1.5;">${data.topic || 'No topic details provided.'}</div>
            `;
        } else {
            sheetContent.innerHTML = `<div class="agenda-empty" style="text-align:center; margin-top: 20px;">No target set. Tap edit to add one.</div>`;
        }

        // HIDE Nav Pill and Slider, SHOW Bottom Sheet
        if (bottomNav) bottomNav.classList.add('nav-hidden');
        sliderEl.classList.add('hidden');
        sheet.classList.add('active');
    };

    const closeBottomSheet = () => {
        sheet.classList.remove('active');
        sheet.style.transform = ''; // Reset physics
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        
        // SHOW Nav Pill and Slider
        if (bottomNav) bottomNav.classList.remove('nav-hidden');
        sliderEl.classList.remove('hidden');
    };

    editBtn.addEventListener('click', () => {
        const targets = getTargets();
        if (window.openTargetModalRaw) {
            window.openTargetModalRaw(activeSelectedDateStr, new Date(activeSelectedDateStr), targets[activeSelectedDateStr]);
        }
    });

    // Sheet Swipe Down Physics
    let startY = 0;
    let currentY = 0;
    
    sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            sheet.style.transform = `translateY(${deltaY}px)`;
            sheet.style.transition = 'none';
        }
    });
    sheet.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        if (currentY - startY > 80) {
            closeBottomSheet(); // Dragged down enough to close
        } else {
            sheet.style.transform = ''; // Snap back
        }
    });

    // Update Global Modal Saver
    window.openTargetModalRaw = (dateStr, dateObj, existingData) => {
        const targetModal = document.getElementById('targetModalOverlay');
        const selectEl = document.getElementById('targetSubjectSelect');
        const topicInput = document.getElementById('targetTopicInput');
        
        document.getElementById('targetModalTitle').textContent = `Plan: ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        selectEl.innerHTML = '';
        getSubjects().forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id; opt.textContent = sub.name; selectEl.appendChild(opt);
        });

        if (existingData) { selectEl.value = existingData.subjectId; topicInput.value = existingData.topic || ''; } 
        else { topicInput.value = ''; }
        
        targetModal.style.display = 'flex';
        
        const saveBtn = document.getElementById('saveTargetBtn');
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        
        newSave.addEventListener('click', () => {
            const targets = getTargets();
            targets[dateStr] = { subjectId: selectEl.value, topic: topicInput.value.trim() };
            saveTargets(targets);
            targetModal.style.display = 'none';
            renderCalendarAndCards();
            openBottomSheet(dateStr, dateObj); 
        });
    };

    // Boot
    renderCalendarAndCards();
}