// Realistic scans of the kinds of pages students will give the scanners.
// Each has the text (as OCR / paste would give it) and what MUST come out.
// `rows`: expected rows, matched in order; every key listed must be equal.
// `notesHas`: pieces of text that must survive into the row's notes.

export const SUBJECTS = [
  { id: "ds", code: "CS201", name: "Data Structures", color: "#111" },
  { id: "db", code: "CSC332", name: "Advance Database Management Systems", color: "#222" },
  { id: "ai", code: "CMC381", name: "Artifical Intelligence", color: "#333" },
  { id: "cc", code: "CSC452", name: "Compiler Construction", color: "#444" },
];

export const EXAM_SHEETS = [
  {
    name: "tab table with serial, day, venue",
    text: [
      "Sr#\tDate\tDay\tTime\tCourse Code\tCourse Title\tVenue",
      "1\t14-10-2026\tWednesday\t09:00 AM - 12:00 PM\tCS201\tData Structures\tHall 2",
      "2\t16-10-2026\tFriday\t01:30 PM - 04:30 PM\tCSC332\tAdvance Database Management Systems\tLR-26",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall 2", type: "Exam" },
      { subjectId: "db", date: "2026-10-16", time: "13:30", duration: 180, location: "LR-26", type: "Exam" },
    ],
  },
  {
    name: "ocr spaced columns, portal times without am/pm",
    text: [
      "MID TERM EXAMINATIONS FALL 2026",
      "14-10-2026   WED   09:00 12:00   CS201     DATA STRUCTURES                 HALL 2",
      "16-10-2026   FRI   01:30 04:30   CMC381    ARTIFICAL INTELLIGENCE          LR33",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall 2", type: "Exam" },
      { subjectId: "ai", date: "2026-10-16", time: "13:30", duration: 180, location: "LR33", type: "Exam" },
    ],
  },
  {
    name: "course names only, written dates",
    text: [
      "Final Term Date Sheet",
      "Data Structures    14 October 2026    9:00 AM    Exam Hall 1",
      "Compiler Construction    17 October 2026    2:00 PM    Exam Hall 1",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", location: "Exam Hall 1", type: "Exam" },
      { subjectId: "cc", date: "2026-10-17", time: "14:00", location: "Exam Hall 1", type: "Exam" },
    ],
  },
  {
    name: "date heading shared by rows",
    text: [
      "Monday, 12 October 2026",
      "09:00 - 11:00  CS201  Data Structures  Room 4",
      "02:00 - 04:00  CSC452  Compiler Construction  Room 5",
      "Tuesday, 13 October 2026",
      "09:00 - 11:00  CMC381  Artifical Intelligence  Room 4",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-12", time: "09:00", location: "Room 4" },
      { subjectId: "cc", date: "2026-10-12", time: "14:00", location: "Room 5" },
      { subjectId: "ai", date: "2026-10-13", time: "09:00", location: "Room 4" },
    ],
  },
  {
    name: "quiz schedule",
    text: [
      "Quiz Schedule",
      "Quiz 2   CS201 Data Structures   15/10/2026   10:00 AM   LR-12",
      "Quiz 1   CSC332 Advance Database Management Systems   18/10/2026   11:00 AM   LR-14",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-15", time: "10:00", type: "Quiz", location: "LR-12" },
      { subjectId: "db", date: "2026-10-18", time: "11:00", type: "Quiz", location: "LR-14" },
    ],
  },
  {
    name: "presentation schedule",
    text: [
      "Final Project Presentations",
      "CS201   Data Structures   Dec 5, 2026   2:00 PM - 3:30 PM   Lab 3   Group B",
      "CMC381  Artifical Intelligence   Dec 6, 2026   10:00 AM   Lab 4   Group A",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-12-05", time: "14:00", duration: 90, type: "Presentation", location: "Lab 3", notesHas: ["Group B"] },
      { subjectId: "ai", date: "2026-12-06", time: "10:00", type: "Presentation", location: "Lab 4", notesHas: ["Group A"] },
    ],
  },
  {
    name: "extra columns that must not be lost (syllabus, remarks)",
    text: [
      "Date\tTime\tCourse\tName\tSyllabus\tRemarks",
      "14-10-2026\t09:00-12:00\tCS201\tData Structures\tChapters 1-5\tOpen book, bring calculator",
    ].join("\n"),
    rows: [{ subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, notesHas: ["Chapters 1-5", "Open book"] }],
  },
  {
    name: "dd.mm.yy dates and 24h times with pipes",
    text: [
      "14.10.26 | 09:00-12:00 | CS201 | Data Structures | Hall A",
      "15.10.26 | 13:00-16:00 | CSC452 | Compiler Construction | Hall B",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall A" },
      { subjectId: "cc", date: "2026-10-15", time: "13:00", duration: 180, location: "Hall B" },
    ],
  },
  {
    name: "each field on its own line",
    text: [
      "14-10-2026",
      "Wednesday",
      "09:00 - 12:00",
      "CS201",
      "Data Structures",
      "Hall 2",
      "16-10-2026",
      "Friday",
      "01:30 - 04:30",
      "CSC332",
      "Advance Database Management Systems",
      "LR 26",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", location: "Hall 2" },
      { subjectId: "db", date: "2026-10-16", time: "13:30", location: "LR 26" },
    ],
  },
  {
    name: "viva and practical exams",
    text: [
      "Lab Exams / Viva",
      "CS201  Data Structures Lab Viva   20-10-2026   09:00 AM   Comp Lab 2",
      "CSC332  Database Practical Exam   21-10-2026   10:00 AM   Comp Lab 4",
    ].join("\n"),
    rows: [
      { date: "2026-10-20", time: "09:00", type: "Viva", location: "Comp Lab 2" },
      { date: "2026-10-21", time: "10:00", type: "Practical", location: "Comp Lab 4" },
    ],
  },

  {
    name: "12-hour times with 'to', weekday + day-month dates without a year",
    text: [
      "Wed 14 Oct   9:00 am to 12:00 pm   CS201   Data Structures   Hall 2",
      "Fri 16th October   1:30 pm to 4:30 pm   CSC332   Advance Database Management Systems   Hall 3",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", duration: 180, location: "Hall 2" },
      { subjectId: "db", date: "2026-10-16", time: "13:30", duration: 180, location: "Hall 3" },
    ],
  },
  {
    name: "merged date cell: only the first row of the day has the date",
    text: [
      "14-10-2026   09:00 - 12:00   CS201   Data Structures   Hall 2",
      "             09:00 - 12:00   CSC452  Compiler Construction   Hall 3",
      "15-10-2026   09:00 - 12:00   CMC381  Artifical Intelligence   Hall 2",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", location: "Hall 2" },
      { subjectId: "cc", date: "2026-10-14", location: "Hall 3" },
      { subjectId: "ai", date: "2026-10-15", location: "Hall 2" },
    ],
  },
  {
    name: "a row wrapped by the OCR onto the next line",
    text: [
      "14-10-2026   CS201   Data Structures",
      "09:00 - 12:00   Hall 2",
      "16-10-2026   CSC332   Advance Database Management Systems",
      "01:30 - 04:30   LR 26",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-14", time: "09:00", location: "Hall 2" },
      { subjectId: "db", date: "2026-10-16", time: "13:30", location: "LR 26" },
    ],
  },
  {
    name: "assessment schedule with section headings (quizzes, assignments, project)",
    text: [
      "Quizzes",
      "CS201  Data Structures  15-10-2026",
      "Assignments",
      "CSC332  Advance Database Management Systems  20-10-2026",
      "Project",
      "CMC381  Artifical Intelligence  05-12-2026",
    ].join("\n"),
    rows: [
      { subjectId: "ds", date: "2026-10-15", type: "Quiz" },
      { subjectId: "db", date: "2026-10-20", type: "Assignment" },
      { subjectId: "ai", date: "2026-12-05", type: "Project" },
    ],
  },
  {
    name: "instruction lines around the table are reported, not turned into exams",
    text: [
      "FALL 2026 MID TERM DATE SHEET",
      "Students must bring their ID cards and admit cards to every paper",
      "14-10-2026   09:00 - 12:00   CS201   Data Structures   Hall 2",
      "No mobile phones are allowed in the examination hall",
    ].join("\n"),
    rows: [{ subjectId: "ds", date: "2026-10-14", time: "09:00", location: "Hall 2" }],
    unreadHas: ["ID cards", "mobile phones"],
  },
];

