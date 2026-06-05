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
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/assignments', 'uploads/announcements', 'uploads/profile_pics', 'uploads/student_profiles', 'uploads/covers'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'materialFile') folder = 'uploads/materials';
        if (file.fieldname === 'assignmentFile') folder = 'uploads/assignments';
        if (file.fieldname === 'announcementFile') folder = 'uploads/announcements';
        if (file.fieldname === 'profilePic') folder = 'uploads/profile_pics';
        if (file.fieldname === 'studentPhoto') folder = 'uploads/student_profiles';
        if (file.fieldname === 'coverImage') folder = 'uploads/covers';
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
    { code: "BSC_COMMDEV", name: "BSc Transformative Community Development", faculty: "Environmental Sciences" },
    { code: "BSC_AGRI", name: "BSc Value Chain Agriculture", faculty: "Environmental Sciences" },
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science & Technology" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science & Technology" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science & Technology" },
    { code: "BSC_CHEM", name: "BSc Science in Chemistry", faculty: "Science & Technology" },
    { code: "BSC_PHYS_ELEC", name: "BSc Physics and Electronics", faculty: "Science & Technology" },
    { code: "BSC_RENEW", name: "BSc (Hons) Renewable Energy Systems Engineering", faculty: "Science & Technology" },
    { code: "BSC_BIODIV", name: "BSc (Hons) Biodiversity Conservation and Management", faculty: "Science & Technology" },
    { code: "BSC_OPTO", name: "BSc (Hons) Optometry", faculty: "Health Sciences" },
    { code: "BSC_BIO_MED", name: "BSc (Hons) Biomedical Laboratory Science", faculty: "Health Sciences" },
    { code: "BSC_NURSING", name: "BSc Nursing and Midwifery (Generic)", faculty: "Health Sciences" },
    { code: "BSC_NURSING_UP", name: "BSc Nursing and Midwifery (Upgrading)", faculty: "Health Sciences" },
    { code: "BA_SECURITY", name: "BA Security Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_DEV", name: "BA Development Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_IR", name: "BA International Relations and Diplomacy", faculty: "Humanities & Social Sciences" },
    { code: "BA_POLITICS", name: "BA Politics and Governance", faculty: "Humanities & Social Sciences" },
    { code: "BA_COMMS", name: "BA Communication Studies", faculty: "Humanities & Social Sciences" },
    { code: "BA_HISTORY", name: "BA History and Heritage", faculty: "Humanities & Social Sciences" },
    { code: "BA_THEOLOGY", name: "BA Theology and Religious Studies", faculty: "Humanities & Social Sciences" },
    { code: "BB_TOURISM", name: "Bachelor of Business (Tourism Management)", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_HERITAGE", name: "BA Culture and Heritage Tourism", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_HOSPITALITY", name: "BSc Hospitality Management", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_CULINARY", name: "BA Culinary Arts", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_SPORTS", name: "BA Sports Management", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_LAND", name: "BSc Land Surveying", faculty: "Built Environment" },
    { code: "BSC_TOWN", name: "BSc Town and Regional Planning", faculty: "Built Environment" },
    { code: "BSC_ESTATE", name: "BSc Estate Management", faculty: "Built Environment" },
    { code: "BSC_LIB", name: "BSc Library and Information Science", faculty: "Information Science & Communication" }
];

// Course Compartments Storage
let courseCompartments = [];
let liveSession = null;
let suggestions = []; // Global suggestions storage
const COMPARTMENTS_FILE = 'compartments.json';
const SUGGESTIONS_FILE = 'suggestions.json';

function loadCompartments() {
    try {
        if (fs.existsSync(COMPARTMENTS_FILE)) {
            courseCompartments = JSON.parse(fs.readFileSync(COMPARTMENTS_FILE, 'utf8'));
            console.log(`✅ Loaded ${courseCompartments.length} course compartments`);
        }
    } catch(e) { console.error('Error loading compartments:', e); }
}

function saveCompartments() {
    try {
        fs.writeFileSync(COMPARTMENTS_FILE, JSON.stringify(courseCompartments, null, 2));
    } catch(e) { console.error('Error saving compartments:', e); }
}

function loadSuggestions() {
    try {
        if (fs.existsSync(SUGGESTIONS_FILE)) {
            suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'));
            console.log(`✅ Loaded ${suggestions.length} suggestions`);
        }
    } catch(e) { console.error('Error loading suggestions:', e); }
}

function saveSuggestions() {
    try {
        fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    } catch(e) { console.error('Error saving suggestions:', e); }
}

loadCompartments();
loadSuggestions();

