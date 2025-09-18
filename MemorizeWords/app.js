// =================================================
// Supabase 配置 (请替换成您自己的)
// =================================================
const SUPABASE_URL = 'https://cvkqzkipgmtzqprqadyn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2a3F6a2lwZ210enFwcnFhZHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDMzMDIsImV4cCI6MjA3MzQ3OTMwMn0.I2DygNtjxa324smxKfIBHCOtFmrGQF4kRRkwPv-7VOY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================
// DOM 元素获取
// =================================================
const appContainer = document.getElementById('app-container');
const welcomeMessage = document.getElementById('welcome-message');
const wordDisplay = document.getElementById('word-display');
const meaningDisplay = document.getElementById('meaning-display');
const showMeaningBtn = document.getElementById('show-meaning-btn');
const feedbackButtons = document.getElementById('feedback-buttons');
const knowBtn = document.getElementById('know-btn');
const dontKnowBtn = document.getElementById('dont-know-btn');
const progressIndicator = document.getElementById('progress-indicator');
// Auth elements
const authContainer = document.getElementById('auth-container');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
// Modal elements
const authModal = document.getElementById('auth-modal');
const modalTitle = document.getElementById('modal-title');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const modalSubmitBtn = document.getElementById('modal-submit-btn');
const authError = document.getElementById('auth-error');
// Data control elements
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const deleteBtn = document.getElementById('delete-btn');
const importModal = document.getElementById('import-modal');
const importTextarea = document.getElementById('import-textarea');
const submitImportBtn = document.getElementById('submit-import-btn');

// =================================================
// 应用状态
// =================================================
let words = [];
let currentWordIndex = 0;
let currentUser = null;
let isSigningUp = false;

// =================================================
// 核心功能函数
// =================================================

/**
 * 从 Supabase 获取当前用户的单词列表
 */
async function fetchWords() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabase
            .from('words')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('memory_strength', { ascending: true }) // 优先背记忆度低的
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        words = data;
        currentWordIndex = 0;
        displayCurrentWord();
    } catch (error) {
        console.error('获取单词失败:', error.message);
        alert('获取单词列表失败，请检查网络连接。');
    }
}

/**
 * 显示当前单词卡片
 */
function displayCurrentWord() {
    if (words.length === 0) {
        wordDisplay.textContent = '单词库为空';
        meaningDisplay.textContent = '请点击“导入单词”添加新词。';
        showMeaningBtn.classList.remove('hidden');
        feedbackButtons.classList.add('hidden');
        meaningDisplay.classList.remove('hidden');
        showMeaningBtn.classList.add('hidden');
        progressIndicator.textContent = '0 / 0';
        return;
    }
    
    if (currentWordIndex >= words.length) {
        wordDisplay.textContent = '恭喜！';
        meaningDisplay.textContent = '您已完成本轮所有单词的学习！';
        meaningDisplay.classList.remove('hidden');
        showMeaningBtn.classList.add('hidden');
        feedbackButtons.classList.add('hidden');
        progressIndicator.textContent = `完成 ${words.length} / ${words.length}`;
        return;
    }

    const word = words[currentWordIndex];
    wordDisplay.textContent = word.word;
    meaningDisplay.textContent = word.meaning;

    // 重置UI状态
    meaningDisplay.classList.add('hidden');
    showMeaningBtn.classList.remove('hidden');
    feedbackButtons.classList.add('hidden');
    progressIndicator.textContent = `${currentWordIndex + 1} / ${words.length}`;
}

/**
 * 更新单词的记忆强度
 * @param {number} change - 记忆强度的变化值 (+1 或 -1)
 */
async function updateMemoryStrength(change) {
    const word = words[currentWordIndex];
    const newStrength = Math.max(0, word.memory_strength + change); // 记忆度最低为0

    try {
        const { error } = await supabase
            .from('words')
            .update({ memory_strength: newStrength })
            .eq('id', word.id);

        if (error) throw error;
        
        // 更新本地数据
        word.memory_strength = newStrength;
        
        // 切换到下一个单词
        currentWordIndex++;
        displayCurrentWord();
    } catch (error) {
        console.error('更新单词失败:', error.message);
        alert('更新单词失败，请稍后重试。');
    }
}


// =================================================
// 认证功能函数
// =================================================

function updateUIForAuthState() {
    if (currentUser) {
        // 用户已登录
        loginBtn.classList.add('hidden');
        signupBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userEmailSpan.textContent = currentUser.email;
        
        appContainer.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');
        
        fetchWords(); // 登录后获取单词
    } else {
        // 用户未登录
        loginBtn.classList.remove('hidden');
        signupBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        
        appContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
        words = []; // 清空单词
    }
}