export const ASSIGNMENT_LISTS = [
  {
    name: "classroom style, due lines",
    text: ["Assignment 2 - Sorting", "Due Oct 12", "Assignment 3 - Trees", "Due Oct 19, 11:59 PM"].join("\n"),
    rows: [{ title: "Assignment 2 - Sorting", dueDate: "2026-10-12" }, { title: "Assignment 3 - Trees", dueDate: "2026-10-19" }],
  },
  {
    name: "table with course code, title, marks and due date",
    text: [
      "Course\tTitle\tTotal Marks\tDue Date",
      "CS201\tAssignment 1: Linked Lists\t10\t12-10-2026",
      "CSC332\tProject Proposal\t20\t20-10-2026",
    ].join("\n"),
    rows: [
      { subjectId: "ds", title: "Assignment 1: Linked Lists", dueDate: "2026-10-12", notesHas: ["10"] },
      { subjectId: "db", title: "Project Proposal", dueDate: "2026-10-20", notesHas: ["20"] },
    ],
  },
  {
    name: "moodle activity list with status",
    text: [
      "Lab Report 3    Due: Monday, 12 October 2026, 11:59 PM    Not submitted",
      "Quiz 4 Revision    Due: Tuesday, 13 October 2026    Submitted",
    ].join("\n"),
    rows: [
      { title: "Lab Report 3", dueDate: "2026-10-12", done: false },
      { title: "Quiz 4 Revision", dueDate: "2026-10-13", done: true },
    ],
  },
  {
    name: "presentation and project deadlines",
    text: ["Project Presentation   CS201   Due 05/12/2026", "Final Project Report   CMC381   Due 08/12/2026"].join("\n"),
    rows: [{ title: "Project Presentation", dueDate: "2026-12-05", subjectId: "ds" }, { title: "Final Project Report", dueDate: "2026-12-08", subjectId: "ai" }],
  },
  {
    name: "classroom: course headings, due tomorrow, no due date",
    text: [
      "CS201 Data Structures",
      "Assignment 4: Heaps",
      "No due date",
      "CSC332 Advance Database Management Systems",
      "Lab Task 2",
      "Due tomorrow",
    ].join("\n"),
    rows: [
      { title: "Assignment 4: Heaps", dueDate: "", subjectId: "ds" },
      { title: "Lab Task 2", subjectId: "db" },
    ],
  },
  {
    name: "portal table: title, course, due, status, marks",
    text: [
      "Title	Course	Due	Status	Marks",
      "Assignment 3	CS201	18-10-2026	Not submitted	15",
      "Case Study Report	CMC381	25-10-2026	Submitted	20",
    ].join("\n"),
    rows: [
      { title: "Assignment 3", subjectId: "ds", dueDate: "2026-10-18", done: false, notesHas: ["15"] },
      { title: "Case Study Report", subjectId: "ai", dueDate: "2026-10-25", done: true, notesHas: ["20"] },
    ],
  },
];
