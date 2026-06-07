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
const uploadDirs = ['uploads', 'uploads/materials', 'uploads/assignments', 'uploads/announcements', 'uploads/profile_pics', 'uploads/performance', 'uploads/suggestion_refs'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads';
        if (file.fieldname === 'assignmentFile') folder = 'uploads/assignments';
        if (file.fieldname === 'announcementFile') folder = 'uploads/announcements';
        if (file.fieldname === 'profilePic') folder = 'uploads/profile_pics';
        if (file.fieldname === 'performanceImage') folder = 'uploads/performance';
        if (file.fieldname === 'suggestionRef') folder = 'uploads/suggestion_refs';
        if (file.fieldname === 'mediaFile') folder = 'uploads'; // for MUSCREC
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ============ ALL MZUZU UNIVERSITY PROGRAMS (FULL LIST) ============
const ALL_PROGRAMS = [
    { code: "BED_SCI", name: "Bachelor of Education (Science)", faculty: "Education" },
    { code: "BED_ICT", name: "Bachelor of Education ICT", faculty: "Education" },
    { code: "BED_LANG", name: "Bachelor of Education (Languages)", faculty: "Education" },
    { code: "BED_ARTS", name: "Bachelor of Education (Arts)", faculty: "Education" },
    { code: "UCE", name: "University Certificate of Education", faculty: "Education" },
    { code: "BSC_FISH", name: "BSc Fisheries and Aquatic Sciences", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST", name: "BSc Forestry", faculty: "Environmental Sciences" },
    { code: "BSC_FOREST_UP", name: "BSc Forestry (Upgrading)", faculty: "Environmental Sciences" },
    { code: "BSC_WATER", name: "BSc Water Resources Engineering and Management", faculty: "Environmental Sciences" },
    { code: "BSC_COMMDEV", name: "BSc Transformative Community Development", faculty: "Environmental Sciences" },
    { code: "BSC_AGRI", name: "BSc Value Chain Agriculture", faculty: "Environmental Sciences" },
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
    { code: "BA_THEOLOGY_ODEL", name: "BA Theology and Religious Studies (ODeL)", faculty: "Humanities & Social Sciences" },
    { code: "BB_TOURISM", name: "Bachelor of Business (Tourism Management)", faculty: "Tourism, Hospitality & Management" },
    { code: "BB_TOURISM_ODEL", name: "Bachelor of Business (Tourism Management) – ODeL", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_HERITAGE", name: "BA Culture and Heritage Tourism", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_HOSPITALITY", name: "BSc Hospitality Management", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_CULINARY", name: "BA Culinary Arts", faculty: "Tourism, Hospitality & Management" },
    { code: "BA_SPORTS", name: "BA Sports Management", faculty: "Tourism, Hospitality & Management" },
    { code: "DIP_SAFARI", name: "Diploma in Safari and Tour Guiding", faculty: "Tourism, Hospitality & Management" },
    { code: "DIP_TRAVEL", name: "Diploma in Travel and Tourism", faculty: "Tourism, Hospitality & Management" },
    { code: "BSC_LAND", name: "BSc Land Surveying", faculty: "Built Environment" },
    { code: "BSC_TOWN", name: "BSc Town and Regional Planning", faculty: "Built Environment" },
    { code: "BSC_ESTATE", name: "BSc Estate Management", faculty: "Built Environment" },
    { code: "BSC_LIB", name: "BSc Library and Information Science", faculty: "Information Science & Communication" }
];

let posts = [];
let liveSession = null;
let suggestions = [];
let coursePerformances = [];
const POSTS_FILE = 'posts.json';
const SUGGESTIONS_FILE = 'suggestions.json';
const PERFORMANCE_FILE = 'performance.json';

function loadData() {
    try { if (fs.existsSync(POSTS_FILE)) posts = JSON.parse(fs.readFileSync(POSTS_FILE)); } catch(e) {}
    try { if (fs.existsSync(SUGGESTIONS_FILE)) suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE)); } catch(e) {}
    try { if (fs.existsSync(PERFORMANCE_FILE)) coursePerformances = JSON.parse(fs.readFileSync(PERFORMANCE_FILE)); } catch(e) {}
}
function saveData() {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(coursePerformances, null, 2));
}
loadData();

// Auto-delete suggestions older than 24 hours (for main portal)
function deleteOldSuggestions() {
    const now = Date.now();
    const before = suggestions.length;
    suggestions = suggestions.filter(s => (now - new Date(s.submittedAt).getTime()) < 24 * 60 * 60 * 1000);
    if (suggestions.length !== before) saveData();
}
setInterval(deleteOldSuggestions, 60 * 60 * 1000);
deleteOldSuggestions();

