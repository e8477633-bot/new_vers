const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ============ ALL PROGRAMS ============
const ALL_PROGRAMS = [
    { code: "BED_SCI", name: "Bachelor of Education (Science)", faculty: "Education" },
    { code: "BED_ICT", name: "Bachelor of Education ICT", faculty: "Education" },
    { code: "BED_LANG", name: "Bachelor of Education (Languages)", faculty: "Education" },
    { code: "BED_ARTS", name: "Bachelor of Education (Arts)", faculty: "Education" },
    { code: "BSC_FISH", name: "BSc Fisheries and Aquatic Sciences", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST", name: "BSc Forestry", faculty: "Environmental Sciences" },
    { code: "BSC_WATER", name: "BSc Water Resources Engineering and Management", faculty: "Environmental Sciences" },
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science, Technology & Innovation" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science, Technology & Innovation" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science, Technology & Innovation" },
    { code: "BSC_NURSING", name: "BSc Nursing and Midwifery", faculty: "Health Sciences" },
    { code: "BA_COMMS", name: "BA Communication Studies", faculty: "Humanities & Social Sciences" },
    { code: "BB_TOURISM", name: "Bachelor of Business (Tourism Management)", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_LAND", name: "BSc Land Surveying", faculty: "Built Environment" },
    { code: "BSC_LIB", name: "BSc Library and Information Science", faculty: "Information Science" }
];

// ============ STORAGE ============
let posts = [];
let courseRooms = [];
let liveSessions = {}; // Track active live sessions by roomId
const POSTS_FILE = 'posts.json';
const ROOMS_FILE = 'rooms.json';

function loadData() {
    try {
        if (fs.existsSync(POSTS_FILE)) posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        if (fs.existsSync(ROOMS_FILE)) courseRooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
        console.log(`✅ Loaded ${posts.length} posts, ${courseRooms.length} rooms`);
    } catch(e) { console.error('Error loading data:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(courseRooms, null, 2));
    } catch(e) { console.error('Error saving data:', e); }
}

loadData();

// ============ API ROUTES ============

app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

// Lecturer login
app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    if (!program) return res.status(401).json({ success: false, message: 'Program not found' });
    
    const expectedUsername = `lecturer_${programCode}_l${level}`;
    if (username === expectedUsername && password === 'lecturer123') {
        res.json({ success: true, role: 'lecturer', name: program.name, programCode, programName: program.name, level: parseInt(level) });
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
        res.json({ success: true, role: 'student', name: program.name, programCode, programName: program.name, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false, message: 'Invalid student credentials' });
    }
});

// ============ Live Session Routes ============

// Start a live session
app.post('/api/live/start', (req, res) => {
    const { roomId, roomName, lecturerName } = req.body;
    if (!liveSessions[roomId]) {
        liveSessions[roomId] = {
            roomId,
            roomName,
            lecturerName,
            startedAt: new Date().toISOString(),
            active: true
        };
        console.log(`📹 Live session started for room: ${roomName}`);
    }
    res.json({ success: true, session: liveSessions[roomId] });
});

// Stop a live session
app.post('/api/live/stop', (req, res) => {
    const { roomId } = req.body;
    if (liveSessions[roomId]) {
        delete liveSessions[roomId];
        console.log(`📹 Live session ended for room: ${roomId}`);
    }
    res.json({ success: true });
});

// Check if a room has an active live session
app.get('/api/live/status/:roomId', (req, res) => {
    const { roomId } = req.params;
    const session = liveSessions[roomId];
    res.json({ active: !!session, session: session || null });
});

// Get all active live sessions for a program/level (for students)
app.get('/api/live/active/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const activeSessions = [];
    for (const [roomId, session] of Object.entries(liveSessions)) {
        // Find the room to check its program/level
        const room = courseRooms.find(r => r.id == roomId);
        if (room && room.programCode === programCode && room.level === parseInt(level)) {
            activeSessions.push({ roomId, ...session });
        }
    }
    res.json(activeSessions);
});

// ============ Course Room Routes ============

app.get('/api/rooms/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = courseRooms.filter(r => r.programCode === programCode && r.level === parseInt(level));
    res.json(filtered);
});

app.post('/api/rooms', (req, res) => {
    const { programCode, level, courseCode, courseName, lecturerName, description } = req.body;
    const room = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        courseCode,
        courseName,
        lecturerName,
        description: description || '',
        createdAt: new Date().toLocaleString(),
        posts: []
    };
    courseRooms.push(room);
    saveData();
    res.json({ success: true, room });
});

app.delete('/api/rooms/:id', (req, res) => {
    const id = parseInt(req.params.id);
    courseRooms = courseRooms.filter(r => r.id !== id);
    posts = posts.filter(p => p.roomId !== id);
    if (liveSessions[id]) delete liveSessions[id];
    saveData();
    res.json({ success: true });
});

app.get('/api/posts/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const filtered = posts.filter(p => p.roomId === parseInt(roomId));
    res.json(filtered);
});

app.get('/api/posts/general/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = posts.filter(p => p.programCode === programCode && p.level === parseInt(level) && !p.roomId);
    res.json(filtered);
});

app.post('/api/posts', upload.single('mediaFile'), (req, res) => {
    const { programCode, level, title, content, lecturerName, mediaType, roomId, roomName } = req.body;
    
    let media = null;
    if (req.file) {
        media = {
            type: mediaType,
            url: `/uploads/${req.file.filename}`,
            filename: req.file.originalname
        };
    }
    
    const post = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        title: title.trim(),
        content: content.trim(),
        lecturerName,
        media,
        roomId: roomId ? parseInt(roomId) : null,
        roomName: roomName || null,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    
    posts.unshift(post);
    saveData();
    res.json({ success: true, post });
});

app.delete('/api/posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const deletedPost = posts.find(p => p.id === id);
    if (deletedPost?.media?.url) {
        const filePath = path.join(__dirname, deletedPost.media.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    posts = posts.filter(p => p.id !== id);
    saveData();
    res.json({ success: true });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 ${ALL_PROGRAMS.length} programs, ${courseRooms.length} rooms, ${posts.length} posts`);
});
