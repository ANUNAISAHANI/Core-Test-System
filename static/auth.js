// auth.js - Database Dynamic Connected Identity Controller

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 1. Extracting values from updated form input tags elements
            const fullName = document.getElementById('fullName').value.trim();
            const rollNumber = document.getElementById('rollNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const courseBranch = document.getElementById('courseBranch').value;
            const section = document.getElementById('section').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value || 'student';
            
            // 🎯 FIXED: Dropdown value extracted safely from html element
            const semester = document.getElementById('regSemester') ? document.getElementById('regSemester').value : 'Semester-1';
            
            // 2. Strict Input Client-Side Validations
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
            
            // 3. Bundling structural network payload packet configuration maps
            const signupPayload = {
                fullName: fullName,
                rollNumber: rollNumber,
                email: email,
                phone: phone,
                courseBranch: courseBranch,
                section: section,
                password: password,
                role: role,
                semester: semester // 🎯 FIXED: Linked perfectly to register payload block
            };
            
            console.log("🚀 Sending registration token stream data pack to python server...", signupPayload);
            
            // 4. Dispatching dynamic AJAX request packet directly inside SQLite nodes
            fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signupPayload)
            })
            .then(res => res.json())
            .then(responseData => {
                if (responseData.success) {
                    alert('🎉 Registration Successful! Accounts entries permanently locked. Redirecting to sign-in page...');
                    window.location.href = 'login.html';
                } else {
                    alert('❌ Registration Failed: ' + responseData.message);
                }
            })
            .catch(err => {
                console.error("🚨 Network Exception caught processing dynamic signup flow:", err);
                alert("❌ Server Connection Error: Check if your python application backend port is running properly.");
            });
        });
    }
});