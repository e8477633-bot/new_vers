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

// Create upload directories
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/syllabus', 'uploads/assignments', 'uploads/announcements', 'uploads/profile_pics'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'syllabusFile') folder = 'uploads/syllabus';
        if (file.fieldname === 'materialFile') folder = 'uploads/materials';
        if (file.fieldname === 'assignmentFile') folder = 'uploads/assignments';
        if (file.fieldname === 'announcementFile') folder = 'uploads/announcements';
        if (file.fieldname === 'profilePic') folder = 'uploads/profile_pics';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// All Mzuzu University Programs
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

let courseRooms = [];
let liveSessions = {};
const ROOMS_FILE = 'rooms.json';

function loadData() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            const data = fs.readFileSync(ROOMS_FILE, 'utf8');
            courseRooms = JSON.parse(data);
            console.log(`✅ Loaded ${courseRooms.length} course rooms`);
        } else {
            // Create sample room for testing
            const sampleRoom = {
                id: Date.now(),
                programCode: "BED_ICT",
                level: 1,
                courseCode: "ICT2101",
                courseName: "Sample Course Room",
                lecturerName: "Demo Lecturer",
                description: "This is a sample course room. You can edit or delete it.",
                objectives: "Learn how to use the portal",
                syllabus: null,
                materials: [],
                assignments: [],
                announcements: [],
                createdAt: new Date().toLocaleString(),
                updatedAt: new Date().toLocaleString()
            };
            courseRooms.push(sampleRoom);
            saveData();
            console.log(`✅ Created sample course room`);
        }
    } catch(e) { console.error('Error loading data:', e); courseRooms = []; }
}

function saveData() {
    try {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(courseRooms, null, 2));
        console.log(`💾 Saved ${courseRooms.length} course rooms`);
    } catch(e) { console.error('Error saving data:', e); }
}

loadData();

