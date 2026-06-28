import os
from dotenv import load_dotenv
load_dotenv()  # Yeh line aapki .env file ko system mein load kar degi


from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_mail import Mail, Message  
import pymysql # 🎯 SQLite completely replaced with production MySQL driver
from datetime import datetime
import json
import random

app = Flask(__name__)
app.secret_key = "sahani_coretest_secure_key_99"

# ==================== 📧 GMAIL SMTP CONFIGURATION ====================
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = 'sahanianunay@gmail.com'  
app.config['MAIL_PASSWORD'] = 'zpub blzj uxdv tapl'     
app.config['MAIL_DEFAULT_SENDER'] = ('CoreTest Portal', 'sahanianunay@gmail.com')

mail = Mail(app)

# ==================== 🗄️ MYSQL CONNECTION CONFIGURATION ====================
def get_db_connection():
    # 🎯 local MySQL Workbench password aur database matching parameters setup
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="", # <-- Apna local MySQL Workbench/XAMPP password yahan likhein
        database="coretest_system", # <-- phpMyAdmin/Workbench me ye name se DB bana lena bhai
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor 
    )
    return conn

# ==================== MYSQL DATABASE SCHEMA DESIGN ====================
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users Dynamic Table (Updated: semester column added for student lifecycle tracking)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullName VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL, 
            roll_number VARCHAR(100) UNIQUE, 
            course_branch VARCHAR(255),      
            section VARCHAR(100),            
            semester VARCHAR(50), # 🎯 NEW: Bacha kis semester me hai tracking ke liye           
            avatar LONGTEXT,
            registeredAt VARCHAR(100)
        )
    ''')
    
    # 2. Central Exams Meta Table (Updated: semester column added for target exam lifecycle mapping)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(255) UNIQUE NOT NULL,
            topic VARCHAR(255),
            icon VARCHAR(50),
            duration INT,
            totalQuestions INT,
            maxAttempts INT DEFAULT 2,
            semester VARCHAR(50) # 🎯 NEW: Exam kis semester ke liye deploy ho rha hai
        )
    ''')
    
    # 3. Synchronized Questions Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(255),
            text LONGTEXT NOT NULL,
            optionA LONGTEXT,
            optionB LONGTEXT,
            optionC LONGTEXT,
            optionD LONGTEXT,
            correct INT,
            FOREIGN KEY (subject) REFERENCES exams(subject) ON DELETE CASCADE
        )
    ''')
    
    # 4. Global Test Results Table (Updated: semester column added for selective wipe logs)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            userName VARCHAR(255),
            roll_number VARCHAR(100),
            course_branch VARCHAR(255),
            section VARCHAR(100),
            examSubject VARCHAR(255),
            totalQuestions INT,
            attemptedQuestions INT,
            correctAnswers INT,
            score INT,
            percentage VARCHAR(50),
            submittedAt VARCHAR(100),
            userAnswers LONGTEXT,
            remarks LONGTEXT,
            attemptNumber INT,
            reason VARCHAR(255),
            questionsOrder LONGTEXT,  
            semester VARCHAR(50), # 🎯 NEW: Log filtration parameter for selective deletion
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    
# --- AUTOMATIC PRE-POPULATION GENERATOR FOR MYSQL ---
    admin_gmail_env = os.getenv("ADMIN_GMAIL")
    admin_password_env = os.getenv("ADMIN_PASSWORD")
    admin_phone_env = os.getenv("ADMIN_PHONE")

    cursor.execute("SELECT * FROM users WHERE email = %s", (admin_gmail_env,))
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO users (fullName, email, phone, password, role, registeredAt)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', ("Sahani", admin_gmail_env, admin_phone_env, admin_password_env, "admin", datetime.now().isoformat()))
    
    default_exams = [
        ("Mathematics", "Algebra & Calculus", "📐", 3600, 5, 2, "Semester-1"),
        ("Physics", "Mechanics & Thermodynamics", "⚛️", 3600, 5, 2, "Semester-1"),
        ("Web Tech", "HTML/CSS/JS Web Development", "💻", 3600, 5, 2, "Semester-1")
    ]
    for sub, top, ic, dur, tq, ma, sem in default_exams:
        cursor.execute("SELECT * FROM exams WHERE subject = %s", (sub,))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO exams (subject, topic, icon, duration, totalQuestions, maxAttempts, semester)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (sub, top, ic, dur, tq, ma, sem))
            
    conn.commit()
    conn.close()
    print("📢 MYSQL SERVER ENGINE OPERATIONAL: Mapped dynamic schemas with semester fields.")

# Initialize dynamic bootstrapper instantly
try:
    init_db()
except Exception as db_err:
    print(f"⚠️ Initial Setup Notice: Make sure you created 'coretest_system' database scheme inside MySQL server first! Error: {db_err}")

# ==================== VIEW ROUTINGS ====================
@app.route('/')
def index(): return render_template('index.html')

@app.route('/login.html')
def login_page(): return render_template('login.html')

@app.route('/register.html')
def register_page(): return render_template('register.html')

@app.route('/dashboard.html')
def dashboard_page():
    if 'user_id' not in session: return redirect('/login.html')
    return render_template('dashboard.html')

@app.route('/exam.html')
def exam_page():
    if 'user_id' not in session: return redirect('/login.html')
    return render_template('exam.html')

@app.route('/admin.html')
def admin_page():
    if 'user_id' not in session or session.get('role') != 'admin': return redirect('/login.html')
    return render_template('admin.html')

@app.route('/profile.html')
def profile_page():
    if 'user_id' not in session: return redirect('/login.html')
    return render_template('profile.html')

@app.route('/result-details.html')
def result_details_page():
    if 'user_id' not in session: return redirect('/login.html')
    return render_template('result-details.html')

# ==================== DATA API STREAM CHANNELS ====================

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (fullName, email, phone, password, role, roll_number, course_branch, section, semester, registeredAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (data['fullName'], data['email'], data['phone'], data['password'], 'student', 
              data.get('rollNumber'), data.get('courseBranch'), data.get('section'), data.get('semester'), datetime.now().isoformat()))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": "Email or Roll Number already registered!"}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, fullName, email, phone, role, roll_number, course_branch, section, semester, teacher_id, registeredAt, avatar 
        FROM users WHERE email = %s AND password = %s
    ''', (data['email'], data['password']))
    user = cursor.fetchone()
    conn.close()
    if user:
        session['user_id'] = user['id']
        session['role'] = user['role']
        return jsonify({"success": True, "user": dict(user)})
    return jsonify({"success": False, "message": "Invalid credentials!"}), 401