// WebSocket for live streaming
let waitingStudents = [];

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'lecturer-ready':
                    ws.isLecturer = true;
                    ws.streamId = data.streamId;
                    waitingStudents.forEach(student => {
                        student.send(JSON.stringify({ type: 'lecturer-ready' }));
                    });
                    waitingStudents = [];
                    break;
                    
                case 'student-ready':
                    ws.isStudent = true;
                    if (wss.clients.some(client => client.isLecturer)) {
                        ws.send(JSON.stringify({ type: 'lecturer-ready' }));
                    } else {
                        waitingStudents.push(ws);
                    }
                    break;
                    
                case 'offer':
                    wss.clients.forEach(client => {
                        if (client.isLecturer && client !== ws) {
                            client.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                        }
                    });
                    break;
                    
                case 'answer':
                    wss.clients.forEach(client => {
                        if (client.isStudent && client !== ws) {
                            client.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                        }
                    });
                    break;
                    
                case 'ice-candidate':
                    wss.clients.forEach(client => {
                        if (client.isLecturer && client !== ws && data.target === 'lecturer') {
                            client.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                        }
                        if (client.isStudent && client !== ws && data.target === 'student') {
                            client.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                        }
                    });
                    break;
                    
                case 'stop-broadcast':
                    liveSession = null;
                    wss.clients.forEach(client => {
                        if (client.isStudent) {
                            client.send(JSON.stringify({ type: 'broadcast-ended' }));
                        }
                    });
                    break;
            }
        } catch(e) { console.error('WebSocket error:', e); }
    });
});

// ============ AUTHENTICATION ROUTES ============

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

// ============ COURSE COMPARTMENT ROUTES ============

// Get all compartments for a program and level
app.get('/api/compartments/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = courseCompartments.filter(c => c.programCode === programCode && c.level === parseInt(level));
    res.json(filtered);
});

// Get single compartment details
app.get('/api/compartments/detail/:compartmentId', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    res.json(compartment || null);
});

// Create new compartment
app.post('/api/compartments', upload.single('coverImage'), (req, res) => {
    const { programCode, level, compartmentName, description, lecturerName } = req.body;
    
    const newCompartment = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        compartmentName: compartmentName || "Untitled Course",
        description: description || '',
        lecturerName: lecturerName,
        coverImage: req.file ? `/uploads/covers/${req.file.filename}` : null,
        materials: [],
        assignments: [],
        announcements: [],
        students: [],
        suggestions: [],
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
    };
    
    courseCompartments.push(newCompartment);
    saveCompartments();
    res.json({ success: true, compartment: newCompartment });
});

