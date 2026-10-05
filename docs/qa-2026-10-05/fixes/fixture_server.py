import os, sys, json
from pathlib import Path
from datetime import timedelta
BASE = Path(os.environ["SCENARIO_FIXTURE_DIR"])
BASE.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'backend'))
os.environ['FLASK_ENV'] = 'testing'
os.environ['TEST_DATABASE_URL'] = 'sqlite:///' + (BASE / 'ui.sqlite').as_posix()
os.environ['DATABASE_URL'] = os.environ['TEST_DATABASE_URL']
os.environ['SECRET_KEY'] = 'local-synthetic-qa-secret-20261005'
os.environ['JWT_SECRET_KEY'] = 'local-synthetic-qa-jwt-secret-20261005'
os.environ['CORS_ORIGINS'] = 'http://localhost:5174,http://127.0.0.1:5174'
os.environ['STORAGE_BACKEND'] = 'local'
os.environ['UPLOAD_FOLDER'] = str(BASE / 'uploads')
os.environ['LOG_LEVEL'] = 'WARNING'
from app.app import app
from app.extensions import db, socketio
from seed import seed_rbac
from app.auth.model import User
from app.auth.service import AuthService
from app.permissions.model import Role, UserRole
from app.users.model import Department, Course, AcademicYear, Semester, Section, StudentProfile, TeacherProfile, AdministratorProfile, OfficerProfile, Organization, OrganizationPosition
from app.events.model import Event, EventCategory, EventOfficerAssignment, CalendarEvent
from app.announcements.model import Announcement, AnnouncementCategory
from app.registrations.model import Registration
from app.notifications.model import Notification
from app.utils.datetime import utcnow
if not (BASE / "manifest.json").exists():
    with app.app_context():
        db.create_all()
        seed_rbac()
        now=utcnow()
        dept=Department(name='QA Computer Studies',code='QA-CCS')
        year=AcademicYear(name='2026-2027',start_date=now.date(),end_date=(now+timedelta(days=300)).date(),is_current=True)
        db.session.add_all([dept,year]); db.session.flush()
        course=Course(department_id=dept.id,name='QA Information Technology',code='QA-BSIT')
        semester=Semester(academic_year_id=year.id,name='QA First Semester',start_date=year.start_date,end_date=year.end_date)
        db.session.add_all([course,semester]); db.session.flush()
        section=Section(course_id=course.id,semester_id=semester.id,name='QA 3A')
        org=Organization(name='QA College Council',organization_type='student_council',category='Student Council')
        db.session.add_all([section,org]); db.session.flush()
        db.session.add(OrganizationPosition(organization_id=org.id,name='President',sort_order=0))
        users={}
        for key,role in [('admin','admin'),('teacher','teacher'),('officer','student_council'),('leader','department_student_leader'),('student','student'),('student2','student'),('incomplete','student')]:
            user=User(email=f'{key}@qa.schoolconnect.example',username=f'qa-{key}',full_name=f'QA {key.title()}',first_name='QA',last_name=key.title(),password_hash=AuthService._hash_password('QaOnly-2026-Local!'),status='active',email_verified=True)
            db.session.add(user);db.session.flush(); users[key]=user
            role_row=db.session.scalar(db.select(Role).where(Role.name==role))
            db.session.add(UserRole(user_id=user.id,role_id=role_row.id))
            if role in ('student','student_council','department_student_leader'):
                db.session.add(StudentProfile(id=user.id,student_number=f'QA-{key}',department_id=dept.id,course_id=course.id,section_id=None if key=='incomplete' else section.id,year_level=3,profile_completed=key!='incomplete'))
            if role=='teacher': db.session.add(TeacherProfile(id=user.id,employee_number='QA-T01',department_id=dept.id,position='Instructor'))
            if role=='admin': db.session.add(AdministratorProfile(id=user.id,employee_number='QA-A01',position='Administrator'))
            if role=='student_council': db.session.add(OfficerProfile(id=user.id,organization_id=org.id,position='President'))
        cat=EventCategory(name='QA Seminar',slug='qa-seminar',color='#2563eb')
        acat=AnnouncementCategory(name='QA Campus',slug='qa-campus',color='#2563eb')
        db.session.add_all([cat,acat]); db.session.flush()
        events={}
        for key,title,day,capacity,team,status in [('open','QA Open Seminar',7,10,False,'approved'),('team','QA Team Challenge',8,10,True,'approved'),('full','QA Full Event',9,1,False,'approved'),('closed','QA Deadline Passed',10,10,False,'approved'),('live','QA Live Attendance',0,10,False,'ongoing'),('complete','QA Completed Event',-2,10,False,'completed')]:
            start=now+timedelta(days=day)
            e=Event(title=title,description='Synthetic UI testing event. No real participants.',category_id=cat.id,organizer_id=users['teacher'].id,start_time=start,end_time=start+timedelta(hours=2),registration_deadline=now-timedelta(days=1) if key=='closed' else start-timedelta(hours=1),location='QA Campus Hall',capacity=capacity,is_team_event=team,max_team_size=4 if team else None,approval_required=True,status=status,created_by=users['teacher'].id)
            db.session.add(e);db.session.flush();events[key]=e
            db.session.add(CalendarEvent(event_id=e.id,title=e.title,start_time=e.start_time,end_time=e.end_time,is_public=True))
        db.session.add(EventOfficerAssignment(event_id=events['live'].id,officer_id=users['officer'].id,assigned_by=users['teacher'].id))
        for key,student in [('full','student2'),('live','student'),('live','student2'),('complete','student')]:
            db.session.add(Registration(event_id=events[key].id,user_id=users[student].id,status='approved'))
        for title,audience,urgent in [('QA Public Notice',['all'],False),('QA Students Only',['student'],False),('QA Emergency Notice',['all'],True)]:
            db.session.add(Announcement(title=title,body='Synthetic announcement for user interface testing.',category_id=acat.id,author_id=users['teacher'].id,status='published',priority='urgent' if urgent else 'normal',is_pinned=urgent,is_emergency=urgent,target_audience=audience,published_at=now))
        for u in users.values(): db.session.add(Notification(user_id=u.id,title='QA Welcome',body='Synthetic QA notification.',category='system',status='unread'))
        db.session.commit()
        manifest={'database':str(BASE/'ui.sqlite'),'users':{k:str(v.id) for k,v in users.items()},'events':{k:str(v.id) for k,v in events.items()}}
        (BASE/'manifest.json').write_text(json.dumps(manifest,indent=2))
        print(json.dumps(manifest),flush=True)

socketio.run(app,host='127.0.0.1',port=5001,allow_unsafe_werkzeug=True,use_reloader=False)
