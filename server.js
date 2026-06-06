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

// Create upload directories
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/assignments', 'uploads/announcements', 'uploads/profile_pics', 'uploads/performance'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'materialFiles') folder = 'uploads/materials';
        if (file.fieldname === 'assignmentFile') folder = 'uploads/assignments';
        if (file.fieldname === 'announcementFile') folder = 'uploads/announcements';
        if (file.fieldname === 'profilePic') folder = 'uploads/profile_pics';
        if (file.fieldname === 'performanceImage') folder = 'uploads/performance';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ============ ALL MZUZU UNIVERSITY UNDERGRADUATE PROGRAMS (FULL LIST) ============
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
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science & Technology" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science & Technology" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science & Technology" },
    { code: "BSC_CHEM", name: "BSc Science in Chemistry", faculty: "Science & Technology" },
    { code: "BSC_PHYS_ELEC", name: "BSc Physics and Electronics", faculty: "Science & Technology" },
    { code: "BSC_HONS_PHYS", name: "BSc (Hons) Physics and Electronics", faculty: "Science & Technology" },
    { code: "BSC_RENEW", name: "BSc (Hons) Renewable Energy Systems Engineering", faculty: "Science & Technology" },
    { code: "BSC_BIODIV", name: "BSc (Hons) Biodiversity Conservation and Management", faculty: "Science & Technology" },
    { code: "BSC_PARASIT", name: "BSc (Hons) Parasitology and Disease Vector Control", faculty: "Science & Technology" },
    { code: "DIP_ICT_WKND", name: "Diploma in ICT Upgrading (Weekend Mode)", faculty: "Science & Technology" },
    
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

let posts = [];
let liveSession = null;
let suggestions = [];
let coursePerformances = [];
const POSTS_FILE = 'posts.json';
const SUGGESTIONS_FILE = 'suggestions.json';
const PERFORMANCE_FILE = 'performance.json';

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

function loadPerformances() {
    try {
        if (fs.existsSync(PERFORMANCE_FILE)) {
            coursePerformances = JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf8'));
            console.log(`✅ Loaded ${coursePerformances.length} performance records`);
        }
    } catch(e) { console.error('Error loading performances:', e); }
}

function savePerformances() {
    try {
        fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(coursePerformances, null, 2));
    } catch(e) { console.error('Error saving performances:', e); }
}

loadPosts();
loadSuggestions();
loadPerformances();

// ============ AUTHENTICATION ROUTES ============