// ============ MAIN PORTAL AUTHENTICATION ============
app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    const expected = `lecturer_${programCode}_l${level}`;
    if (username === expected && password === 'lecturer123') {
        res.json({ success: true, role: 'lecturer', name: program?.name, fullname: `Lecturer - ${program?.name}`, programCode, programName: program?.name, level: parseInt(level) });
    } else res.status(401).json({ success: false });
});

app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const program = ALL_PROGRAMS.find(p => p.code === programCode);
    const expected = `student_${programCode}_l${level}_1`;
    if (username === expected && password === 'student123') {
        res.json({ success: true, role: 'student', name: program?.name, fullname: `Student - ${program?.name}`, programCode, programName: program?.name, level: parseInt(level) });
    } else res.status(401).json({ success: false });
});

// ============ MAIN PORTAL POSTS (announcements, materials) ============
app.post('/api/posts', upload.array('materialFiles', 20), (req, res) => {
    const { programCode, level, title, content, lecturerName, mediaType, announcementFormat } = req.body;
    let media = [];
    if (req.files) media = req.files.map(f => ({ type: mediaType || 'document', url: `/uploads/materials/${f.filename}`, filename: f.originalname }));
    const category = media.length ? 'material' : 'announcement';
    const post = {
        id: Date.now(), programCode, level: parseInt(level), title: title.trim(), content: content.trim(),
        lecturerName, media, announcementFormat: announcementFormat || 'standard',
        date: new Date().toLocaleString(), timestamp: Date.now(), category
    };
    posts.unshift(post);
    saveData();
    res.json({ success: true, post });
});

app.get('/api/posts/:programCode/:level', (req, res) => {
    res.json(posts.filter(p => p.programCode === req.params.programCode && p.level === parseInt(req.params.level)));
});
app.delete('/api/posts/:id', (req, res) => {
    posts = posts.filter(p => p.id !== parseInt(req.params.id));
    saveData();
    res.json({ success: true });
});

// ============ SIMPLIFIED ASSIGNMENT POST ============
app.post('/api/assignments', upload.single('assignmentFile'), (req, res) => {
    const { programCode, level, courseName, lecturerName } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    const assignment = {
        id: Date.now(), programCode, level: parseInt(level), title: courseName || "Assignment", content: "",
        lecturerName, attachment: { url: `/uploads/assignments/${req.file.filename}`, filename: req.file.originalname },
        date: new Date().toLocaleString(), timestamp: Date.now(), category: 'assignment'
    };
    posts.unshift(assignment);
    saveData();
    res.json({ success: true, assignment });
});

// ============ SUGGESTIONS ROUTES (main portal) ============
app.post('/api/suggestions', upload.single('suggestionRef'), (req, res) => {
    const { to, name, email, phone, regNumber, type, message, programCode, level } = req.body;
    let ref = null;
    if (req.file) ref = { url: `/uploads/suggestion_refs/${req.file.filename}`, filename: req.file.originalname };
    const suggestion = {
        id: Date.now(), to: to || 'All Lecturers', name: name || 'Anonymous', email: email || '', phone: phone || '',
        regNumber: regNumber || '', type: type || 'Suggestion', message, ref, programCode, level: parseInt(level),
        submittedAt: new Date().toLocaleString(), timestamp: Date.now(), status: 'pending'
    };
    suggestions.push(suggestion);
    saveData();
    res.json({ success: true, suggestion });
});
app.get('/api/suggestions/:programCode/:level', (req, res) => {
    res.json(suggestions.filter(s => s.programCode === req.params.programCode && s.level === parseInt(req.params.level)));
});

// ============ PERFORMANCE ROUTES ============
app.post('/api/performance', upload.single('performanceImage'), (req, res) => {
    const { programCode, level, courseName, highestMark, lowestMark, markGap, majorityRange, lecturerStatement } = req.body;
    const perf = {
        id: Date.now(), programCode, level: parseInt(level), courseName, highestMark: parseFloat(highestMark),
        lowestMark: parseFloat(lowestMark), markGap: parseFloat(markGap), majorityRange, lecturerStatement,
        imageUrl: req.file ? `/uploads/performance/${req.file.filename}` : null, createdAt: new Date().toLocaleString()
    };
    coursePerformances.push(perf);
    saveData();
    res.json({ success: true, performance: perf });
});
app.get('/api/performance/:programCode/:level', (req, res) => {
    res.json(coursePerformances.filter(p => p.programCode === req.params.programCode && p.level === parseInt(req.params.level)));
});
app.delete('/api/performance/:id', (req, res) => {
    coursePerformances = coursePerformances.filter(p => p.id !== parseInt(req.params.id));
    saveData();
    res.json({ success: true });
});

// ============ LIVE SESSION ROUTES ============
app.post('/api/live/start', (req, res) => {
    liveSession = { active: true, courseName: req.body.courseName, lecturerName: req.body.lecturerName, streamUrl: req.body.streamUrl, startedAt: new Date() };
    res.json({ success: true });
});
app.post('/api/live/stop', (req, res) => { liveSession = null; res.json({ success: true }); });
app.get('/api/live/status', (req, res) => res.json({ active: !!liveSession, session: liveSession }));

