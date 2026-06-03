const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensure upload folders exist
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/syllabus', 'uploads/assignments'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'syllabusFile') folder = 'uploads/syllabus';
        if (file.fieldname === 'materialFile') folder = 'uploads/materials';
        if (file.fieldname === 'assignmentFile') folder = 'uploads/assignments';
        if (file.fieldname === 'profilePic') folder = 'uploads/profile_pics';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ============ ALL PROGRAMS ============
const ALL_PROGRAMS = [
    { code: "BED_SCI", name: "Bachelor of Education (Science)", faculty: "Education" },
    { code: "BED_ICT", name: "Bachelor of Education ICT", faculty: "Education" },
    { code: "BED_LANG", name: "Bachelor of Education (Languages)", faculty: "Education" },
    { code: "BED_ARTS", name: "Bachelor of Education (Arts)", faculty: "Education" },
    { code: "BSC_FISH", name: "BSc Fisheries and Aquatic Sciences", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST", name: "BSc Forestry", faculty: "Environmental Sciences" },
    { code: "BSC_WATER", name: "BSc Water Resources Engineering and Management", faculty: "Environmental Sciences" },
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science & Technology" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science & Technology" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science & Technology" },
    { code: "BSC_NURSING", name: "BSc Nursing and Midwifery", faculty: "Health Sciences" },
    { code: "BA_COMMS", name: "BA Communication Studies", faculty: "Humanities" },
    { code: "BB_TOURISM", name: "Bachelor of Business (Tourism Management)", faculty: "Tourism" },
    { code: "BSC_LAND", name: "BSc Land Surveying", faculty: "Built Environment" },
    { code: "BSC_LIB", name: "BSc Library and Information Science", faculty: "Information Science" }
];

// ============ STORAGE ============
let courseRooms = [];
let liveSessions = {};
const ROOMS_FILE = 'rooms.json';

function loadData() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            courseRooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
            console.log(`✅ Loaded ${courseRooms.length} course rooms`);
        }
    } catch(e) { console.error('Error loading data:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(courseRooms, null, 2));
    } catch(e) { console.error('Error saving data:', e); }
}

loadData();