app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    const expectedUsername = `lecturer_${programCode}_l${level}`;
    
    if (username === expectedUsername && password === 'lecturer123') {
        res.json({ success: true, role: 'lecturer', name: program?.name || programCode, fullname: `Lecturer - ${program?.name || programCode}`, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    const expectedUsername = `student_${programCode}_l${level}_1`;
    
    if (username === expectedUsername && password === 'student123') {
        res.json({ success: true, role: 'student', name: program?.name || programCode, fullname: `Student - ${program?.name || programCode}`, programCode, programName: program?.name || programCode, level: parseInt(level) });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// ============ POSTS ROUTES (with category detection) ============

app.get('/api/posts/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = posts.filter(p => p.programCode === programCode && p.level === parseInt(level));
    res.json(filtered);
});

app.post('/api/posts', upload.array('materialFiles', 20), (req, res) => {
    const { programCode, level, title, content, lecturerName, mediaType, dueDate, points, announcementFormat } = req.body;
    
    let media = [];
    if (req.files && req.files.length > 0) {
        media = req.files.map(file => ({
            type: mediaType || 'document',
            url: `/uploads/materials/${file.filename}`,
            filename: file.originalname
        }));
    } else if (req.file) {
        media = [{
            type: mediaType || 'document',
            url: `/uploads/${req.file.filename}`,
            filename: req.file.originalname
        }];
    }
    
    // Determine category
    let category = 'announcement';
    if (dueDate && dueDate.trim() !== '') {
        category = 'assignment';
    } else if (media.length > 0) {
        category = 'material';
    }
    
    const post = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        title: title.trim(),
        content: content.trim(),
        lecturerName: lecturerName,
        media: media.length > 0 ? media : null,
        mediaType: mediaType,
        announcementFormat: announcementFormat || 'standard',
        dueDate: dueDate || null,
        points: points ? parseInt(points) : null,
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        category: category
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

// ============ SUGGESTIONS ROUTES (with "to" field) ============

app.post('/api/suggestions', (req, res) => {
    const { to, name, regNumber, type, message, programCode, level } = req.body;
    const suggestion = {
        id: Date.now(),
        to: to || 'All Lecturers',
        name: name || 'Anonymous',
        regNumber: regNumber || '',
        type: type || 'Suggestion',
        message: message,
        programCode: programCode,
        level: parseInt(level),
        submittedAt: new Date().toLocaleString(),
        status: 'pending'
    };
    suggestions.push(suggestion);
    saveSuggestions();
    res.json({ success: true, suggestion });
});

app.get('/api/suggestions/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = suggestions.filter(s => s.programCode === programCode && s.level === parseInt(level));
    res.json(filtered);
});

// ============ PERFORMANCE ROUTES ============

app.post('/api/performance', upload.single('performanceImage'), (req, res) => {
    const { programCode, level, courseName, highestMark, lowestMark, markGap, majorityRange, lecturerStatement } = req.body;
    
    const performance = {
        id: Date.now(),
        programCode,
        level: parseInt(level),
        courseName,
        highestMark: parseFloat(highestMark),
        lowestMark: parseFloat(lowestMark),
        markGap: parseFloat(markGap),
        majorityRange: majorityRange,
        lecturerStatement: lecturerStatement,
        imageUrl: req.file ? `/uploads/performance/${req.file.filename}` : null,
        createdAt: new Date().toLocaleString()
    };
    
    coursePerformances.push(performance);
    savePerformances();
    res.json({ success: true, performance });
});

app.get('/api/performance/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = coursePerformances.filter(p => p.programCode === programCode && p.level === parseInt(level));
    res.json(filtered);
});

app.delete('/api/performance/:id', (req, res) => {
    const id = parseInt(req.params.id);
    coursePerformances = coursePerformances.filter(p => p.id !== id);
    savePerformances();
    res.json({ success: true });
});

// ============ LIVE SESSION ROUTES ============

app.post('/api/live/start', (req, res) => {
    const { courseName, lecturerName, streamUrl } = req.body;
    liveSession = { active: true, courseName, lecturerName, streamUrl, startedAt: new Date() };
    console.log(`📹 Live session started: ${courseName} by ${lecturerName} - URL: ${streamUrl}`);
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
    if (!req.file) return res.status(400).json({ success: false });
    res.json({ success: true, fileUrl: `/uploads/profile_pics/${req.file.filename}` });
});

app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 ${ALL_PROGRAMS.length} undergraduate programs loaded`);
    console.log(`📝 ${posts.length} posts | 💡 ${suggestions.length} suggestions | 📈 ${coursePerformances.length} performances`);
    console.log(`\n🔐 DEMO LOGIN:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student:  student_BED_ICT_l1_1 / student123`);
    console.log(`\n📋 OTHER PROGRAM LOGINS:`);
    console.log(`   BSc ICT: lecturer_BSC_ICT_l1 / lecturer123 | student_BSC_ICT_l1_1 / student123`);
    console.log(`   BSc Nursing: lecturer_BSC_NURSING_l1 / lecturer123 | student_BSC_NURSING_l1_1 / student123`);
    console.log(`   BA Communication: lecturer_BA_COMMS_l1 / lecturer123 | student_BA_COMMS_l1_1 / student123`);
    console.log(`   BSc Land Surveying: lecturer_BSC_LAND_l1 / lecturer123 | student_BSC_LAND_l1_1 / student123`);
    console.log(`${'='.repeat(60)}\n`);
});