app.post('/api/upload-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    res.json({ success: true, fileUrl: `/uploads/profile_pics/${req.file.filename}` });
});

// ============ MUSCREC SERVICES MODULE ============
let muscrecPosts = [];
let muscrecSuggestions = [];
let muscrecContacts = [];
const MUSCREC_POSTS_FILE = 'muscrec_posts.json';
const MUSCREC_SUGGESTIONS_FILE = 'muscrec_suggestions.json';
const MUSCREC_CONTACTS_FILE = 'muscrec_contacts.json';

function loadMuscrecData() {
    try { if (fs.existsSync(MUSCREC_POSTS_FILE)) muscrecPosts = JSON.parse(fs.readFileSync(MUSCREC_POSTS_FILE)); } catch(e) {}
    try { if (fs.existsSync(MUSCREC_SUGGESTIONS_FILE)) muscrecSuggestions = JSON.parse(fs.readFileSync(MUSCREC_SUGGESTIONS_FILE)); } catch(e) {}
    try { if (fs.existsSync(MUSCREC_CONTACTS_FILE)) muscrecContacts = JSON.parse(fs.readFileSync(MUSCREC_CONTACTS_FILE)); } catch(e) {}
}
function saveMuscrecData() {
    fs.writeFileSync(MUSCREC_POSTS_FILE, JSON.stringify(muscrecPosts, null, 2));
    fs.writeFileSync(MUSCREC_SUGGESTIONS_FILE, JSON.stringify(muscrecSuggestions, null, 2));
    fs.writeFileSync(MUSCREC_CONTACTS_FILE, JSON.stringify(muscrecContacts, null, 2));
}
loadMuscrecData();

// MUSCREC login
app.post('/api/muscrec/official/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'muscrec_official' && password === 'muscrec4321') {
        res.json({ success: true, role: 'official', name: 'MUSCREC Official' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});
app.post('/api/muscrec/student/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'mzuni_student' && password === 'green4321') {
        res.json({ success: true, role: 'student', name: 'Mzuni Student' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// MUSCREC posts (official uploads)
app.post('/api/muscrec/posts', upload.single('mediaFile'), (req, res) => {
    const { title, content, mediaType } = req.body;
    let media = null;
    if (req.file) {
        media = { type: mediaType || 'document', url: `/uploads/${req.file.filename}`, filename: req.file.originalname };
    }
    const post = { id: Date.now(), title: title.trim(), content: content.trim(), media, date: new Date().toLocaleString(), timestamp: Date.now() };
    muscrecPosts.unshift(post);
    saveMuscrecData();
    res.json({ success: true, post });
});
app.get('/api/muscrec/posts', (req, res) => res.json(muscrecPosts));
app.delete('/api/muscrec/posts/:id', (req, res) => {
    muscrecPosts = muscrecPosts.filter(p => p.id !== parseInt(req.params.id));
    saveMuscrecData();
    res.json({ success: true });
});

// MUSCREC suggestions (from students)
app.post('/api/muscrec/suggestions', (req, res) => {
    const { name, phone, to, message } = req.body;
    const suggestion = { id: Date.now(), name: name || 'Anonymous', phone: phone || '', to: to || 'MUSCREC', message, date: new Date().toLocaleString(), timestamp: Date.now() };
    muscrecSuggestions.push(suggestion);
    saveMuscrecData();
    res.json({ success: true, suggestion });
});
app.get('/api/muscrec/suggestions', (req, res) => res.json(muscrecSuggestions));
app.delete('/api/muscrec/suggestions/:id', (req, res) => {
    muscrecSuggestions = muscrecSuggestions.filter(s => s.id !== parseInt(req.params.id));
    saveMuscrecData();
    res.json({ success: true });
});

// MUSCREC contacts
app.post('/api/muscrec/contacts', (req, res) => {
    const { name, position, phone, email } = req.body;
    const contact = { id: Date.now(), name: name.trim(), position: position.trim(), phone: phone.trim(), email: email.trim() };
    muscrecContacts.push(contact);
    saveMuscrecData();
    res.json({ success: true, contact });
});
app.get('/api/muscrec/contacts', (req, res) => res.json(muscrecContacts));
app.delete('/api/muscrec/contacts/:id', (req, res) => {
    muscrecContacts = muscrecContacts.filter(c => c.id !== parseInt(req.params.id));
    saveMuscrecData();
    res.json({ success: true });
});

app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎓 MZUZU UNIVERSITY PORTAL + MUSCREC SERVICES`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 Main: ${ALL_PROGRAMS.length} programs | MUSCREC: ${muscrecPosts.length} posts`);
});
