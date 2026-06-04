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
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/announcements', 'uploads/profile_pics'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'materialFile') folder = 'uploads/materials';
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

let posts = [];
let liveSession = null; // Track single live session
const POSTS_FILE = 'posts.json';

function loadPosts() {
    try {
        if (fs.existsSync(POSTS_FILE)) {
            posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
            console.log(`✅ Loaded ${posts.length} posts`);
        }
    } catch(e) { console.error('Error loading posts:', e); }
}

function savePosts() {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    } catch(e) { console.error('Error saving posts:', e); }
}

loadPosts();

// WebSocket connections
let waitingStudents = [];

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Received:', data.type);
            
            if (data.type === 'lecturer-ready') {
                ws.isLecturer = true;
                ws.streamId = data.streamId;
                console.log('👨‍🏫 Lecturer ready');
                // Notify waiting students
                waitingStudents.forEach(student => {
                    student.send(JSON.stringify({ type: 'lecturer-ready' }));
                });
                waitingStudents = [];
            }
            
            if (data.type === 'student-ready') {
                ws.isStudent = true;
                if (wss.clients.some(client => client.isLecturer)) {
                    ws.send(JSON.stringify({ type: 'lecturer-ready' }));
                } else {
                    waitingStudents.push(ws);
                    console.log('👩‍🎓 Student waiting for lecturer');
                }
            }
            
            if (data.type === 'offer') {
                wss.clients.forEach(client => {
                    if (client.isLecturer && client !== ws) {
                        client.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    }
                });
            }
            
            if (data.type === 'answer') {
                wss.clients.forEach(client => {
                    if (client.isStudent && client !== ws) {
                        client.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    }
                });
            }
            
            if (data.type === 'ice-candidate') {
                wss.clients.forEach(client => {
                    if (client.isLecturer && client !== ws && data.target === 'lecturer') {
                        client.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    }
                    if (client.isStudent && client !== ws && data.target === 'student') {
                        client.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                    }
                });
            }
            
            if (data.type === 'stop-broadcast') {
                liveSession = null;
                wss.clients.forEach(client => {
                    if (client.isStudent) {
                        client.send(JSON.stringify({ type: 'broadcast-ended' }));
                    }
                });
                console.log('🛑 Broadcast ended');
            }
        } catch(e) { console.error('WebSocket error:', e); }
    });
    
    ws.on('close', () => {
        if (ws.isLecturer) {
            liveSession = null;
            wss.clients.forEach(client => {
                if (client.isStudent) {
                    client.send(JSON.stringify({ type: 'broadcast-ended' }));
                }
            });
        }
    });
});

// API Routes
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

app.get('/api/posts/general/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = posts.filter(p => p.programCode === programCode && p.level === parseInt(level));
    res.json(filtered);
});

app.post('/api/posts', upload.single('mediaFile'), (req, res) => {
    const { programCode, level, title, content, lecturerName, mediaType, dueDate, points } = req.body;
    
    let media = null;
    if (req.file) {
        media = {
            type: mediaType || 'document',
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
        lecturerName: lecturerName,
        media: media,
        dueDate: dueDate || null,
        points: points || null,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    
    posts.unshift(post);
    savePosts();
    res.json({ success: true, post });
});

app.delete('/api/posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    posts = posts.filter(p => p.id !== id);
    savePosts();
    res.json({ success: true });
});

app.post('/api/live/start', (req, res) => {
    const { courseName, lecturerName } = req.body;
    liveSession = { active: true, courseName, lecturerName, startedAt: new Date() };
    console.log(`📹 Live session started: ${courseName} by ${lecturerName}`);
    res.json({ success: true });
});

app.post('/api/live/stop', (req, res) => {
    liveSession = null;
    console.log(`📹 Live session stopped`);
    res.json({ success: true });
});

app.get('/api/live/status', (req, res) => {
    res.json({ active: liveSession !== null, session: liveSession });
});

app.post('/api/upload-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    res.json({ success: true, fileUrl: `/uploads/profile_pics/${req.file.filename}` });
});

app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 ${ALL_PROGRAMS.length} programs loaded`);
    console.log(`🔌 WebSocket server ready`);
    console.log(`\n🔐 DEMO LOGIN:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student:  student_BED_ICT_l1_1 / student123`);
    console.log(`${'='.repeat(50)}\n`);
});