@app.route('/api/auth/forgot-password-action', methods=['POST'])
def forgot_password_action():
    data = request.json
    email = data.get('email', '').strip()
    if not email: return jsonify({"success": False, "message": "Email address required!"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT password, fullName FROM users WHERE email = %s', (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        try:
            msg = Message("🔑 CoreTest System - Password Recovery", recipients=[email])
            msg.body = f"Hello {user['fullName']},\n\nYour requested account password is: {user['password']}\n\nPlease keep it secure."
            mail.send(msg)
            return jsonify({"success": True, "message": "Password securely dispatched to your email."})
        except Exception as mail_err:
            return jsonify({"success": False, "message": "Failed to transmit email stream."}), 500
    return jsonify({"success": False, "message": "This email address is not registered!"}), 404

@app.route('/api/admin/create-teacher', methods=['POST'])
def admin_create_teacher():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (fullName, email, phone, password, role, teacher_id, course_branch, section, registeredAt)
            VALUES (%s, %s, %s, %s, 'teacher', %s, %s, %s, %s)
        ''', (data['fullName'], data['email'], data['phone'], data['password'], 
              data['teacherId'], data['courseBranch'], data['section'], datetime.now().isoformat()))
        conn.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False, "message": "Teacher Email or Faculty ID already exists!"}), 400
    finally:
        conn.close()

@app.route('/api/admin/edit-teacher', methods=['POST'])
def admin_edit_teacher():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE users SET fullName = %s, phone = %s, course_branch = %s, section = %s, teacher_id = %s 
            WHERE id = %s AND role = 'teacher'
        ''', (data['fullName'], data['phone'], data['courseBranch'], data['section'], data['teacherId'], data['id']))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
    finally:
        conn.close()

@app.route('/api/exams', methods=['GET', 'POST'])
def api_exams():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        user_role = request.args.get('role')
        user_branch = request.args.get('course_branch')
        user_semester = request.args.get('semester') # 🎯 NEW: Semester parameter link
        
        # 🎯 FIXED: Dual filtration on branch AND academic semester rows safely
        if user_role == 'student' and user_branch:
            if user_semester:
                cursor.execute('''
                    SELECT * FROM exams 
                    WHERE (course_branch = %s OR course_branch = "ALL") 
                    AND (semester = %s OR semester = "" OR semester IS NULL)
                ''', (user_branch, user_semester))
            else:
                cursor.execute('SELECT * FROM exams WHERE course_branch = %s OR course_branch = "ALL"', (user_branch,))
        else:
            cursor.execute('SELECT * FROM exams')
            
        exams = cursor.fetchall()
        conn.close()
        return jsonify([dict(ex) for ex in exams])
        
    elif request.method == 'POST':
        data = request.json
        # 🎯 SAFE COLUMN EXTENSION: course_branch extraction mapping
        branch_target = data.get('course_branch', 'ALL')
        
        cursor.execute('''
            INSERT INTO exams (subject, topic, icon, duration, totalQuestions, maxAttempts, semester, course_branch)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['subject'], 
            data['topic'], 
            data['icon'], 
            int(data['duration']), 
            int(data['totalQuestions']), 
            2, 
            data.get('semester'),
            branch_target
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

@app.route('/api/exams/delete/<int:exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM exams WHERE id = %s', (exam_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/questions', methods=['GET', 'POST'])
def api_questions():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        subject = request.args.get('subject')
        if subject:
            search_term = f"{subject.strip()}%"
            cursor.execute('SELECT * FROM questions WHERE subject LIKE %s ORDER BY RAND() LIMIT 50', (search_term,))
        else:
            cursor.execute('SELECT * FROM questions ORDER BY RAND() LIMIT 50')
            
        qs = cursor.fetchall()
        conn.close()
        
        formatted_qs = []
        for q in qs:
            formatted_qs.append({
                "id": q['id'], "subject": q['subject'], "text": q['text'],
                "options": [q['optionA'], q['optionB'], q['optionC'], q['optionD']], "correct": q['correct']
            })
        return jsonify(formatted_qs)
        
    elif request.method == 'POST':
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename.endswith('.csv'):
                import csv, io
                stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
                csv_input = csv.reader(stream)
                next(csv_input)
                count = 0
                for row in csv_input:
                    if len(row) >= 7:
                        cursor.execute('''
                            INSERT INTO questions (subject, text, optionA, optionB, optionC, optionD, correct)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ''', (row[0], row[1], row[2], row[3], row[4], row[5], int(row[6]))) 
                        count += 1
                conn.commit()
                conn.close()
                return jsonify({'success': True, 'message': f'🔥 Wah Admin Saheb! {count} Questions ek jhatke mein upload ho gaye!'})
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid file format!'}), 400
        else:
            data = request.json
            cursor.execute('''
                INSERT INTO questions (subject, text, optionA, optionB, optionC, optionD, correct)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (data.get('subject'), data.get('text'), data.get('optionA'), data.get('optionB'), data.get('optionC'), data.get('optionD'), int(data.get('correct'))))
            conn.commit()
            conn.close()
            return jsonify({'success': True})

@app.route('/api/questions/delete/<int:q_id>', methods=['DELETE'])
def delete_question(q_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM questions WHERE id = %s', (q_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/results', methods=['GET', 'POST'])
def api_results():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        user_id = request.args.get('userId')
        result_id = request.args.get('id')
        
        # 1. Single Result View Details ke liye
        if result_id:
            cursor.execute('SELECT * FROM results WHERE id = %s', (result_id,))
            res = cursor.fetchone()
            if res:
                row = dict(res)
                db_remarks = row.get('remarks', '') or ''
                if db_remarks and " | Log Timestamp: " in db_remarks:
                    parts = db_remarks.split(" | Log Timestamp: ")
                    row['reason'] = parts[0]
                    display_date = parts[1]
                else:
                    row['reason'] = db_remarks
                    display_date = "Date Not Found"
                
                row['submittedAt'] = display_date
                row['correctAnswers'] = row.get('score', 0)
                conn.close()
                return jsonify(row)
            conn.close()
            return jsonify({})
            
        # 2. Student Dashboard ya Teacher Panel (Dono ke liye safe logic)
        else:
            if user_id:
                # Agar student dashboard hai toh sirf uske results
                cursor.execute('SELECT * FROM results WHERE userId = %s ORDER BY id ASC', (user_id,))
            else:
                # Agar teacher/admin ledger hai toh saare results purane se naye ke order mein fetch karo calculation ke liye
                cursor.execute('SELECT * FROM results ORDER BY id ASC')
                
            all_results = cursor.fetchall()
            
            # Master tracker: user_id aur subject ke hisab se count rakhne ke liye
            tracker = {}
            formatted_results = []
            
            for r in all_results:
                row = dict(r)
                uid = str(row.get('userId', ''))
                sub = row.get('examSubject', 'General')
                
                if uid not in tracker:
                    tracker[uid] = {}
                
                if sub not in tracker[uid]:
                    tracker[uid][sub] = 1
                else:
                    tracker[uid][sub] += 1
                
                row['attempt_number'] = tracker[uid][sub]
                
                db_remarks = row.get('remarks', '') or ''
                if db_remarks and " | Log Timestamp: " in db_remarks:
                    parts = db_remarks.split(" | Log Timestamp: ")
                    display_date = parts[1]
                else:
                    display_date = "Date Not Found"
                
                row['submittedAt'] = display_date
                row['correctAnswers'] = row.get('score', 0)
                formatted_results.append(row)
            
            formatted_results.reverse()
            conn.close()
            return jsonify(formatted_results)
        
    elif request.method == 'POST':
        data = request.json
        exam_remarks = data.get('reason', 'Normal Submission')
        current_time_str = datetime.now().strftime('%d/%m/%Y, %I:%M:%S %p')
        final_remarks = f"{exam_remarks} | Log Timestamp: {current_time_str}"

        cursor.execute("SELECT semester FROM users WHERE id = %s", (data.get('userId'),))
        user_sem_row = cursor.fetchone()
        user_semester = user_sem_row['semester'] if user_sem_row else 'Semester-1'

        cursor.execute('''
            INSERT INTO results (
                userId, userName, roll_number, course_branch, section, 
                examSubject, totalQuestions, score, userAnswers, remarks, questionsOrder, percentage, semester
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data.get('userId'), data.get('userName'), data.get('rollNumber'), data.get('courseBranch'), data.get('section'),
            data.get('examSubject'), data.get('totalQuestions'), data.get('score'), data.get('userAnswers'), final_remarks, 
            data.get('questionsOrder'), data.get('percentage'), user_semester
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

@app.route('/api/get_result_detail/<int:result_id>', methods=['GET'])
def get_result_detail(result_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT r.*, u.fullName FROM results r JOIN users u ON r.userId = u.id WHERE r.id = %s', (result_id,))
        result_data = cursor.fetchone()
        
        if not result_data:
            conn.close()
            return jsonify({'success': False, 'message': 'Record missing.'}), 404
            
        questions_list = []
        db_answers = json.loads(result_data['userAnswers'] or '{}')

        if result_data['questionsOrder']:
            order_ids = [int(x.strip()) for x in str(result_data['questionsOrder']).split(',') if x.strip()]
            if order_ids:
                placeholders = ','.join('%s' for _ in order_ids)
                query = f'SELECT id, text, optionA, optionB, optionC, optionD, correct FROM questions WHERE id IN ({placeholders})'
                cursor.execute(query, order_ids)
                fetched_rows = cursor.fetchall()
                row_map = {row['id']: row for row in fetched_rows}
                exam_rows = [row_map[qid] for qid in order_ids if qid in row_map]
        else:
            cursor.execute('SELECT id, text, optionA, optionB, optionC, optionD, correct FROM questions WHERE subject = %s', (result_data['examSubject'],))
            exam_rows = cursor.fetchall()
        
        for row in exam_rows:
            q_id_str = str(row['id'])
            selected_val = db_answers.get(q_id_str)
            map_int_to_char = {0: 'A', 1: 'B', 2: 'C', 3: 'D'}
            db_correct_char = map_int_to_char.get(row['correct'], 'A')
            
            if selected_val is None: selected_val = 'A'
            elif isinstance(selected_val, int): selected_val = map_int_to_char.get(selected_val, 'A')
            else: selected_val = str(selected_val).strip().upper()

            questions_list.append({
                'id': row['id'], 'questionText': row['text'], 'selectedOption': selected_val, 'correctOption': db_correct_char,
                'options': {'A': row['optionA'], 'B': row['optionB'], 'C': row['optionC'], 'D': row['optionD']}
            })
            
        db_remarks = result_data.get('remarks', '') or ''
        display_date = "Date Not Found"
        if db_remarks and " | Log Timestamp: " in db_remarks:
            parts = db_remarks.split(" | Log Timestamp: ")
            display_date = parts[1]
            
        conn.close()
        
        return jsonify({
            'success': True, 
            'subject': result_data['examSubject'], 
            'studentName': result_data['fullName'], 
            'percentage': float(result_data['percentage'] or 0), 
            'questions': questions_list,
            'submittedAt': display_date
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    

@app.route('/api/users', methods=['GET'])
def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, fullName, email, phone, role, roll_number, course_branch, section, semester, teacher_id, registeredAt, avatar FROM users ORDER BY fullName ASC')
        users = cursor.fetchall()
        conn.close()
        return jsonify([dict(u) for u in users])
    except Exception as e:
        if 'conn' in locals(): conn.close()
        return jsonify({"success": False, "message": str(e)}), 500    

# 🎯 FIXED: Includes 'teacher_id' column inside selection context
@app.route('/api/users/update', methods=['POST'])
def update_profile():
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Safe mapping taaki admin ya student ka data crash na kare
        t_id = data.get('teacherId') or data.get('teacher_id')
        sem = data.get('semester') or 'Semester-1'
        avatar_data = data.get('avatar')
        
        if data.get('password'):
            cursor.execute('''
                UPDATE users 
                SET fullName = %s, phone = %s, password = %s, avatar = %s, semester = %s, teacher_id = %s 
                WHERE id = %s
            ''', (data['fullName'], data['phone'], data['password'], avatar_data, sem, t_id, data['id']))
        else:
            cursor.execute('''
                UPDATE users 
                SET fullName = %s, phone = %s, avatar = %s, semester = %s, teacher_id = %s 
                WHERE id = %s
            ''', (data['fullName'], data['phone'], avatar_data, sem, t_id, data['id']))
            
        conn.commit()
        
        # Fresh updated row fetch karenge response ke liye
        cursor.execute('''
            SELECT id, fullName, email, phone, role, roll_number, course_branch, section, semester, teacher_id, registeredAt, avatar 
            FROM users WHERE id = %s
        ''', (data['id'],))
        user = cursor.fetchone()
        conn.close()
        
        return jsonify({"success": True, "user": dict(user)})
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/users/delete/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE id = %s', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ==================== 💥 ADMINISTRATIVE NUCLEAR SEMESTER CLEANUP API ====================
@app.route('/api/admin/bulk-cleanup', methods=['POST'])
def bulk_cleanup_semester_data():
    try:
        data = request.get_json()
        target_semester = data.get('semester')
        
        if not target_semester or target_semester == 'ALL':
            return jsonify({'success': False, 'message': 'Invalid semester selection parameter!'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM exams WHERE semester = %s", (target_semester,))
        cursor.execute("DELETE FROM results WHERE semester = %s", (target_semester,))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'💥 Cleaned up all records for {target_semester} successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server Error: {str(e)}'}), 500
    
@app.route('/teacher.html')
def teacher_page():
    return render_template('teacher.html')

import csv
import io

@app.route('/api/admin/bulk-upload-questions', methods=['POST'])
def bulk_upload_questions():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded!'}), 400
            
        file = request.files['file']
        subject = request.form.get('subject', 'Web Tech New')
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file!'}), 400

        if file and file.filename.endswith('.csv'):
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.reader(stream)
            
            try:
                header = next(csv_input)
            except StopIteration:
                return jsonify({'success': False, 'message': 'CSV file ekdam khali hai!'}), 400

            conn = get_db_connection()
            cursor = conn.cursor()

            for row in csv_input:
                if not row or len(row) < 7:
                    continue
                
                question_text = row[1]
                option_a      = row[2]
                option_b      = row[3]
                option_c      = row[4]
                option_d      = row[5]
                correct_ans   = row[6]
                
                query = """
                    INSERT INTO questions (subject, text, optionA, optionB, optionC, optionD, correct) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (subject, question_text, option_a, option_b, option_c, option_d, correct_ans))

            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({'success': True, 'message': 'Saare questions ek jhatke mein upload ho gaye hain! 🔥'})
        else:
            return jsonify({'success': False, 'message': 'Sirf CSV format allowed hai bhai!'}), 400

    except Exception as e:
        return jsonify({'success': False, 'message': f'Server Error: {str(e)}'}), 500
    
@app.route('/api/results/delete/<int:result_id>', methods=['DELETE'])
def delete_student_result(result_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM results WHERE id = %s', (result_id,))
        record = cursor.fetchone()
        
        if not record:
            conn.close()
            return jsonify({'success': False, 'message': 'Result record not found.'}), 404
            
        cursor.execute('DELETE FROM results WHERE id = %s', (result_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Attempt cleared and restored successfully!'}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)