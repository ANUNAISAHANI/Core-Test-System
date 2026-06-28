// result-details.js - Enterprise Standard Sequential Report Parser (Fixed Execution)

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id');

    if (!resultId) {
        alert("🚨 Technical Log Error: No report token reference id detected!");
        window.location.href = 'dashboard.html';
        return;
    }

    // ==================== FETCH DETAILED INDIVIDUAL REPORT FROM SQL ====================
    fetch(`/api/get_result_detail/${resultId}`)
    .then(res => res.json())
    .then(data => {
        if (!data || !data.success) {
            document.getElementById('questionsReviewSection').innerHTML = '<p style="text-align:center; color:red;">No historical performance sheets found under this entry id parameter.</p>';
            return;
        }

        // Render Scoreboard Meta Metrics dynamically from mapped controller
        document.getElementById('reportTitle').textContent = `Performance Report Card: ${data.subject}`;
        document.getElementById('candidateName').textContent = data.studentName || currentUser.fullName;
        document.getElementById('subjectTag').textContent = data.subject;
        document.getElementById('scorePercentage').textContent = `${parseFloat(data.percentage).toFixed(2)}%`;
        document.getElementById('submissionTimestamp').textContent = data.submittedAt || "N/A";
        
        // Count total questions directly from the payload
        const totalQs = data.questions ? data.questions.length : 0;
        let correctCount = 0;
        if (data.questions) {
            data.questions.forEach(q => {
                if (String(q.selectedOption).trim().toUpperCase() === String(q.correctOption).trim().toUpperCase()) {
                    correctCount++;
                }
            });
        }

        document.getElementById('totalCorrect').textContent = `${correctCount} / ${totalQs}`;
        
        // Review container clear setup
        const reviewContainer = document.getElementById('questionsReviewSection');
        if (!reviewContainer) return;
        reviewContainer.innerHTML = '';

        if (!data.questions || data.questions.length === 0) {
            reviewContainer.innerHTML = '<p style="color:#e74c3c; font-style:italic; text-align:center;">⚠️ Notice: No question logs found under this exam submission.</p>';
            return;
        }

        const letters = ['A', 'B', 'C', 'D'];

        // 🎯 FIX: Explicitly sequential mapping loop directly over backend frozen order array
        data.questions.forEach((q, index) => {
            const studentAns = String(q.selectedOption || '').trim().toUpperCase();
            const correctAns = String(q.correctOption || '').trim().toUpperCase();
            
            const isUnattempted = studentAns === "" || studentAns === "NONE" || studentAns === "UNDEFINED";
            const isCorrect = !isUnattempted && (studentAns === correctAns);

            const questionBlock = document.createElement('div');
            questionBlock.style.cssText = `
                background: white; 
                padding: 1.5rem; 
                border-radius: 12px; 
                margin-bottom: 1.2rem; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                border-left: 6px solid ${isCorrect ? '#2ecc71' : isUnattempted ? '#f1c40f' : '#e74c3c'};
            `;

            let evaluationStatusHtml = '';
            if (isCorrect) {
                evaluationStatusHtml = `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">✅ Correct Option Marked</span>`;
            } else if (isUnattempted) {
                evaluationStatusHtml = `<span style="background:#fef9e7; color:#b7950b; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">⚠️ Question Skipped</span>`;
            } else {
                evaluationStatusHtml = `<span style="background:#fdedec; color:#922b21; padding:2px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">❌ Wrong Option Marked</span>`;
            }

            // Options checking safely
            const optA = q.options ? (q.options['A'] || q.options[0] || '') : '';
            const optB = q.options ? (q.options['B'] || q.options[1] || '') : '';
            const optC = q.options ? (q.options['C'] || q.options[2] || '') : '';
            const optD = q.options ? (q.options['D'] || q.options[3] || '') : '';

            questionBlock.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#555;">Question Item #${index + 1}</strong>
                    ${evaluationStatusHtml}
                </div>
                <p style="font-size:1.05rem; font-weight:500; color:#333; margin-bottom:15px;">${escapeHtml(q.questionText)}</p>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; color:#555;">
                    <div style="padding:8px; border-radius:6px; background:${correctAns==='A' ? '#e8f5e9' : (studentAns==='A' ? '#fdedec' : '#f8f9fa')}; border:1px solid ${correctAns==='A' ? '#2ecc71' : '#eee'}">A: ${escapeHtml(optA)}</div>
                    <div style="padding:8px; border-radius:6px; background:${correctAns==='B' ? '#e8f5e9' : (studentAns==='B' ? '#fdedec' : '#f8f9fa')}; border:1px solid ${correctAns==='B' ? '#2ecc71' : '#eee'}">B: ${escapeHtml(optB)}</div>
                    <div style="padding:8px; border-radius:6px; background:${correctAns==='C' ? '#e8f5e9' : (studentAns==='C' ? '#fdedec' : '#f8f9fa')}; border:1px solid ${correctAns==='C' ? '#2ecc71' : '#eee'}">C: ${escapeHtml(optC)}</div>
                    <div style="padding:8px; border-radius:6px; background:${correctAns==='D' ? '#e8f5e9' : (studentAns==='D' ? '#fdedec' : '#f8f9fa')}; border:1px solid ${correctAns==='D' ? '#2ecc71' : '#eee'}">D: ${escapeHtml(optD)}</div>
                </div>
                
                <div style="margin-top:15px; padding-top:10px; border-top:1px dashed #eee; font-size:0.9rem; display:flex; gap:15px;">
                    <span style="color:#27ae60; font-weight:600;">✔️ Correct Answer: Option ${correctAns}</span>
                    <span style="color:${isUnattempted ? '#b7950b' : isCorrect ? '#27ae60' : '#c0392b'}; font-weight:600;">
                        📥 Candidate Answer Choice: ${isUnattempted ? 'None/Skipped' : 'Option ' + studentAns}
                    </span>
                </div>
            `;
            reviewContainer.appendChild(questionBlock);
        });
    })
    .catch(err => console.error("Detailed results fetch error:", err));

    // Balanced navigation redirection actions mapping
    document.getElementById('returnBtn').onclick = () => {
        if (currentUser.role === 'admin') { window.location.href = 'admin.html'; }
        else if (currentUser.role === 'teacher') { window.location.href = 'teacher.html'; }
        else { window.location.href = 'dashboard.html'; }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});