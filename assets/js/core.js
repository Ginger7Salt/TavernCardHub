lucide.createIcons();

        let supabaseClient = null;
        let cloudConfigCollapsed = true;

        // Emoji Builder State
        let emojiTokens = [
            { type: 'var', value: '{name}' },
            { type: 'sep', value: '：' },
            { type: 'var', value: '{url}' }
        ];
        let selectedEmojiPackItems = new Set();
        let selectedEmojiPackIdsInList = new Set();

        function showToast(icon, message, duration = 3000) {
            const container = document.getElementById('toastContainer');
            document.getElementById('toastIcon').innerText = icon;
            document.getElementById('toastMessage').innerText = message;
            container.classList.remove('translate-y-[-100%]', 'opacity-0', 'pointer-events-none');
            setTimeout(() => {
                container.classList.add('translate-y-[-100%]', 'opacity-0', 'pointer-events-none');
            }, duration);
        }

        let githubConfigCollapsed = true;

        function toggleGithubConfigCollapse() {
            githubConfigCollapsed = !githubConfigCollapsed;
            const body = document.getElementById('githubConfigBody');
            const chevron = document.getElementById('githubConfigChevron');
            if (githubConfigCollapsed) { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
            else { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
        }

        function initGithubClient() {
            const u = localStorage.getItem('TAVERN_GITHUB_USER') || 'idikale163-source';
            const r = localStorage.getItem('TAVERN_GITHUB_REPO') || 'resource-hub-backup';
            const t = localStorage.getItem('TAVERN_GITHUB_TOKEN') || '';
            document.getElementById('cfgGithubUser').value = u;
            document.getElementById('cfgGithubRepo').value = r;
            document.getElementById('cfgGithubToken').value = t;

            if (u && r && t) {
                document.getElementById('githubStatusBadge').innerText = '已配置';
                document.getElementById('githubStatusBadge').className = 'text-[9px] px-2 py-0.5 rounded-full bg-[#e8f0f8] text-[#688ca6] font-semibold';
            } else {
                document.getElementById('githubStatusBadge').innerText = '未配置';
                document.getElementById('githubStatusBadge').className = 'text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold';
            }
        }

                async function saveCustomGithubConfig() {
            const t = document.getElementById('cfgGithubToken').value.trim();
            if (!t) { alert('请填写 Personal Access Token (ghp_...)！'); return; }
            
            let u = document.getElementById('cfgGithubUser').value.trim();
            let r = document.getElementById('cfgGithubRepo').value.trim() || 'resource-hub-backup';
            
            document.getElementById('githubStatusBadge').innerText = '验证中...';
            
            // 如果用户没填用户名，通过 Token 自动请求 GitHub API 提取用户名
            if (!u) {
                try {
                    const res = await fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${t}`, 'Accept': 'application/vnd.github.v3+json' }
                    });
                    if (res.ok) {
                        const userData = await res.json();
                        if (userData && userData.login) {
                            u = userData.login;
                            document.getElementById('cfgGithubUser').value = u;
                        }
                    }
                } catch(e) { console.error('Auto fetch username failed', e); }
            }

            if (!u) u = 'idikale163-source'; // 兜底备用

            localStorage.setItem('TAVERN_GITHUB_USER', u);
            localStorage.setItem('TAVERN_GITHUB_REPO', r);
            localStorage.setItem('TAVERN_GITHUB_TOKEN', t);
            document.getElementById('cfgGithubRepo').value = r;
            initGithubClient();
            showToast('✅', `已自动识别用户 [${u}] 并保存凭证！`);
        }

        // BACKUP FULL ASSETS TO GITHUB PRIVATE REPO
        async function backupToGithubRepo() {
            const u = localStorage.getItem('TAVERN_GITHUB_USER') || 'idikale163-source';
            const r = localStorage.getItem('TAVERN_GITHUB_REPO') || 'resource-hub-backup';
            const t = localStorage.getItem('TAVERN_GITHUB_TOKEN');
            if (!t) { alert('未配置 Personal Access Token，请先在侧边栏填写 Token 并保存！'); return; }

            document.getElementById('githubStatusBadge').innerText = '备份中...';
            showToast('📤', '正在打包本地全量资产推送到 GitHub...');

            try {
                const localAssets = await getAllAssets();
                const apiKeys = (typeof getStoredApiKeys === 'function') ? getStoredApiKeys() : [];
                const apiCategories = (typeof getStoredCustomCategories === 'function') ? getStoredCustomCategories() : [];
                let fonts = [];
                if (typeof getAllFonts === 'function') {
                    try { fonts = await getAllFonts(); } catch(e){}
                }
                
                const customCss = localStorage.getItem('TAVERN_CUSTOM_CSS') || '';
                const backupPayload = {
                    version: '3.1',
                    timestamp: Date.now(),
                    totalAssets: localAssets.length,
                    totalKeys: apiKeys.length,
                    totalFonts: fonts.length,
                    assets: localAssets,
                    apiKeys: apiKeys,
                    apiCategories: apiCategories,
                    fonts: fonts,
                    customCss: customCss
                };
                const jsonString = JSON.stringify(backupPayload, null, 2);
                
                // UTF-8 base64 encoding
                const bytes = new TextEncoder().encode(jsonString);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                const base64Content = btoa(binary);

                const apiUrl = `https://api.github.com/repos/${u}/${r}/contents/backup_resource_hub.json`;

                // Get sha if file exists
                let sha = null;
                const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${t}`, 'Accept': 'application/vnd.github.v3+json' } });
                if (getRes.ok) {
                    const getJson = await getRes.json();
                    sha = getJson.sha;
                }

                const putBody = {
                    message: `Backup ResourceHub Assets - ${new Date().toLocaleString()}`,
                    content: base64Content
                };
                if (sha) putBody.sha = sha;

                const putRes = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${t}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
                    body: JSON.stringify(putBody)
                });

                if (putRes.ok) {
                    document.getElementById('githubStatusBadge').innerText = '备份成功';
                    showToast('🎉', `成功将 ${localAssets.length} 项资产备份覆盖至 GitHub 仓库！`);
                } else {
                    const errJson = await putRes.json();
                    showToast('❌', `推送 GitHub 失败: ${errJson.message}`);
                }
            } catch(e) {
                showToast('❌', '备份失败，请检查网络及 Token 权限');
            }
            setTimeout(() => initGithubClient(), 3000);
        }

        // RESTORE FROM GITHUB PRIVATE REPO
        async function restoreFromGithubRepo() {
            const u = localStorage.getItem('TAVERN_GITHUB_USER') || 'idikale163-source';
            const r = localStorage.getItem('TAVERN_GITHUB_REPO') || 'resource-hub-backup';
            const t = localStorage.getItem('TAVERN_GITHUB_TOKEN');
            if (!t) { alert('未配置 Personal Access Token，请先在侧边栏填写 Token 并保存！'); return; }

            // Skip alert block in headless if confirmed

            document.getElementById('githubStatusBadge').innerText = '拉取中...';
            showToast('📥', '正在从 GitHub 仓库拉取备份数据...');

            try {
                const apiUrl = `https://api.github.com/repos/${u}/${r}/contents/backup_resource_hub.json`;
                const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${t}`, 'Accept': 'application/vnd.github.v3+json' } });

                if (!getRes.ok) {
                    showToast('❌', '拉取失败: 仓库中尚未生成 backup_resource_hub.json 备份文件');
                    initGithubClient();
                    return;
                }

                const getJson = await getRes.json();
                const binary = atob(getJson.content.replace(/\s/g, ''));
                const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                const jsonText = new TextDecoder().decode(bytes);
                const parsedData = JSON.parse(jsonText);

                if (parsedData && (parsedData.assets || parsedData.apiKeys || parsedData.fonts)) {
                    let restoredCount = 0;
                    if (parsedData.assets && Array.isArray(parsedData.assets)) {
                        for (let asset of parsedData.assets) {
                            const tx = db.transaction('assets', 'readwrite');
                            tx.objectStore('assets').put(asset);
                            restoredCount++;
                        }
                    }
                    
                    // 1. 恢复 API Key 列表与自定义分类
                    let keyCount = 0;
                    if (parsedData.apiKeys && Array.isArray(parsedData.apiKeys)) {
                        if (typeof saveStoredApiKeys === 'function') {
                            saveStoredApiKeys(parsedData.apiKeys);
                        } else {
                            localStorage.setItem('TAVERN_API_KEYS', JSON.stringify(parsedData.apiKeys));
                        }
                        keyCount = parsedData.apiKeys.length;
                    }
                    if (parsedData.apiCategories && Array.isArray(parsedData.apiCategories)) {
                        if (typeof saveCustomCategories === 'function') {
                            saveCustomCategories(parsedData.apiCategories);
                        } else {
                            localStorage.setItem('TAVERN_API_CUSTOM_CATEGORIES', JSON.stringify(parsedData.apiCategories));
                        }
                    }
                    if (typeof renderApiKeyList === 'function') renderApiKeyList();

                    // 恢复 自定义 CSS 样式
                    if (parsedData.customCss) {
                        localStorage.setItem('TAVERN_CUSTOM_CSS', parsedData.customCss);
                        if (typeof initCustomCss === 'function') initCustomCss();
                    }

                    // 2. 恢复 字体 (Fonts) 到 IndexedDB
                    let fontCount = 0;
                    if (parsedData.fonts && Array.isArray(parsedData.fonts) && typeof addFontItem === 'function') {
                        for (let font of parsedData.fonts) {
                            try { await addFontItem(font); fontCount++; } catch(e){}
                        }
                        if (typeof renderFontList === 'function') renderFontList();
                    }

                    allAssetsCache = null;
                    updateBadges(); renderItems();
                    showToast('🎉', `恢复成功：${restoredCount} 项资产、${keyCount} 个 API Key、${fontCount} 款字体！`);
                } else {
                    showToast('⚠️', '备份文件格式不兼容');
                }
            } catch(e) {
                showToast('❌', '拉取恢复失败，请检查凭证与网络');
            }
            initGithubClient();
        }

        function initSupabaseClient() {
            const customUrl = localStorage.getItem('TAVERN_SUPABASE_URL') || '';
            const customKey = localStorage.getItem('TAVERN_SUPABASE_KEY') || '';
            document.getElementById('cfgSupabaseUrl').value = customUrl;
            document.getElementById('cfgSupabaseKey').value = customKey;

            if (window.supabase && customUrl && customKey) {
                try {
                    supabaseClient = window.supabase.createClient(customUrl, customKey);
                    document.getElementById('cloudStatusBadge').innerText = '已连接';
                    document.getElementById('cloudStatusBadge').className = 'text-[9px] px-2 py-0.5 rounded-full bg-[#e8f3ef] text-[#5b8a7f] font-semibold';
                } catch(e) {
                    supabaseClient = null;
                    document.getElementById('cloudStatusBadge').innerText = '连接失败';
                    document.getElementById('cloudStatusBadge').className = 'text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold';
                }
            } else {
                supabaseClient = null;
                document.getElementById('cloudStatusBadge').innerText = '未配置';
                document.getElementById('cloudStatusBadge').className = 'text-[9px] px-2 py-0.5 rounded-full bg-[#f5e8e8] text-[#8c7173] font-semibold';
            }
        }

        function saveCustomCloudConfig() {
            const url = document.getElementById('cfgSupabaseUrl').value.trim();
            const key = document.getElementById('cfgSupabaseKey').value.trim();
            if (!url || !key) { alert('请填写完整的 Supabase URL 与 Key！'); return; }
            localStorage.setItem('TAVERN_SUPABASE_URL', url);
            localStorage.setItem('TAVERN_SUPABASE_KEY', key);
            initSupabaseClient();
            showToast('✅', 'Supabase 云端凭证已保存并连接！');
        }

        // ============================================================
        // 🎨 外观美化与自定义 CSS 代码动态注入模块
        // ============================================================
        let customCssCollapsed = true;

        const PRESET_THEMES = {
            default: '',
            dark: `/* 🌌 极夜暗黑深空主题 */
body { background-color: #0f172a !important; color: #f8fafc !important; }
.bg-[#faf6f0] { background-color: #0f172a !important; }
.bg-white { background-color: #1e293b !important; color: #f8fafc !important; border-color: #334155 !important; }
.ui-card { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
.text-[#4a3e3d], .text-[#5c494a], .text-[#3a3535] { color: #f1f5f9 !important; }
.text-[#b86b7a], .text-[#d88c9a] { color: #38bdf8 !important; }
.bg-[#fdf6f7], .bg-[#fdf4f5], .bg-[#f8eeee] { background-color: #334155 !important; color: #38bdf8 !important; }
.border-[#f2e3e3], .border-[#f2dadc] { border-color: #334155 !important; }
input, textarea { background-color: #0f172a !important; color: #f8fafc !important; border-color: #334155 !important; }`,
            morandi: `/* 🌊 莫兰迪灰蓝主题 */
body { background-color: #f0f4f8 !important; }
.bg-[#faf6f0] { background-color: #f0f4f8 !important; }
.text-[#b86b7a], .text-[#d88c9a] { color: #5b7c99 !important; }
.bg-[#fdf6f7], .bg-[#fdf4f5], .bg-[#f8eeee] { background-color: #e2eaf1 !important; color: #4a6572 !important; }
.border-[#f2e3e3], .border-[#f2dadc] { border-color: #cbd5e1 !important; }
.ui-card:hover { border-color: #5b7c99 !important; }`,
            sakura: `/* 🌸 暖粉和风纯美主题 */
body { background-color: #fff8f8 !important; }
.ui-card { border-color: #f7d6d8 !important; box-shadow: 0 4px 15px rgba(216, 140, 154, 0.08) !important; }
.text-[#d88c9a] { color: #e06d88 !important; }`
        };

        function toggleCustomCssCollapse() {
            customCssCollapsed = !customCssCollapsed;
            const body = document.getElementById('customCssBody');
            const chevron = document.getElementById('customCssChevron');
            if (customCssCollapsed) { 
                if (body) body.classList.add('hidden'); 
                if (chevron) chevron.classList.remove('rotate-180'); 
            } else { 
                if (body) body.classList.remove('hidden'); 
                if (chevron) chevron.classList.add('rotate-180'); 
            }
        }

        function initCustomCss() {
            const savedCss = localStorage.getItem('TAVERN_CUSTOM_CSS') || '';
            let styleTag = document.getElementById('appCustomUserCss');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'appCustomUserCss';
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = savedCss;
            const inputEl = document.getElementById('userCustomCssInput');
            if (inputEl) inputEl.value = savedCss;
        }

        function saveAndApplyUserCustomCss() {
            const inputEl = document.getElementById('userCustomCssInput');
            const css = inputEl ? inputEl.value : '';
            localStorage.setItem('TAVERN_CUSTOM_CSS', css);
            initCustomCss();
            showToast('🎨', '自定义 CSS 样式已保存并立即生效！');
        }

        function applyPresetTheme(themeKey) {
            const css = PRESET_THEMES[themeKey] || '';
            const inputEl = document.getElementById('userCustomCssInput');
            if (inputEl) inputEl.value = css;
            localStorage.setItem('TAVERN_CUSTOM_CSS', css);
            initCustomCss();
            showToast('✨', '主题预设已应用！');
        }

        window.toggleCustomCssCollapse = toggleCustomCssCollapse;
        window.saveAndApplyUserCustomCss = saveAndApplyUserCustomCss;
        window.applyPresetTheme = applyPresetTheme;
        window.initCustomCss = initCustomCss;
