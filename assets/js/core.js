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
        // ✨ 全景晶莹毛玻璃 (Full Glassmorphism) 默认加载引擎
        // ============================================================
        let customCssCollapsed = true;
                const DEFAULT_GLASS_CSS = `/* 🌊 水蓝琉璃 · Aqua Glass 终极全景覆盖版 CSS */
html, body {
    background: url('https://nos.netease.com/ysf/b3d01ac6da613cbd6e61b56d7dfadb3f.png') center center / cover no-repeat fixed !important;
    min-height: 100vh !important;
}

/* 清除所有阻挡背景透光的实色遮罩 */
#app, main, #listView, #detailView, #secondaryPillsBar, .bg-\[\#faf6f0\], .bg-white\/50, .bg-\[\#fdf6f7\], div[class*="bg-\[\#faf6f0\]"] {
    background: transparent !important;
}

/* 侧边栏与卡片全员 22px 强力水蓝毛玻璃 */
.ui-card, 
aside, 
#sidebarDrawer, 
header,
.p-3.bg-white,
.bg-white,
.ui-card.p-3,
.ui-card.p-4 {
    background: rgba(224, 242, 254, 0.48) !important;
    backdrop-filter: blur(22px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(22px) saturate(180%) !important;
    border: 1px solid rgba(186, 230, 253, 0.75) !important;
    box-shadow: 0 8px 32px 0 rgba(14, 165, 233, 0.15) !important;
    border-radius: 20px !important;
}

/* 全员文字与图标多重蓝色覆盖 */
h1, h2, h3, h4, .font-bold, .text-\[\#4a3e3d\], .text-\[\#5c494a\] {
    color: #032b53 !important;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8) !important;
}

p, span, label, div, .text-\[\#8c7173\], .text-\[\#785e60\], .text-\[\#b86b7a\], .text-\[\#a38b8d\] {
    color: #0284c7 !important;
}

/* 图标全员换装蓝色 */
i, svg, [data-lucide] {
    color: #0284c7 !important;
    stroke: #0284c7 !important;
}

/* 主要按钮：渐变水蓝 */
button.bg-\[\#d88c9a\], 
.bg-\[\#d88c9a\],
button.bg-gradient-to-r,
button[onclick*="save"],
button[onclick*="apply"] {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35) !important;
}

/* 次要按钮：半透冰晶水蓝 */
button.bg-\[\#f8eeee\], 
.bg-\[\#f8eeee\],
button.bg-\[\#fdf4f5\],
button[onclick*="rename"] {
    background: rgba(186, 230, 253, 0.65) !important;
    color: #0284c7 !important;
    border: 1px solid rgba(125, 211, 252, 0.8) !important;
}

/* 输入框水蓝 */
input, textarea {
    background: rgba(255, 255, 255, 0.75) !important;
    border: 1px solid rgba(125, 211, 252, 0.7) !important;
    color: #075985 !important;
    border-radius: 14px !important;
}
`;

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
            let savedCss = localStorage.getItem('TAVERN_CUSTOM_CSS');
            // 如果旧 CSS 没包含指定的网易云图片背景，自动升级换装为最新的水蓝琉璃外观
            if (savedCss === null || !savedCss.includes('b3d01ac6da613cbd6e61b56d7dfadb3f.png')) {
                savedCss = DEFAULT_GLASS_CSS;
                localStorage.setItem('TAVERN_CUSTOM_CSS', savedCss);
            }
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
            showToast('✨', '自定义 CSS 毛玻璃样式已保存并更新！');
        }

        function restoreDefaultGlassCss() {
            localStorage.setItem('TAVERN_CUSTOM_CSS', DEFAULT_GLASS_CSS);
            initCustomCss();
            showToast('🔄', '已重置为默认全景毛玻璃样式！');
        }

        window.toggleCustomCssCollapse = toggleCustomCssCollapse;
        window.saveAndApplyUserCustomCss = saveAndApplyUserCustomCss;
        window.restoreDefaultGlassCss = restoreDefaultGlassCss;
        window.initCustomCss = initCustomCss;