// WebSocket signaling for live classes
let activeLecturers = {};

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Received:', data.type);
            
            switch (data.type) {
                case 'lecturer-join':
                    activeLecturers[data.roomId] = ws;
                    ws.roomId = data.roomId;
                    ws.isLecturer = true;
                    ws.send(JSON.stringify({ type: 'lecturer-ready' }));
                    console.log(`👨‍🏫 Lecturer joined room ${data.roomId}`);
                    break;
                    
                case 'student-join':
                    ws.roomId = data.roomId;
                    ws.isLecturer = false;
                    const lecturer = activeLecturers[data.roomId];
                    if (lecturer) {
                        ws.send(JSON.stringify({ type: 'lecturer-ready' }));
                        lecturer.send(JSON.stringify({ type: 'student-joined' }));
                        console.log(`👩‍🎓 Student joined room ${data.roomId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'no-lecturer' }));
                    }
                    break;
                    
                case 'offer':
                    const targetLecturer = activeLecturers[data.roomId];
                    if (targetLecturer) {
                        targetLecturer.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    }
                    break;
                    
                case 'answer':
                    const targetLecturerForAnswer = activeLecturers[data.roomId];
                    if (targetLecturerForAnswer) {
                        targetLecturerForAnswer.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    }
                    break;
                    
                case 'ice-candidate':
                    if (data.target === 'lecturer') {
                        const lecturerIce = activeLecturers[data.roomId];
                        if (lecturerIce) {
                            lecturerIce.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                        }
                    } else {
                        wss.clients.forEach(client => {
                            if (client.roomId === data.roomId && !client.isLecturer) {
                                client.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                            }
                        });
                    }
                    break;
                    
                case 'stop-broadcast':
                    delete activeLecturers[data.roomId];
                    wss.clients.forEach(client => {
                        if (client.roomId === data.roomId && !client.isLecturer) {
                            client.send(JSON.stringify({ type: 'broadcast-ended' }));
                        }
                    });
                    console.log(`🛑 Broadcast ended for room ${data.roomId}`);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch(e) { console.error('WebSocket error:', e); }
    });
    
    ws.on('close', () => {
        if (ws.isLecturer && ws.roomId) {
            delete activeLecturers[ws.roomId];
            console.log(`👨‍🏫 Lecturer left room ${ws.roomId}`);
        }
    });
});

// ============ API ROUTES ============

app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (username === `lecturer_${programCode}_l${level}` && password === 'lecturer123') {
        res.json({ success: true, role: 'lecturer', name: program?.name || programCode, fullname: `Lecturer - ${program?.name || programCode}`, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (username === `student_${programCode}_l${level}_1` && password === 'student123') {
        res.json({ success: true, role: 'student', name: program?.name || programCode, fullname: `Student - ${program?.name || programCode}`, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Course Rooms - GET all rooms for program/level
app.get('/api/rooms/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    console.log(`Fetching rooms for program: ${programCode}, level: ${level}`);
    const filtered = courseRooms.filter(r => r.programCode === programCode && r.level === parseInt(level));
    console.log(`Found ${filtered.length} rooms`);
    res.json(filtered);
});

// Course Rooms - GET single room by ID
app.get('/api/rooms/detail/:roomId', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    console.log(`Fetching room details for ID: ${roomId}`);
    const room = courseRooms.find(r => r.id === roomId);
    if (room) {
        console.log(`Found room: ${room.courseName}`);
        res.json(room);
    } else {
        console.log(`Room not found with ID: ${roomId}`);
        res.status(404).json({ success: false, error: 'Room not found' });
    }
});

// Course Rooms - CREATE new room
app.post('/api/rooms', upload.single('syllabusFile'), (req, res) => {
    console.log('Creating new room with data:', req.body);
    const { programCode, level, courseCode, courseName, lecturerName, description, objectives } = req.body;
    
    const newRoom = {
        id: Date.now(),
        programCode: programCode,
        level: parseInt(level),
        courseCode: courseCode,
        courseName: courseName || "Untitled Course",
        lecturerName: lecturerName || "Unknown Lecturer",
        description: description || '',
        objectives: objectives || '',
        syllabus: req.file ? { url: `/uploads/syllabus/${req.file.filename}`, filename: req.file.originalname } : null,
        materials: [],
        assignments: [],
        announcements: [],
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
    };
    
    courseRooms.push(newRoom);
    saveData();
    console.log(`Created room with ID: ${newRoom.id}`);
    res.json({ success: true, room: newRoom });
});

// Course Rooms - UPDATE room
app.put('/api/rooms/:roomId', upload.single('syllabusFile'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    console.log(`Updating room ID: ${roomId}`);
    const index = courseRooms.findIndex(r => r.id === roomId);
    
    if (index !== -1) {
        if (req.file) {
            req.body.syllabus = { url: `/uploads/syllabus/${req.file.filename}`, filename: req.file.originalname };
        }
        courseRooms[index] = { ...courseRooms[index], ...req.body, updatedAt: new Date().toLocaleString() };
        saveData();
        console.log(`Updated room: ${courseRooms[index].courseName}`);
        res.json({ success: true, room: courseRooms[index] });
    } else {
        console.log(`Room not found for update: ${roomId}`);
        res.status(404).json({ success: false, error: 'Room not found' });
    }
});

// Course Rooms - DELETE room
app.delete('/api/rooms/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`Deleting room ID: ${id}`);
    const beforeCount = courseRooms.length;
    courseRooms = courseRooms.filter(r => r.id !== id);
    saveData();
    console.log(`Deleted room. Before: ${beforeCount}, After: ${courseRooms.length}`);
    res.json({ success: true });
});

// Announcements - POST
app.post('/api/rooms/:roomId/announcements', upload.single('announcementFile'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    console.log(`Posting announcement to room ID: ${roomId}`);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        console.log(`Room not found for announcement: ${roomId}`);
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    const announcement = {
        id: Date.now(),
        title: req.body.title,
        content: req.body.content,
        author: req.body.author,
        attachment: req.file ? { url: `/uploads/announcements/${req.file.filename}`, filename: req.file.originalname } : null,
        createdAt: new Date().toLocaleString()
    };
    
    room.announcements = [announcement, ...(room.announcements || [])];
    saveData();
    console.log(`Announcement posted to room: ${room.courseName}`);
    res.json({ success: true, announcement });
});

// Announcements - DELETE
app.delete('/api/rooms/:roomId/announcements/:announcementId', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const announcementId = parseInt(req.params.announcementId);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    room.announcements = (room.announcements || []).filter(a => a.id !== announcementId);
    saveData();
    res.json({ success: true });
});

// Materials - POST
app.post('/api/rooms/:roomId/materials', upload.single('file'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    console.log(`Uploading material to room ID: ${roomId}`);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        console.log(`Room not found for material: ${roomId}`);
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    const material = {
        id: Date.now(),
        title: req.body.title,
        description: req.body.description || '',
        type: req.body.type || 'document',
        url: req.file ? `/uploads/materials/${req.file.filename}` : req.body.url,
        filename: req.file?.originalname,
        uploadedAt: new Date().toLocaleString()
    };
    
    room.materials = [...(room.materials || []), material];
    saveData();
    console.log(`Material uploaded to room: ${room.courseName}`);
    res.json({ success: true, material });
});

// Materials - DELETE
app.delete('/api/rooms/:roomId/materials/:materialId', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const materialId = parseInt(req.params.materialId);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    room.materials = (room.materials || []).filter(m => m.id !== materialId);
    saveData();
    res.json({ success: true });
});

// Assignments - POST
app.post('/api/rooms/:roomId/assignments', upload.single('attachment'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    console.log(`Creating assignment for room ID: ${roomId}`);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        console.log(`Room not found for assignment: ${roomId}`);
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
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
    
    room.assignments = [...(room.assignments || []), assignment];
    saveData();
    console.log(`Assignment created for room: ${room.courseName}`);
    res.json({ success: true, assignment });
});

// Assignments - DELETE
app.delete('/api/rooms/:roomId/assignments/:assignmentId', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const assignmentId = parseInt(req.params.assignmentId);
    const room = courseRooms.find(r => r.id === roomId);
    
    if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    room.assignments = (room.assignments || []).filter(a => a.id !== assignmentId);
    saveData();
    res.json({ success: true });
});

// Live Sessions
app.post('/api/live/start', (req, res) => {
    liveSessions[req.body.roomId] = { active: true, roomName: req.body.roomName, lecturerName: req.body.lecturerName, startedAt: new Date() };
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

// Profile Picture Upload
app.post('/api/upload-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    res.json({ success: true, fileUrl: `/uploads/profile_pics/${req.file.filename}` });
});

// Health Check
app.get('/health', (req, res) => res.send('OK'));

// Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 ${ALL_PROGRAMS.length} programs loaded`);
    console.log(`📚 ${courseRooms.length} course rooms loaded`);
    console.log(`🔌 WebSocket server ready for live classes`);
    console.log(`\n🔐 DEMO LOGIN:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student:  student_BED_ICT_l1_1 / student123`);
    console.log(`${'='.repeat(50)}\n`);
});
