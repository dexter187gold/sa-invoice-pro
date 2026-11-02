/** Education / Training - SA SME presets (ZAR, indicative). */

export const EDU_ACCOUNT_TYPES = ['Per learner', 'Corporate account', 'Net 7', 'Deposit + balance', 'Bursary']

export const EDU_SERVICE_PRESETS = [
  { name: 'Course enrolment (per learner)', price: 2500, category: 'Courses', sku: 'EDU-ENR', tags: ['education'] },
  { name: 'Workshop (half day)', price: 4500, category: 'Workshops', sku: 'EDU-WS-H', tags: ['education'] },
  { name: 'Workshop (full day)', price: 7500, category: 'Workshops', sku: 'EDU-WS-F', tags: ['education'] },
  { name: 'Private tutoring (hour)', price: 450, category: 'Tutoring', sku: 'EDU-TUT', tags: ['education'] },
  { name: 'Assessment / invigilation', price: 350, category: 'Assessment', sku: 'EDU-ASS', tags: ['education'] },
]

export const EDU_PRODUCT_PRESETS = [
  { name: 'Course material pack', price: 180, category: 'Materials', sku: 'EDU-MAT', tags: ['education'] },
]

export const EDU_DOCUMENT_STUBS = [
  { id: 'edu_enrol', title: 'Enrolment confirmation', purpose: 'Confirm place on a course or programme.', scope: 'Learner, course, dates, fees, policies.' },
  { id: 'edu_attendance', title: 'Attendance register', purpose: 'Record attendance for a session.', scope: 'Session, learners present/absent, facilitator.' },
  { id: 'edu_certificate', title: 'Certificate of completion', purpose: 'Issue completion certificate text.', scope: 'Learner, course, date, outcomes.' },
  { id: 'edu_corporate', title: 'Corporate training proposal', purpose: 'Propose training for a company.', scope: 'Objectives, agenda, investment, logistics.' },
  { id: 'edu_feedback', title: 'Learner feedback form', purpose: 'Collect course feedback.', scope: 'Ratings, comments, improvements.' },
  { id: 'edu_invoice_note', title: 'Training invoice support note', purpose: 'Support billing for training delivered.', scope: 'Learners, sessions, rates.' },
]
