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

// ============ ALL MZUZU UNIVERSITY UNDERGRADUATE PROGRAMS ============
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
    { code: "BSC_ICT", name: "BSc Information Communication Technology", faculty: "Science, Technology & Innovation" },
    { code: "BSC_DATA", name: "BSc Data Science", faculty: "Science, Technology & Innovation" },
    { code: "BSC_MATH_STATS", name: "BSc (Hons) Mathematics and Statistics", faculty: "Science, Technology & Innovation" },
    { code: "BSC_CHEM", name: "BSc Science in Chemistry", faculty: "Science, Technology & Innovation" },
    { code: "BSC_PHYS_ELEC", name: "BSc Physics and Electronics", faculty: "Science, Technology & Innovation" },
    { code: "BSC_RENEW", name: "BSc (Hons) Renewable Energy Systems Engineering", faculty: "Science, Technology & Innovation" },
    { code: "BSC_BIODIV", name: "BSc (Hons) Biodiversity Conservation and Management", faculty: "Science, Technology & Innovation" },
    { code: "BSC_OPTO", name: "BSc (Hons) Optometry", faculty: "Health Sciences" },
    { code: "BSC_BIO_MED", name: "BSc (Hons) Biomedical Laboratory Science", faculty: "Health Sciences" },
    { code: "BSC_NURSING", name: "BSc Nursing and Midwifery (Generic)", faculty: "Health Sciences" },
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

// ============ POSTS STORAGE ============
let posts = [];
const POSTS_FILE = 'posts.json';

function loadPosts() {
    try {
        if (fs.existsSync(POSTS_FILE)) {
            const data = fs.readFileSync(POSTS_FILE, 'utf8');
            posts = JSON.parse(data);
            console.log(`✅ Loaded ${posts.length} posts`);
        }
    } catch(e) { console.error('Error loading posts:', e); posts = []; }
}

function savePosts() {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
        console.log(`💾 Saved ${posts.length} posts`);
    } catch(e) { console.error('Error saving posts:', e); }
}

loadPosts();

// ============ API ROUTES ============

// Get all programs
app.get('/api/programs', (req, res) => res.json(ALL_PROGRAMS));

// Lecturer login
app.post('/api/lecturer/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const expectedUsername = `lecturer_${programCode}_l${level}`;
    
    if (username === expectedUsername && password === 'lecturer123') {
        const program = ALL_PROGRAMS.find(p => p.code === programCode);
        res.json({
            success: true,
            role: 'lecturer',
            name: program?.name || programCode,
            programCode: programCode,
            programName: program?.name || programCode,
            level: parseInt(level)
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid lecturer credentials' });
    }
});

// Student login
app.post('/api/student/login', (req, res) => {
    const { username, password, programCode, level } = req.body;
    const expectedUsername = `student_${programCode}_l${level}_1`;
    
    if (username === expectedUsername && password === 'student123') {
        const program = ALL_PROGRAMS.find(p => p.code === programCode);
        res.json({
            success: true,
            role: 'student',
            name: program?.name || programCode,
            programCode: programCode,
            programName: program?.name || programCode,
            level: parseInt(level)
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid student credentials' });
    }
});

// Get posts for specific program and level
app.get('/api/posts/:programCode/:level', (req, res) => {
    const { programCode, level } = req.params;
    const filtered = posts.filter(p => p.programCode === programCode && p.level === parseInt(level));
    res.json(filtered);
});

// Create post
app.post('/api/posts', upload.single('mediaFile'), (req, res) => {
    const { programCode, level, title, content, lecturerName, mediaType } = req.body;
    
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
        programCode: programCode,
        level: parseInt(level),
        title: title.trim(),
        content: content.trim(),
        lecturerName: lecturerName,
        media: media,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    
    posts.unshift(post);
    savePosts();
    res.json({ success: true, post });
});

// Delete post
app.delete('/api/posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const deletedPost = posts.find(p => p.id === id);
    
    if (deletedPost?.media?.url) {
        const filePath = path.join(__dirname, deletedPost.media.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    posts = posts.filter(p => p.id !== id);
    savePosts();
    res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎓 MZUZU UNIVERSITY PORTAL`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📊 ${ALL_PROGRAMS.length} programs loaded`);
    console.log(`\n🔐 Demo Login:`);
    console.log(`   Lecturer: lecturer_BED_ICT_l1 / lecturer123`);
    console.log(`   Student: student_BED_ICT_l1_1 / student123\n`);
});
