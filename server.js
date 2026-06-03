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

// Create HTTP server for WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ============ ALL MZUZU UNIVERSITY PROGRAMS ============
const ALL_PROGRAMS = [
    // Faculty of Education
    { code: "BED_SCI", name: "Bachelor of Education (Science)", faculty: "Education" },
    { code: "BED_ICT", name: "Bachelor of Education ICT", faculty: "Education" },
    { code: "BED_LANG", name: "Bachelor of Education (Languages)", faculty: "Education" },
    { code: "BED_ARTS", name: "Bachelor of Education (Arts)", faculty: "Education" },
    { code: "UCE", name: "University Certificate of Education", faculty: "Education" },
    
    // Faculty of Environmental Sciences
    { code: "BSC_FISH", name: "BSc Fisheries and Aquatic Sciences", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST", name: "BSc Forestry", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST_UP", name: "BSc Forestry (Upgrading)", faculty: "Environmental Sciences" },
    { code: "BSC_WATER", name: "BSc Water Resources Engineering and Management", faculty: "Environmental Sciences" },
    { code: "BSC_COMMDEV", name: "BSc Transformative Community Development", faculty: "Environmental Sciences" },
    { code: "BSC_AGRI", name: "BSc Value Chain Agriculture", faculty: "Environmental Sciences" },
    
    // Faculty of Science, Technology and Innovation
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science, Technology & Innovation" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science, Technology & Innovation" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science, Technology & Innovation" },
    { code: "BSC_CHEM", name: "BSc Science in Chemistry", faculty: "Science, Technology & Innovation" },
    { code: "BSC_PHYS_ELEC", name: "BSc Physics and Electronics", faculty: "Science, Technology & Innovation" },
    { code: "BSC_RENEW", name: "BSc (Hons) Renewable Energy Systems Engineering", faculty: "Science, Technology & Innovation" },
    { code: "BSC_BIODIV", name: "BSc (Hons) Biodiversity Conservation and Management", faculty: "Science, Technology & Innovation" },
    { code: "DIP_ICT_WKND", name: "Diploma in ICT Upgrading (Weekend Mode)", faculty: "Science, Technology & Innovation" },
    
    // Faculty of Health Sciences
    { code: "BSC_OPTO", name: "BSc (Hons) Optometry", faculty: "Health Sciences" },
    { code: "BSC_BIO_MED", name: "BSc (Hons) Biomedical Laboratory Science", faculty: "Health Sciences" },
    { code: "BSC_NURSING", name: "BSc Nursing and Midwifery (Generic)", faculty: "Health Sciences" },
    { code: "BSC_NURSING_UP", name: "BSc Nursing and Midwifery (Upgrading)", faculty: "Health Sciences" },
    
    // Faculty of Humanities and Social Sciences
    { code: "BA_SECURITY", name: "BA Security Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_DEV", name: "BA Development Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_IR", name: "BA International Relations and Diplomacy", faculty: "Humanities & Social Sciences" },
    { code: "BA_POLITICS", name: "BA Politics and Governance", faculty: "Humanities & Social Sciences" },
    { code: "BA_COMMS", name: "BA Communication Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_HISTORY", name: "BA History and Heritage", faculty: "Humanities & Social Sciences" },
    { code: "BA_THEOLOGY", name: "BA Theology and Religious Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_THEOLOGY_ODEL", name: "BA Theology and Religious Studies (ODeL)", faculty: "Humanities & Social Sciences" },
    
    // Faculty of Tourism, Hospitality and Management
    { code: "BB_TOURISM", name: "Bachelor of Business (Tourism Management)", faculty: "Tourism, Hospitality & Management" },
    { code: "BB_TOURISM_ODEL", name: "Bachelor of Business (Tourism Management) – ODeL", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_HERITAGE", name: "BA Culture and Heritage Tourism", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_HOSPITALITY", name: "BSc Hospitality Management", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_CULINARY", name: "BA Culinary Arts", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_SPORTS", name: "BA Sports Management", faculty: "Tourism, Hospitality & Management" },
    { code: "DIP_SAFARI", name: "Diploma in Safari and Tour Guiding", faculty: "Tourism, Hospitality & Management" },
    { code: "DIP_TRAVEL", name: "Diploma in Travel and Tourism", faculty: "Tourism, Hospitality & Management" },
    
    // Faculty of Built Environment
    { code: "BSC_LAND", name: "BSc Land Surveying", faculty: "Built Environment" },
    { code: "BSC_TOWN", name: "BSc Town and Regional Planning", faculty: "Built Environment" },
    { code: "BSC_ESTATE", name: "BSc Estate Management", faculty: "Built Environment" },
    
    // Faculty of Information Science and Communication
    { code: "BSC_LIB", name: "BSc Library and Information Science", faculty: "Information Science & Communication" }
];

