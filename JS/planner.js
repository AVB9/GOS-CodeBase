document.addEventListener('DOMContentLoaded', () => {
    initPlannerTab();
});

function initPlannerTab() {
    const listEl = document.getElementById('agendaList');
    const prevMonthBtn = document.getElementById('plannerPrevMonth');
    const nextMonthBtn = document.getElementById('plannerNextMonth');
    const monthDisplay = document.getElementById('plannerMonthDisplay');
    
    // Modals
    const targetModal = document.getElementById('targetModalOverlay');
    const subjectModal = document.getElementById('subjectModalOverlay');

    if (!listEl) return;

    let currentViewDate = new Date();
    currentViewDate.setDate(1); // Always look at the 1st of the month
    
    let activeEditDateStr = null;

    // --- DATA MANAGEMENT ---
    // Default Subjects
    const defaultSubjects = [{ id: 'off', name: 'Day Off', color: '#555555' }];
    
    const getSubjects = () => JSON.parse(localStorage.getItem('plannerSubjects')) || defaultSubjects;
    const saveSubjects = (subs) => localStorage.setItem('plannerSubjects', JSON.stringify(subs));
    
    const getTargets = () => JSON.parse(localStorage.getItem('plannerTargets')) || {};
    const saveTargets = (targs) => {
        localStorage.setItem('plannerTargets', JSON.stringify(targs));
        updateHomeWidget(); // Instantly update home screen!
    };

    // Helper: Date String
    const getDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // --- RENDER AGENDA ---
    const renderAgenda = () => {
        listEl.innerHTML = '';
        const targets = getTargets();
        const subjects = getSubjects();
        
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        
        monthDisplay.textContent = currentViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const todayStr = getDateKey(new Date());

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateKey = getDateKey(dateObj);
            const isToday = dateKey === todayStr;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            const targetData = targets[dateKey];
            let subjectObj = null;
            if (targetData) {
                subjectObj = subjects.find(s => s.id === targetData.subjectId) || subjects[0];
            }

            const div = document.createElement('div');
            div.className = `agenda-item ${isToday ? 'is-today' : ''}`;
            
            let contentHTML = `<span class="agenda-empty">Tap to set target...</span>`;
            if (subjectObj) {
                const topicText = targetData.topic ? `<div class="agenda-topic">${targetData.topic}</div>` : '';
                contentHTML = `
                    <div class="subject-tag" style="background-color: ${subjectObj.color};">${subjectObj.name}</div>
                    ${topicText}
                `;
            }

            div.innerHTML = `
                <div class="agenda-date">
                    <span class="day-name">${dayName}</span>
                    <span class="day-num">${d}</span>
                </div>
                <div class="agenda-content">
                    ${contentHTML}
                </div>
            `;

            div.addEventListener('click', () => openTargetModal(dateKey, dateObj, targetData));
            listEl.appendChild(div);
            
            // Auto-scroll to today if looking at current month
            if (isToday) {
                setTimeout(() => div.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        }
    };

    // --- MONTH NAVIGATION ---
    prevMonthBtn.addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderAgenda(); });
    nextMonthBtn.addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderAgenda(); });

    // --- TARGET MODAL LOGIC ---
    const selectEl = document.getElementById('targetSubjectSelect');
    const topicInput = document.getElementById('targetTopicInput');

    const openTargetModal = (dateStr, dateObj, existingData) => {
        activeEditDateStr = dateStr;
        document.getElementById('targetModalTitle').textContent = `Plan: ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        // Populate Select
        selectEl.innerHTML = '';
        getSubjects().forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            selectEl.appendChild(opt);
        });

        if (existingData) {
            selectEl.value = existingData.subjectId;
            topicInput.value = existingData.topic || '';
        } else {
            topicInput.value = '';
        }

        targetModal.style.display = 'flex';
    };

    document.getElementById('closeTargetModalBtn').addEventListener('click', () => targetModal.style.display = 'none');
    
    document.getElementById('clearTargetBtn').addEventListener('click', () => {
        const targets = getTargets();
        delete targets[activeEditDateStr];
        saveTargets(targets);
        targetModal.style.display = 'none';
        renderAgenda();
    });

    document.getElementById('saveTargetBtn').addEventListener('click', () => {
        const targets = getTargets();
        targets[activeEditDateStr] = {
            subjectId: selectEl.value,
            topic: topicInput.value.trim()
        };
        saveTargets(targets);
        targetModal.style.display = 'none';
        renderAgenda();
    });

    // --- SUBJECT MANAGER LOGIC ---
    const renderSubjectManager = () => {
        const subList = document.getElementById('subjectList');
        subList.innerHTML = '';
        const subjects = getSubjects();

        subjects.forEach(sub => {
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

        // Attach delete events
        document.querySelectorAll('.subject-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const newSubs = getSubjects().filter(s => s.id !== id);
                saveSubjects(newSubs);
                renderSubjectManager();
                renderAgenda(); // Refresh UI to reflect deleted tags
            });
        });
    };

    document.getElementById('manageSubjectsBtn').addEventListener('click', () => {
        renderSubjectManager();
        subjectModal.style.display = 'flex';
    });
    
    document.getElementById('closeSubjectModalBtn').addEventListener('click', () => subjectModal.style.display = 'none');

    document.getElementById('addSubjectBtn').addEventListener('click', () => {
        const nameInput = document.getElementById('newSubjectName');
        const colorInput = document.getElementById('newSubjectColor');
        const name = nameInput.value.trim();
        
        if (name) {
            const subjects = getSubjects();
            subjects.push({
                id: 'sub_' + Date.now(),
                name: name,
                color: colorInput.value
            });
            saveSubjects(subjects);
            nameInput.value = '';
            renderSubjectManager();
        }
    });

    // --- GLOBAL: UPDATE HOME WIDGET ---
    window.updateHomeWidget = () => {
        const targetValue = document.getElementById('targetValue');
        const targetSubText = document.getElementById('targetSubText');
        if(!targetValue || !targetSubText) return;

        const targets = getTargets();
        const subjects = getSubjects();
        const todayStr = getDateKey(new Date());
        const todayData = targets[todayStr];

        if (todayData) {
            const subjectObj = subjects.find(s => s.id === todayData.subjectId) || subjects[0];
            targetValue.textContent = subjectObj.name;
            targetValue.style.color = subjectObj.color;
            targetSubText.textContent = todayData.topic || 'No specific topic';
        } else {
            targetValue.textContent = '---';
            targetValue.style.color = 'var(--color-primary)';
            targetSubText.textContent = 'No target set for today.';
        }
    };

    // Boot
    renderAgenda();
    window.updateHomeWidget();
}