async function handleAuthFormSubmit(e) {
    e.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    authError.textContent = '';
    
    try {
        let response;
        if (isSigningUp) {
            response = await supabase.auth.signUp({ email, password });
        } else {
            response = await supabase.auth.signInWithPassword({ email, password });
        }
        
        if (response.error) throw response.error;
        
        // 注册成功后，Supabase会自动登录
        closeAuthModal();
    } catch (error) {
        authError.textContent = error.message;
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('退出失败:', error.message);
    }
    // onAuthStateChange 会自动处理UI更新
}

function openAuthModal(isSignup) {
    isSigningUp = isSignup;
    modalTitle.textContent = isSignup ? '注册' : '登录';
    modalSubmitBtn.textContent = isSignup ? '注册' : '登录';
    authEmailInput.value = '';
    authPasswordInput.value = '';
    authError.textContent = '';
    authModal.classList.remove('hidden');
}

function closeAuthModal() {
    authModal.classList.add('hidden');
}


// =================================================
// 数据导入导出功能
// =================================================

function handleImport() {
    importTextarea.value = '';
    importModal.classList.remove('hidden');
}

async function submitImport() {
    const text = importTextarea.value.trim();
    if (!text) return;
    
    const lines = text.split('\n');
    const newWords = lines.map(line => {
        line = line.trim();
        if (!line) return null;
        
        const separatorIndex = line.search(/[\s,，]/); // 查找第一个空格或逗号
        if (separatorIndex === -1) {
             return { user_id: currentUser.id, word: line, meaning: '(无释义)' };
        }
        
        const word = line.substring(0, separatorIndex).trim();
        const meaning = line.substring(separatorIndex + 1).trim();
        
        return { user_id: currentUser.id, word, meaning, memory_strength: 0 };
    }).filter(Boolean); // 过滤掉无效行

    if (newWords.length === 0) {
        alert('没有有效的单词可供导入。');
        return;
    }
    
    try {
        const { error } = await supabase.from('words').insert(newWords);
        if (error) throw error;
        
        alert(`成功导入 ${newWords.length} 个单词！`);
        importModal.classList.add('hidden');
        fetchWords(); // 刷新单词列表
    } catch (error) {
        console.error('导入单词失败:', error.message);
        alert('导入单词失败，请检查数据格式或网络。');
    }
}

function handleExport() {
    if (words.length === 0) {
        alert('当前没有单词可以导出。');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "word,meaning,memory_strength\n"; // CSV header
    
    words.forEach(word => {
        csvContent += `${word.word},"${word.meaning.replace(/"/g, '""')}",${word.memory_strength}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_words.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleDelete熟词() {
    const wordsToDelete = words.filter(w => w.memory_strength > 5);
    if (wordsToDelete.length === 0) {
        alert('没有记忆强度大于5的单词需要删除。');
        return;
    }
    
    const confirmed = confirm(`您确定要删除 ${wordsToDelete.length} 个熟词吗？此操作不可撤销。`);
    if (!confirmed) return;
    
    const idsToDelete = wordsToDelete.map(w => w.id);
    
    try {
        const { error } = await supabase
            .from('words')
            .delete()
            .in('id', idsToDelete);
            
        if (error) throw error;
        
        alert('删除成功！');
        fetchWords(); // 刷新列表
    } catch(error) {
        console.error('删除单词失败:', error.message);
        alert('删除单词失败。');
    }
}


// =================================================
// 事件监听器
// =================================================

// 核心背词流程
showMeaningBtn.addEventListener('click', () => {
    meaningDisplay.classList.remove('hidden');
    showMeaningBtn.classList.add('hidden');
    feedbackButtons.classList.remove('hidden');
});

knowBtn.addEventListener('click', () => updateMemoryStrength(1));
dontKnowBtn.addEventListener('click', () => updateMemoryStrength(-1));

// 认证流程
loginBtn.addEventListener('click', () => openAuthModal(false));
signupBtn.addEventListener('click', () => openAuthModal(true));
logoutBtn.addEventListener('click', handleLogout);
authForm.addEventListener('submit', handleAuthFormSubmit);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal || e.target.classList.contains('modal-close')) {
        closeAuthModal();
    }
});

// 数据管理流程
importBtn.addEventListener('click', handleImport);
exportBtn.addEventListener('click', handleExport);
deleteBtn.addEventListener('click', handleDelete熟词);
submitImportBtn.addEventListener('click', submitImport);
importModal.addEventListener('click', (e) => {
    if (e.target === importModal || e.target.classList.contains('modal-close')) {
        importModal.classList.add('hidden');
    }
});

// 监听认证状态变化 (应用启动时和登录/退出时触发)
supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    updateUIForAuthState();
});