// ============ STORAGE ============
let courseRooms = [];
let liveSessions = {};
const ROOMS_FILE = 'rooms.json';

function loadData() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            const data = fs.readFileSync(ROOMS_FILE, 'utf8');
            courseRooms = JSON.parse(data);
            console.log(`✅ Loaded ${courseRooms.length} course rooms`);
        }
    } catch(e) { console.error('Error loading data:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(courseRooms, null, 2));
        console.log(`💾 Saved ${courseRooms.length} course rooms`);
    } catch(e) { console.error('Error saving data:', e); }
}

loadData();

// ============ WEBSOCKET SIGNALING FOR LIVE CLASSES ============
let activeRooms = {};

wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Received:', data.type);
            
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
                        ws.isLecturer = false;
                        console.log(`👩‍🎓 Student joined room ${data.roomId}`);
                        ws.send(JSON.stringify({ type: 'ready', roomId: data.roomId }));
                    } else {
                        ws.send(JSON.stringify({ type: 'no-broadcast', message: 'No live class active' }));
                    }
                    break;
                    
                case 'offer':
                    const targetStudent = findStudentInRoom(data.roomId, data.targetId);
                    if (targetStudent) {
                        targetStudent.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    }
                    break;
                    
                case 'answer':
                    const lecturer = activeRooms[data.roomId]?.lecturer;
                    if (lecturer) {
                        lecturer.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    }
                    break;
                    
                case 'ice-candidate':
                    if (data.target === 'lecturer') {
                        activeRooms[data.roomId]?.lecturer?.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    } else {
                        const student = findStudentInRoom(data.roomId, data.targetId);
                        if (student) {
                            student.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                        }
                    }
                    break;
                    
                case 'stop-broadcast':
                    const stopRoom = activeRooms[data.roomId];
                    if (stopRoom) {
                        stopRoom.students.forEach(student => {
                            student.send(JSON.stringify({ type: 'broadcast-ended' }));
                        });
                        delete activeRooms[data.roomId];
                        console.log(`🛑 Broadcast ended for room ${data.roomId}`);
                    }
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch(e) {
            console.error('WebSocket error:', e);
        }
    });
    
    ws.on('close', () => {
        if (ws.roomId && activeRooms[ws.roomId]) {
            if (ws.isLecturer) {
                // Lecturer disconnected, notify all students
                activeRooms[ws.roomId].students.forEach(student => {
                    student.send(JSON.stringify({ type: 'broadcast-ended' }));
                });
                delete activeRooms[ws.roomId];
                console.log(`👨‍🏫 Lecturer disconnected from room ${ws.roomId}`);
            } else {
                // Student disconnected, remove from room
                const room = activeRooms[ws.roomId];
                if (room) {
                    room.students.delete(ws);
                }
                console.log(`👩‍🎓 Student disconnected from room ${ws.roomId}`);
            }
        }
    });
});

function findStudentInRoom(roomId, targetId) {
    const room = activeRooms[roomId];
    if (room) {
        for (const student of room.students) {
            if (student._id === targetId || student === targetId) {
                return student;
            }
        }
    }
    return null;
}

// ============ API ROUTES ============

// Get all programs
app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

// Lecturer login
app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (!program) return res.status(401).json({ success: false, message: 'Program not found' });
    
    const expectedUsername = `lecturer_${programCode}_l${level}`;
    if (username === expectedUsername && password === 'lecturer123') {
        res.json({ 
            success: true, 
            role: 'lecturer', 
            name: program.name, 
            programCode, 
            programName: program.name, 
            level: parseInt(level),
            faculty: program.faculty
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid lecturer credentials' });
    }
});

// Student login
app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (!program) return res.status(401).json({ success: false, message: 'Program not found' });
    
    const expectedUsername = `student_${programCode}_l${level}_1`;
    if (username === expectedUsername && password === 'student123') {
        res.json({ 
            success: true, 
            role: 'student', 
            name: program.name, 
            programCode, 
            programName: program.name, 
            level: parseInt(level),
            faculty: program.faculty
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid student credentials' });
    }
});

// ============ COURSE ROOM ROUTES ============

// Get all rooms for a program and level
app.get('/api/rooms/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = courseRooms.filter(r => r.programCode === programCode && r.level === parseInt(level));
    res.json(filtered);
});

// Get single room details
app.get('/api/rooms/detail/:roomId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    res.json(room || null);
});

