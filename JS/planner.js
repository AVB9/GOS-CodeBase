document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    const gridEl = document.getElementById('miniCalGrid');
    const monthDisplay = document.getElementById('plannerMonthDisplay');
    const sheet = document.getElementById('agendaBottomSheet');
    const sheetContent = document.getElementById('sheetContent');
    const sheetDateDisplay = document.getElementById('sheetDateDisplay');
    const completeBtn = document.getElementById('sheetCompleteBtn');
    const editBtn = document.getElementById('sheetEditBtn');
    
    // Progress
    const progressBar = document.getElementById('plannerProgressBar');
    const progressText = document.getElementById('plannerProgressText');

    if (!gridEl) return;

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

    // --- RENDER MINI CALENDAR ---
    const renderCalendar = () => {
        gridEl.innerHTML = '';
        const targets = getTargets();
        const completed = getCompleted();
        
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        monthDisplay.textContent = currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startDay = new Date(year, month, 1).getDay();
        if (startDay === 0) startDay = 7; // Make Monday = 1, Sunday = 7

        const todayStr = getDateKey(new Date());

        // Fill empty spaces before 1st of month
        for(let i = 1; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            gridEl.appendChild(empty);
        }

        let tasksThisMonth = 0;
        let completedThisMonth = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateKey = getDateKey(dateObj);
            
            const cell = document.createElement('div');
            cell.className = 'cal-day';
            cell.textContent = d;

            if (dateKey === todayStr) cell.classList.add('today');
            if (dateKey === activeSelectedDateStr) cell.classList.add('selected');

            // Data checks
            if (targets[dateKey]) {
                cell.classList.add('has-task');
                tasksThisMonth++;
            }
            if (completed.includes(dateKey)) {
                cell.classList.add('completed');
                if (targets[dateKey]) completedThisMonth++;
            }

            cell.addEventListener('click', () => {
                // Remove selected class from others
                document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                openBottomSheet(dateKey, dateObj);
            });

            gridEl.appendChild(cell);
        }

        updateProgressBar(completedThisMonth, tasksThisMonth);
    };

    const updateProgressBar = (done, total) => {
        if (total === 0) {
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        } else {
            const pct = Math.round((done / total) * 100);
            progressBar.style.width = `${pct}%`;
            progressText.textContent = `${pct}%`;
        }
    };

    // --- MONTH NAVIGATION ---
    document.getElementById('plannerPrevMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('plannerNextMonth').addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); });

    // --- BOTTOM SHEET LOGIC ---
    const openBottomSheet = (dateStr, dateObj) => {
        activeSelectedDateStr = dateStr;
        sheetDateDisplay.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const targets = getTargets();
        const subjects = getSubjects();
        const completed = getCompleted();
        const data = targets[dateStr];

        // Update Complete Button State
        if (completed.includes(dateStr)) {
            completeBtn.classList.add('btn-complete-active');
        } else {
            completeBtn.classList.remove('btn-complete-active');
        }

        if (data) {
            const subjectObj = subjects.find(s => s.id === data.subjectId) || subjects[0];
            sheetContent.innerHTML = `
                <div class="subject-tag" style="background-color: ${subjectObj.color}; font-size: 0.8rem; padding: 5px 10px;">${subjectObj.name}</div>
                <div style="font-size: 1.1rem; color: var(--color-text); margin-top: 10px;">${data.topic || 'No topic details provided.'}</div>
            `;
        } else {
            sheetContent.innerHTML = `<div class="agenda-empty" style="text-align:center; margin-top: 20px;">No target set for this day. Tap edit to add one.</div>`;
        }

        sheet.classList.add('active');
    };

    // Complete Button Action
    completeBtn.addEventListener('click', () => {
        if (!activeSelectedDateStr) return;
        let completed = getCompleted();
        
        if (completed.includes(activeSelectedDateStr)) {
            completed = completed.filter(d => d !== activeSelectedDateStr);
        } else {
            completed.push(activeSelectedDateStr);
        }
        
        saveCompleted(completed);
        openBottomSheet(activeSelectedDateStr, new Date(activeSelectedDateStr)); // Refresh sheet
        renderCalendar(); // Refresh dots/colors
    });

    // Edit Button Action (Triggers your existing target modal)
    editBtn.addEventListener('click', () => {
        const targets = getTargets();
        // Uses the globally available function from our previous implementation
        if (window.openTargetModalRaw) {
            window.openTargetModalRaw(activeSelectedDateStr, new Date(activeSelectedDateStr), targets[activeSelectedDateStr]);
        }
    });

    // Sheet Swipe Down Physics
    let startY = 0;
    let currentY = 0;
    
    sheet.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) { // Only allow dragging down
            sheet.style.transform = `translateY(${deltaY}px)`;
            sheet.style.transition = 'none';
        }
    });

    sheet.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        if (currentY - startY > 100) {
            // Dragged far enough down -> Close it
            sheet.classList.remove('active');
            sheet.style.transform = '';
            document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        } else {
            // Snap back up
            sheet.style.transform = '';
        }
    });

    // We need to slightly adjust our previous modal opener to be globally accessible
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
        
        // We temporarily hijack the save button logic to work seamlessly with the new architecture
        const saveBtn = document.getElementById('saveTargetBtn');
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        
        newSave.addEventListener('click', () => {
            const targets = getTargets();
            targets[dateStr] = { subjectId: selectEl.value, topic: topicInput.value.trim() };
            saveTargets(targets);
            targetModal.style.display = 'none';
            renderCalendar();
            openBottomSheet(dateStr, dateObj); // Update the sheet we are looking at
        });
    };

    // Boot
    renderCalendar();
}