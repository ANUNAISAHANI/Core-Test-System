document.addEventListener('DOMContentLoaded', function() {
    
    const authCard = document.getElementById('mainRegisterCard');
    if (authCard) {
        setTimeout(() => {
            authCard.classList.add('reveal-active');
        }, 300);
    }

    /* ==========================================================================
       SMOOTH MULTI-ELEMENT IRIS TRACKING SYSTEM
       ========================================================================== */
    const bgEyeContainers = document.querySelectorAll('.bg-eye-container');
    const bgIrisGroups = document.querySelectorAll('.iris-movement-group');
    const normalInputs = document.querySelectorAll('#registerForm input:not([type="password"]), #registerForm select');
    const secureInputs = document.querySelectorAll('input[type="password"]');

    normalInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let length = e.target.value.length || 0;
            // Precise horizontal coordinate shift calculation
            let xOffset = Math.min(35, Math.max(-35, (length - 12) * 2.5));
            bgIrisGroups.forEach(group => {
                group.style.transform = `translateX(${xOffset}px)`;
            });
        });
        
        input.addEventListener('focus', () => {
            bgEyeContainers.forEach(container => container.classList.remove('close-action'));
        });
    });

    secureInputs.forEach(pwd => {
        pwd.addEventListener('focus', () => {
            bgEyeContainers.forEach(container => container.classList.add('close-action'));
        });
        pwd.addEventListener('blur', () => {
            bgEyeContainers.forEach(container => container.classList.remove('close-action'));
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#registerForm')) {
            bgIrisGroups.forEach(group => group.style.transform = 'translateX(0px)');
        }
    });

    // Existing Form Registration Request API Pipeline Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value.trim();
            const rollNumber = document.getElementById('rollNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const courseBranch = document.getElementById('courseBranch').value;
            const section = document.getElementById('section').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value || 'student';
            const semester = document.getElementById('regSemester') ? document.getElementById('regSemester').value : 'Semester-1';
            
            if (password !== confirmPassword) {
                alert('❌ Error: Passwords do not match!');
                return;
            }
            if (password.length < 6) {
                alert('❌ Security Warning: Password must be at least 6 characters long!');
                return;
            }
            if (!rollNumber) {
                alert('❌ Validation Failure: University Roll Number is strict mandatory!');
                return;
            }
            
            const signupPayload = {
                fullName: fullName, rollNumber: rollNumber, email: email, phone: phone,
                courseBranch: courseBranch, section: section, password: password, role: role, semester: semester
            };
            
            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupPayload)
            })
            .then(res => res.json())
            .then(responseData => {
                if (responseData.success) {
                    alert('🎉 Registration Successful! Redirecting to sign-in page...');
                    window.location.href = 'login.html';
                } else {
                    alert('❌ Registration Failed: ' + responseData.message);
                }
            })
            .catch(err => {
                alert("❌ Server Connection Error: Check if backend is running.");
            });
        });
    }
});