// Create a new course room
app.post('/api/rooms', (req, res) => {
    const { programCode, level, courseCode, courseName, lecturerName, description, syllabus, objectives } = req.body;
    const room = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        courseCode,
        courseName,
        lecturerName,
        description: description || '',
        syllabus: syllabus || '',
        objectives: objectives || '',
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

// Update course room
app.put('/api/rooms/:roomId', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const index = courseRooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
        courseRooms[index] = { ...courseRooms[index], ...req.body, updatedAt: new Date().toLocaleString() };
        saveData();
        res.json({ success: true, room: courseRooms[index] });
    } else {
        res.status(404).json({ success: false });
    }
});

// Delete course room
app.delete('/api/rooms/:id', (req, res) => {
    const id = parseInt(req.params.id);
    courseRooms = courseRooms.filter(r => r.id !== id);
    delete liveSessions[id];
    saveData();
    res.json({ success: true });
});

// ============ ANNOUNCEMENTS ============

// Post announcement to a room
app.post('/api/rooms/:roomId/announcements', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const room = courseRooms.find(r => r.id === roomId);
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
    } else {
        res.status(404).json({ success: false });
    }
});

// Delete announcement
app.delete('/api/rooms/:roomId/announcements/:announcementId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.announcements = room.announcements.filter(a => a.id !== parseInt(req.params.announcementId));
        saveData();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// ============ COURSE MATERIALS ============

// Upload course material
app.post('/api/rooms/:roomId/materials', upload.single('file'), (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const room = courseRooms.find(r => r.id === roomId);
    if (room) {
        const material = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description || '',
            type: req.body.type || 'document',
            url: req.file ? `/uploads/${req.file.filename}` : req.body.url,
            filename: req.file?.originalname,
            size: req.file?.size,
            uploadedAt: new Date().toLocaleString()
        };
        room.materials.push(material);
        saveData();
        res.json({ success: true, material });
    } else {
        res.status(404).json({ success: false });
    }
});

// Delete course material
app.delete('/api/rooms/:roomId/materials/:materialId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.materials = room.materials.filter(m => m.id !== parseInt(req.params.materialId));
        saveData();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// ============ ASSIGNMENTS ============

// Create assignment
app.post('/api/rooms/:roomId/assignments', (req, res) => {
    const roomId = parseInt(req.params.roomId);
    const room = courseRooms.find(r => r.id === roomId);
    if (room) {
        const assignment = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description || '',
            dueDate: req.body.dueDate,
            totalPoints: req.body.totalPoints,
            attachments: req.body.attachments || [],
            submissions: [],
            createdAt: new Date().toLocaleString()
        };
        room.assignments.push(assignment);
        saveData();
        res.json({ success: true, assignment });
    } else {
        res.status(404).json({ success: false });
    }
});

// Delete assignment
app.delete('/api/rooms/:roomId/assignments/:assignmentId', (req, res) => {
    const room = courseRooms.find(r => r.id === parseInt(req.params.roomId));
    if (room) {
        room.assignments = room.assignments.filter(a => a.id !== parseInt(req.params.assignmentId));
        saveData();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// ============ LIVE SESSION ROUTES ============

// Start a live session
app.post('/api/live/start', (req, res) => {
    const { roomId, roomName, lecturerName } = req.body;
    liveSessions[roomId] = { 
        active: true, 
        roomName, 
        lecturerName, 
        startedAt: new Date().toISOString() 
    };
    console.log(`📹 Live session started for room: ${roomName}`);
    res.json({ success: true });
});

// Stop a live session
app.post('/api/live/stop', (req, res) => {
    const { roomId } = req.body;
    delete liveSessions[roomId];
    console.log(`📹 Live session stopped for room: ${roomId}`);
    res.json({ success: true });
});

// Check live status for a room
app.get('/api/live/status/:roomId', (req, res) => {
    const session = liveSessions[req.params.roomId];
    res.json({ active: !!session, session: session || null });
});

// Get all active live sessions for a program/level
app.get('/api/live/active/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const activeSessions = [];
    for (const [roomId, session] of Object.entries(liveSessions)) {
        const room = courseRooms.find(r => r.id == roomId);
        if (room && room.programCode === programCode && room.level === parseInt(level)) {
            activeSessions.push({ roomId, ...session });
        }
    }
    res.json(activeSessions);
});

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log(`📊 Loaded ${ALL_PROGRAMS.length} academic programs`);
    console.log(`📚 Loaded ${courseRooms.length} course rooms`);
    console.log(`🔌 WebSocket server ready for live streaming`);
    console.log(`\n🔐 DEMO LOGIN:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student:  student_BED_ICT_l1_1 / student123`);
    console.log(`${'='.repeat(50)}\n`);
});