// ============ WEBSOCKET SIGNALING ============
let activeRooms = {};

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'lecturer-join':
                    activeRooms[data.roomId] = { lecturer: ws, students: new Set() };
                    ws.roomId = data.roomId;
                    ws.isLecturer = true;
                    console.log(`👨‍🏫 Lecturer joined room ${data.roomId}`);
                    break;
                    
                case 'student-join':
                    const room = activeRooms[data.roomId];
                    if (room && room.lecturer) {
                        room.students.add(ws);
                        ws.roomId = data.roomId;
                        ws.send(JSON.stringify({ type: 'ready' }));
                        console.log(`👩‍🎓 Student joined room ${data.roomId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'no-broadcast' }));
                    }
                    break;
                    
                case 'offer':
                    activeRooms[data.roomId]?.lecturer?.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    break;
                    
                case 'answer':
                    const targetStudent = findStudentInRoom(data.roomId, data.targetId);
                    if (targetStudent) targetStudent.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    break;
                    
                case 'ice-candidate':
                    if (data.target === 'lecturer') {
                        activeRooms[data.roomId]?.lecturer?.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    } else {
                        const student = findStudentInRoom(data.roomId, data.targetId);
                        if (student) student.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    }
                    break;
                    
                case 'stop-broadcast':
                    const stopRoom = activeRooms[data.roomId];
                    if (stopRoom) {
                        stopRoom.students.forEach(s => s.send(JSON.stringify({ type: 'broadcast-ended' })));
                        delete activeRooms[data.roomId];
                    }
                    break;
            }
        } catch(e) { console.error('WebSocket error:', e); }
    });
    
    ws.on('close', () => {
        if (ws.roomId && activeRooms[ws.roomId]) {
            if (ws.isLecturer) {
                activeRooms[ws.roomId].students.forEach(s => s.send(JSON.stringify({ type: 'broadcast-ended' })));
                delete activeRooms[ws.roomId];
            } else {
                activeRooms[ws.roomId]?.students.delete(ws);
            }
        }
    });
});

function findStudentInRoom(roomId, targetId) {
    const room = activeRooms[roomId];
    if (room) {
        for (const student of room.students) {
            if (student._id === targetId || student === targetId) return student;
        }
    }
    return null;
}

// ============ API ROUTES ============

app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (username === `lecturer_${programCode}_l${level}` && password === 'lecturer123') {
        res.json({ success: true, role: 'lecturer', name: program?.name || programCode, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (username === `student_${programCode}_l${level}_1` && password === 'student123') {
        res.json({ success: true, role: 'student', name: program?.name || programCode, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false });
    }
});

// Course Room Routes
app.get('/api/rooms/:programCode/:level', (req, res) => {
    const filtered = courseRooms.filter(r => r.programCode === req.params.programCode && r.level === parseInt(req.params.level));
    res.json(filtered);
});

app.get('/api/rooms/detail/:roomId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    res.json(room || null);
});

app.post('/api/rooms', upload.single('syllabusFile'), (req, res) => {
    const { programCode, level, courseCode, courseName, lecturerName, description, objectives } = req.body;
    
    let syllabusFile = null;
    if (req.file) {
        syllabusFile = {
            url: `/uploads/syllabus/${req.file.filename}`,
            filename: req.file.originalname,
            size: req.file.size
        };
    }
    
    const room = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        courseCode,
        courseName: courseName || "Untitled Course",
        lecturerName: lecturerName || "Unknown Lecturer",
        description: description || '',
        objectives: objectives || '',
        syllabus: syllabusFile,
        materials: [],
        assignments: [],
        announcements: [],
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
    };
    courseRooms.push(room);
    saveData();
    res.json({ success: true, room });
});

app.put('/api/rooms/:roomId', upload.single('syllabusFile'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const index = courseRooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
        const updates = { ...req.body };
        if (req.file) {
            updates.syllabus = {
                url: `/uploads/syllabus/${req.file.filename}`,
                filename: req.file.originalname,
                size: req.file.size
            };
        }
        courseRooms[index] = { ...courseRooms[index], ...updates, updatedAt: new Date().toLocaleString() };
        saveData();
        res.json({ success: true, room: courseRooms[index] });
    } else {
        res.status(404).json({ success: false });
    }
});

app.delete('/api/rooms/:id', (req, res) => {
    courseRooms = courseRooms.filter(r => r.id !== parseInt(req.params.id));
    saveData();
    res.json({ success: true });
});

// Announcements
app.post('/api/rooms/:roomId/announcements', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        const announcement = {
            id: Date.now(),
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            createdAt: new Date().toLocaleString()
        };
        room.announcements.unshift(announcement);
        saveData();
        res.json({ success: true, announcement });
    }
});

app.delete('/api/rooms/:roomId/announcements/:announcementId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.announcements = room.announcements.filter(a => a.id !== parseInt(req.params.announcementId));
        saveData();
        res.json({ success: true });
    }
});

// Course Materials with file upload
app.post('/api/rooms/:roomId/materials', upload.single('file'), (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        const material = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description || '',
            type: req.body.type || 'document',
            url: req.file ? `/uploads/materials/${req.file.filename}` : req.body.url,
            filename: req.file?.originalname,
            size: req.file?.size,
            uploadedAt: new Date().toLocaleString()
        };
        room.materials.push(material);
        saveData();
        res.json({ success: true, material });
    }
});

app.delete('/api/rooms/:roomId/materials/:materialId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.materials = room.materials.filter(m => m.id !== parseInt(req.params.materialId));
        saveData();
        res.json({ success: true });
    }
});

// Assignments with file upload
app.post('/api/rooms/:roomId/assignments', upload.single('attachment'), (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        const assignment = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description || '',
            dueDate: req.body.dueDate,
            totalPoints: req.body.totalPoints,
            attachment: req.file ? { url: `/uploads/assignments/${req.file.filename}`, filename: req.file.originalname } : null,
            submissions: [],
            createdAt: new Date().toLocaleString()
        };
        room.assignments.push(assignment);
        saveData();
        res.json({ success: true, assignment });
    }
});

app.delete('/api/rooms/:roomId/assignments/:assignmentId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.assignments = room.assignments.filter(a => a.id !== parseInt(req.params.assignmentId));
        saveData();
        res.json({ success: true });
    }
});

// Live session routes
app.post('/api/live/start', (req, res) => {
    const { roomId, roomName, lecturerName } = req.body;
    liveSessions[roomId] = { active: true, roomName, lecturerName, startedAt: new Date() };
    res.json({ success: true });
});

app.post('/api/live/stop', (req, res) => {
    delete liveSessions[req.body.roomId];
    res.json({ success: true });
});

app.get('/api/live/status/:roomId', (req, res) => {
    res.json({ active: !!liveSessions[req.params.roomId], session: liveSessions[req.params.roomId] || null });
});

app.get('/api/live/active/:programCode/:level', (req, res) => {
    const active = [];
    for (const [roomId, session] of Object.entries(liveSessions)) {
        const room = courseRooms.find(r => r.id == roomId);
        if (room && room.programCode === req.params.programCode && room.level === parseInt(req.params.level)) {
            active.push({ roomId, ...session });
        }
    }
    res.json(active);
});

app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📚 ${courseRooms.length} course rooms loaded`);
});