// Update compartment
app.put('/api/compartments/:compartmentId', upload.single('coverImage'), (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        if (req.file) compartment.coverImage = `/uploads/covers/${req.file.filename}`;
        if (req.body.compartmentName) compartment.compartmentName = req.body.compartmentName;
        if (req.body.description) compartment.description = req.body.description;
        if (req.body.students) compartment.students = req.body.students;
        if (req.body.suggestions) compartment.suggestions = req.body.suggestions;
        compartment.updatedAt = new Date().toLocaleString();
        saveCompartments();
        res.json({ success: true, compartment });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// Delete compartment
app.delete('/api/compartments/:id', (req, res) => {
    courseCompartments = courseCompartments.filter(c => c.id !== parseInt(req.params.id));
    saveCompartments();
    res.json({ success: true });
});

// ============ STUDENT MANAGEMENT ROUTES ============

// Add student to compartment
app.post('/api/compartments/:compartmentId/students', upload.single('studentPhoto'), (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        const student = {
            id: Date.now(),
            name: req.body.name,
            email: req.body.email,
            studentId: req.body.studentId,
            photo: req.file ? `/uploads/student_profiles/${req.file.filename}` : null,
            performance: {
                assignmentScore: 0,
                testScore: 0,
                attendance: 0,
                averageScore: 0
            },
            warnings: [],
            lecturerStatement: '',
            addedAt: new Date().toLocaleString()
        };
        compartment.students.push(student);
        saveCompartments();
        res.json({ success: true, student });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// Update student performance
app.post('/api/compartments/:compartmentId/students/:studentId/performance', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        const student = compartment.students.find(s => s.id === parseInt(req.params.studentId));
        if (student) {
            student.performance = { ...student.performance, ...req.body };
            if (req.body.lecturerStatement) student.lecturerStatement = req.body.lecturerStatement;
            saveCompartments();
            res.json({ success: true, student });
        } else {
            res.status(404).json({ success: false, error: 'Student not found' });
        }
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// Delete student from compartment
app.delete('/api/compartments/:compartmentId/students/:studentId', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        compartment.students = compartment.students.filter(s => s.id !== parseInt(req.params.studentId));
        saveCompartments();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// ============ MATERIALS ROUTES ============

app.post('/api/compartments/:compartmentId/materials', upload.single('file'), (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        const material = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description || '',
            type: req.body.type || 'document',
            url: req.file ? `/uploads/materials/${req.file.filename}` : req.body.url,
            filename: req.file?.originalname,
            uploadedAt: new Date().toLocaleString()
        };
        compartment.materials.push(material);
        saveCompartments();
        res.json({ success: true, material });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

app.delete('/api/compartments/:compartmentId/materials/:materialId', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        compartment.materials = compartment.materials.filter(m => m.id !== parseInt(req.params.materialId));
        saveCompartments();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// ============ ASSIGNMENTS ROUTES ============

app.post('/api/compartments/:compartmentId/assignments', upload.single('attachment'), (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
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
        compartment.assignments.push(assignment);
        saveCompartments();
        res.json({ success: true, assignment });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

app.delete('/api/compartments/:compartmentId/assignments/:assignmentId', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        compartment.assignments = compartment.assignments.filter(a => a.id !== parseInt(req.params.assignmentId));
        saveCompartments();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// ============ ANNOUNCEMENTS ROUTES ============

app.post('/api/compartments/:compartmentId/announcements', upload.single('attachment'), (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        const announcement = {
            id: Date.now(),
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            attachment: req.file ? { url: `/uploads/announcements/${req.file.filename}`, filename: req.file.originalname } : null,
            createdAt: new Date().toLocaleString()
        };
        compartment.announcements = [announcement, ...(compartment.announcements || [])];
        saveCompartments();
        res.json({ success: true, announcement });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

app.delete('/api/compartments/:compartmentId/announcements/:announcementId', (req, res) => {
    const compartment = courseCompartments.find(c => c.id === parseInt(req.params.compartmentId));
    if (compartment) {
        compartment.announcements = compartment.announcements.filter(a => a.id !== parseInt(req.params.announcementId));
        saveCompartments();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Compartment not found' });
    }
});

// ============ SUGGESTIONS ROUTES ============

// Submit suggestion (from student)
app.post('/api/suggestions', (req, res) => {
    const { name, regNumber, type, message, programCode, level } = req.body;
    const suggestion = {
        id: Date.now(),
        name: name || 'Anonymous',
        regNumber: regNumber || '',
        type: type || 'Suggestion',
        message: message,
        programCode: programCode,
        level: level,
        submittedAt: new Date().toLocaleString(),
        status: 'pending'
    };
    suggestions.push(suggestion);
    
    // Also add to specific compartment if exists
    const compartment = courseCompartments.find(c => c.programCode === programCode && c.level === parseInt(level));
    if (compartment) {
        compartment.suggestions = compartment.suggestions || [];
        compartment.suggestions.push(suggestion);
        saveCompartments();
    }
    
    saveSuggestions();
    res.json({ success: true, suggestion });
});

// Get suggestions for a program/level (for lecturer)
app.get('/api/suggestions/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = suggestions.filter(s => s.programCode === programCode && s.level === parseInt(level));
    res.json(filtered);
});

// Update suggestion status
app.put('/api/suggestions/:suggestionId', (req, res) => {
    const suggestion = suggestions.find(s => s.id === parseInt(req.params.suggestionId));
    if (suggestion) {
        suggestion.status = req.body.status;
        suggestion.respondedAt = new Date().toLocaleString();
        saveSuggestions();
        res.json({ success: true, suggestion });
    } else {
        res.status(404).json({ success: false, error: 'Suggestion not found' });
    }
});

// ============ LIVE SESSION ROUTES ============

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

// ============ PROFILE PICTURE UPLOAD ============

app.post('/api/upload-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    res.json({ success: true, fileUrl: `/uploads/profile_pics/${req.file.filename}` });
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => res.send('OK'));

// ============ SERVE FRONTEND ============

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ START SERVER ============

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎓 MZUZU UNIVERSITY PORTAL - PROFESSIONAL VERSION`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log(`📊 Loaded ${ALL_PROGRAMS.length} academic programs`);
    console.log(`📚 Loaded ${courseCompartments.length} course compartments`);
    console.log(`💡 Loaded ${suggestions.length} suggestions`);
    console.log(`🔌 WebSocket server ready for live streaming`);
    console.log(`\n🔐 DEMO LOGIN:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student:  student_BED_ICT_l1_1 / student123`);
    console.log(`${'='.repeat(60)}\n`);
});
