// ============================================================
// API Key Manager Module (Compact Category & Edit Support)
// ============================================================

const API_KEYS_STORAGE_KEY = 'TAVERN_API_KEYS_DATA_V1';

const PROVIDER_PRESETS = {
    openai: { name: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', balancePath: '/dashboard/billing/credit_grants', icon: '🤖', category: 'LLM' },
    claude: { name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1', balancePath: '', icon: '🧠', category: 'LLM' },
    siliconflow: { name: '硅基流动 (SiliconFlow)', baseUrl: 'https://api.siliconflow.cn/v1', balancePath: '/user/info', icon: '⚡', category: 'LLM' },
    deepseek: { name: 'DeepSeek 官方', baseUrl: 'https://api.deepseek.com/v1', balancePath: '/user/balance', icon: '🐳', category: 'LLM' },
    zhipu: { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', balancePath: '', icon: '🔮', category: 'LLM' },
    moonshot: { name: '月之暗面 (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', balancePath: '/user/balance', icon: '🌙', category: 'LLM' },
    minimax_tts: { name: 'MiniMax 语音 (TTS)', baseUrl: 'https://api.minimax.chat/v1', balancePath: '', icon: '🎙️', category: 'TTS' },
    volcengine_tts: { name: '火山引擎语音 (字节)', baseUrl: 'https://openspeech.bytedance.com/api/v1/tts', balancePath: '', icon: '🌋', category: 'TTS' },
    aliyun_tts: { name: '阿里云语音 (nls)', baseUrl: 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts', balancePath: '', icon: '☁️', category: 'TTS' },
    tencent_tts: { name: '腾讯云语音 (TTS)', baseUrl: 'https://tts.cloud.tencent.com/stream', balancePath: '', icon: '🐧', category: 'TTS' },
    xunfei_tts: { name: '讯飞开放平台 (TTS)', baseUrl: 'https://tts-api.xfyun.cn/v2/tts', balancePath: '', icon: '🗣️', category: 'TTS' },
    azure_speech: { name: 'Microsoft Azure Speech', baseUrl: 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1', balancePath: '', icon: '🔷', category: 'TTS' },
    elevenlabs: { name: 'ElevenLabs', baseUrl: 'https://api.elevenlabs.io/v1', balancePath: '/user/subscription', icon: '🎧', category: 'TTS' },
    openai_tts: { name: 'OpenAI Audio TTS', baseUrl: 'https://api.openai.com/v1/audio/speech', balancePath: '', icon: '🔊', category: 'TTS' },
    oneapi: { name: '中转站 / One-API', baseUrl: 'https://your-oneapi-domain.com/v1', balancePath: '/api/user/self', icon: '🔀', category: 'Relay' },
    custom: { name: '自定义 OAI 兼容', baseUrl: '', balancePath: '', icon: '🔧', category: 'Custom' }
};

let activeApiKeyCategory = null; // null 表示显示分类列表，非 null 表示钻取进入具体分类
let editingKeyId = null; // 编辑模式下的 Key ID

function getStoredApiKeys() {
    try {
        const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        return [];
    }
}

function saveStoredApiKeys(keys) {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    renderApiKeyList();
    if (typeof updateBadges === 'function') updateBadges();
}

function showAddApiKeyDialog(editId = null) {
    editingKeyId = editId;
    createApiKeyModalDom();
    const modal = document.getElementById('apiKeyModal');
    if (!modal) return;

    const titleEl = document.getElementById('apiKeyModalTitle');
    const nameInput = document.getElementById('keyNameInput');
    const presetSelect = document.getElementById('keyProviderSelect');
    const urlInput = document.getElementById('keyBaseUrlInput');
    const secretInput = document.getElementById('keySecretInput');

    if (editId) {
        const keys = getStoredApiKeys();
        const item = keys.find(k => k.id === editId);
        if (item) {
            if (titleEl) titleEl.innerText = '✏️ 编辑 API Key 密钥';
            if (nameInput) nameInput.value = item.name || '';
            if (presetSelect) presetSelect.value = item.provider || 'custom';
            if (urlInput) urlInput.value = item.baseUrl || '';
            if (secretInput) secretInput.value = item.apiKey || '';
        }
    } else {
        if (titleEl) titleEl.innerText = '🔑 新增 API Key 密钥';
        if (nameInput) nameInput.value = '';
        if (presetSelect) presetSelect.value = 'openai';
        onProviderPresetChange();
        if (secretInput) secretInput.value = '';
    }
    modal.classList.remove('hidden');
}

function closeApiKeyModal() {
    const dialog = document.getElementById('apiKeyModal');
    if (dialog) dialog.classList.add('hidden');
    editingKeyId = null;
}

function onProviderPresetChange() {
    const presetSelect = document.getElementById('keyProviderSelect');
    const urlInput = document.getElementById('keyBaseUrlInput');
    if (!presetSelect || !urlInput) return;
    const p = PROVIDER_PRESETS[presetSelect.value];
    if (p && p.baseUrl && !editingKeyId) {
        urlInput.value = p.baseUrl;
    }
}

function submitSaveApiKey() {
    const nameInput = document.getElementById('keyNameInput');
    const presetSelect = document.getElementById('keyProviderSelect');
    const urlInput = document.getElementById('keyBaseUrlInput');
    const secretInput = document.getElementById('keySecretInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const provider = presetSelect ? presetSelect.value : 'custom';
    const baseUrl = urlInput ? urlInput.value.trim() : '';
    const apiKey = secretInput ? secretInput.value.trim() : '';

    if (!name) { showToast('⚠️', '请输入 Key 名称'); return; }
    if (!apiKey) { showToast('⚠️', '请输入 API Key 秘钥'); return; }

    let keys = getStoredApiKeys();

    if (editingKeyId) {
        keys = keys.map(k => {
            if (k.id === editingKeyId) {
                return { ...k, name, provider, baseUrl, apiKey, updatedAt: Date.now() };
            }
            return k;
        });
        showToast('🎉', 'API Key 修改成功！');
    } else {
        keys.push({
            id: 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name,
            provider,
            baseUrl,
            apiKey,
            createdAt: Date.now()
        });
        showToast('🎉', 'API Key 保存成功！');
    }

    saveStoredApiKeys(keys);
    closeApiKeyModal();
}

function deleteApiKeyItem(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('确定删除该 API Key 吗？')) return;
    let keys = getStoredApiKeys();
    keys = keys.filter(k => k.id !== id);
    saveStoredApiKeys(keys);
    showToast('🗑️', '已删除密钥');
}

function copyApiKeyText(text, label, e) {
    if (e) e.stopPropagation();
    if (!text) { showToast('⚠️', '无可复制内容'); return; }
    navigator.clipboard.writeText(text);
    showToast('📋', `已复制 ${label || '内容'}`);
}

function createApiKeyModalDom() {
    let modal = document.getElementById('apiKeyModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'apiKeyModal';
        modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        let providerOptions = '';
        for (const key in PROVIDER_PRESETS) {
            const p = PROVIDER_PRESETS[key];
            providerOptions += `<option value="${key}">${p.icon} ${p.name}</option>`;
        }

        modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3 border border-[#f2e3e3]">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-2">
                <h3 id="apiKeyModalTitle" class="font-bold text-xs text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🔑</span> 新增 API Key 密钥
                </h3>
                <button onclick="closeApiKeyModal()" class="text-gray-400 hover:text-gray-600 text-base font-bold">&times;</button>
            </div>
            
            <div class="space-y-2 text-[11px]">
                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">密钥名称 / 备注</label>
                    <input id="keyNameInput" type="text" placeholder="例: 我的 MiniMax / 硅基流动" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a]">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">服务商预设</label>
                    <select id="keyProviderSelect" onchange="onProviderPresetChange()" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a]">
                        ${providerOptions}
                    </select>
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">Base URL (接口请求基地址)</label>
                    <input id="keyBaseUrlInput" type="text" placeholder="https://..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a] font-mono text-[10px]">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">API Key 密钥</label>
                    <input id="keySecretInput" type="password" placeholder="sk-..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a] font-mono text-[10px]">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-1 border-t border-[#f7ecee]">
                <button onclick="closeApiKeyModal()" class="px-3 py-1 rounded-full border border-gray-300 text-gray-600 text-[11px] hover:bg-gray-50 transition">取消</button>
                <button onclick="submitSaveApiKey()" class="px-3.5 py-1 rounded-full bg-[#d88c9a] text-white text-[11px] font-bold hover:bg-[#c97b8b] shadow-sm transition">保存</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
    }
}

// 筛选分类
function selectApiKeyCategory(catKey) {
    activeApiKeyCategory = catKey;
    renderApiKeyList();
}

function renderApiKeyList() {
    const container = document.getElementById('apikeyList') || document.getElementById('apikeysListContainer');
    if (!container) return;

    const keys = getStoredApiKeys();
    const countBadge = document.getElementById('tab-apikeys-count');
    if (countBadge) countBadge.innerText = keys.length;

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-[#b89b9d]">
                <div class="text-2xl mb-1">🔑</div>
                <p class="text-xs font-semibold">暂未保存任何 API 密钥</p>
                <p class="text-[10px] opacity-75 mt-0.5">点击上方 “+ 新增密钥” 开始配置</p>
            </div>
        `;
        return;
    }

    // 按分类归集统计
    const categoryGroups = {
        LLM: { name: 'LLM 大语言模型', icon: '🤖', items: [] },
        TTS: { name: 'TTS 语音服务', icon: '🎙️', items: [] },
        Relay: { name: 'API 中转站', icon: '🔀', items: [] },
        Custom: { name: '自定义 OAI 兼容', icon: '🔧', items: [] }
    };

    keys.forEach(k => {
        const preset = PROVIDER_PRESETS[k.provider] || PROVIDER_PRESETS.custom;
        const cat = preset.category || 'Custom';
        if (categoryGroups[cat]) categoryGroups[cat].items.push(k);
        else categoryGroups.Custom.items.push(k);
    });

    // 视角 1：分类选择网格（未选择具体分类时）
    if (!activeApiKeyCategory) {
        let html = `<div class="grid grid-cols-2 gap-2 pb-1">`;
        for (const catKey in categoryGroups) {
            const group = categoryGroups[catKey];
            const count = group.items.length;
            html += `
                <div onclick="selectApiKeyCategory('${catKey}')" class="bg-white border border-[#f2e3e3] rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:border-[#d88c9a] hover:bg-[#fdf6f7] transition shadow-2xs">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${group.icon}</span>
                        <div>
                            <div class="text-xs font-bold text-[#4a3e3d]">${group.name}</div>
                            <div class="text-[10px] text-[#8c7476] opacity-80">${count} 个密钥</div>
                        </div>
                    </div>
                    <span class="text-gray-300 text-xs">›</span>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    // 视角 2：分类二级列表（点击进入某个分类后，精简极窄卡片行）
    const activeGroup = categoryGroups[activeApiKeyCategory] || categoryGroups.Custom;
    const catKeys = activeGroup.items;

    let html = `
        <div class="space-y-1.5">
            <div class="flex items-center justify-between pb-1 text-xs">
                <button onclick="selectApiKeyCategory(null)" class="text-[#d88c9a] font-bold hover:underline flex items-center gap-1 text-[11px]">
                    ‹ 返回分类列表
                </button>
                <span class="text-[#785e60] font-semibold text-[11px]">${activeGroup.icon} ${activeGroup.name} (${catKeys.length})</span>
            </div>
    `;

    if (catKeys.length === 0) {
        html += `
            <div class="py-8 text-center text-[#b89b9d] text-xs">
                该分类下暂无已保存密钥
            </div>
        `;
    } else {
        catKeys.forEach(k => {
            const preset = PROVIDER_PRESETS[k.provider] || PROVIDER_PRESETS.custom;
            const icon = preset.icon || '🔑';
            const maskedKey = k.apiKey.length > 8 ? k.apiKey.substring(0, 3) + '...' + k.apiKey.substring(k.apiKey.length - 3) : '***';

            html += `
                <div class="bg-white border border-[#f2e3e3] rounded-xl px-2.5 py-1.5 shadow-2xs hover:border-[#d88c9a] transition flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="text-base shrink-0">${icon}</span>
                        <div class="min-w-0 leading-tight">
                            <div class="font-bold text-[#4a3e3d] truncate text-[11px]">${k.name}</div>
                            <div class="text-[9px] font-mono text-gray-400 truncate opacity-90">${maskedKey}</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="copyApiKeyText('${k.apiKey}', 'Key', event)" class="px-2 py-0.5 rounded-md bg-[#f8eeee] text-[#785e60] text-[10px] font-medium hover:bg-[#f2dadc] transition">Key</button>
                        <button onclick="copyApiKeyText('${k.baseUrl}', 'URL', event)" class="px-2 py-0.5 rounded-md bg-[#f8eeee] text-[#785e60] text-[10px] font-medium hover:bg-[#f2dadc] transition">URL</button>
                        <button onclick="openApiKeyDetailModal('${k.id}')" class="px-2 py-0.5 rounded-md bg-[#d88c9a] text-white text-[10px] font-bold hover:bg-[#c97b8b] transition">详情</button>
                        <button onclick="showAddApiKeyDialog('${k.id}')" class="px-1.5 py-0.5 text-gray-400 hover:text-[#d88c9a] transition text-[11px]" title="编辑">✏️</button>
                        <button onclick="deleteApiKeyItem('${k.id}', event)" class="px-1.5 py-0.5 text-gray-300 hover:text-rose-500 transition text-[11px]" title="删除">🗑️</button>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    container.innerHTML = html;
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// 弹窗与逻辑 hook
window.showAddApiKeyDialog = showAddApiKeyDialog;
window.closeApiKeyModal = closeApiKeyModal;
window.submitSaveApiKey = submitSaveApiKey;
window.onProviderPresetChange = onProviderPresetChange;
window.renderApiKeyList = renderApiKeyList;
window.deleteApiKeyItem = deleteApiKeyItem;
window.copyApiKeyText = copyApiKeyText;
window.selectApiKeyCategory = selectApiKeyCategory;


async function openApiKeyDetailModal(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;

    let modal = document.getElementById('apiKeyDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'apiKeyDetailModal';
        modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    // 先渲染加载中状态
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#f2e3e3] space-y-4 animate-in fade-in zoom-in duration-200">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-3">
                <h3 class="font-bold text-sm text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🏷️</span> 令牌信息
                </h3>
                <button onclick="closeApiKeyDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <div class="py-8 text-center text-[#d88c9a] text-xs font-semibold animate-pulse">
                ⏳ 正在拉取中转站令牌详细信息...
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    const origin = (item.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const candidatePaths = [
        '/api/usage/token/',
        '/api/user/self',
        '/v1/dashboard/billing/subscription',
        '/v1/dashboard/billing/credit_grants'
    ];

    let info = {
        name: item.name,
        total: '未知',
        remain: '未知',
        used: '未知',
        expire: '永不过期',
        isUnlimited: false
    };

    for (const path of candidatePaths) {
        const fullUrl = origin.endsWith('/v1') && path.startsWith('/v1') ? origin + path.slice(3) : origin + path;
        try {
            let data = null;
            let res = await fetch(fullUrl, {
                headers: { 'Authorization': 'Bearer ' + item.apiKey, 'Accept': 'application/json' }
            });
            if (res.ok) data = await res.json();
            else if (typeof CF_PROXY_PREFIX !== 'undefined') {
                let proxyRes = await fetch(CF_PROXY_PREFIX + encodeURIComponent(fullUrl), {
                    headers: { 'Authorization': 'Bearer ' + item.apiKey, 'Accept': 'application/json' }
                });
                if (proxyRes.ok) data = await proxyRes.json();
            }

            if (data) {
                // A. neko-api-key-tool 结构 ({ data: { name, unlimited_quota, total_granted, total_used, total_available, expires_at } })
                if (data.data && typeof data.data.total_used !== 'undefined') {
                    const d = data.data;
                    info.name = d.name || item.name;
                    const usedUSD = (d.total_used / 500000).toFixed(2);
                    
                    if (d.unlimited_quota === true || d.unlimited_quota === 'true') {
                        info.isUnlimited = true;
                        info.total = '无限';
                        info.remain = '无限制';
                        info.used = '不进行计算';
                    } else {
                        info.isUnlimited = false;
                        const grantedUSD = (d.total_granted / 500000).toFixed(2);
                        const availUSD = typeof d.total_available !== 'undefined' ? (d.total_available / 500000).toFixed(2) : Math.max(0, grantedUSD - usedUSD).toFixed(2);
                        info.total = `$${grantedUSD}`;
                        info.remain = `$${availUSD}`;
                        info.used = `$${usedUSD}`;
                    }

                    if (d.expires_at && d.expires_at > 0) {
                        info.expire = new Date(d.expires_at * 1000).toLocaleDateString();
                    } else {
                        info.expire = '永不过期';
                    }
                    break;
                }

                // B. Subscription 结构 ({ hard_limit_usd: ... })
                if (typeof data.hard_limit_usd !== 'undefined') {
                    let hardLimitUSD = data.hard_limit_usd / 100;
                    if (hardLimitUSD >= 1000000) {
                        info.isUnlimited = true;
                        info.total = '无限';
                        info.remain = '无限制';
                        info.used = '不进行计算';
                    } else {
                        info.total = `$${hardLimitUSD.toFixed(2)}`;
                        info.remain = `$${hardLimitUSD.toFixed(2)}`;
                        info.used = '$0.00';
                    }
                    break;
                }
            }
        } catch(e) {}
    }

    // 渲染完备的复刻弹窗 UI
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#f2e3e3] space-y-4 animate-in fade-in zoom-in duration-200">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-3">
                <h3 class="font-bold text-sm text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🏷️</span> 令牌信息
                </h3>
                <button onclick="copyFormattedTokenDetail('${item.id}')" class="px-2.5 py-1 rounded-full bg-[#f8eeee] text-[#b86b7a] text-[11px] font-bold hover:bg-[#f2dadc] transition flex items-center gap-1">
                    <i data-lucide="copy" class="w-3 h-3"></i> 复制令牌信息
                </button>
                <button onclick="closeApiKeyDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl font-bold ml-1">&times;</button>
            </div>

            <div class="space-y-3 text-xs text-[#5c494a] py-1">
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">令牌名称 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold font-mono text-[#d88c9a]">${info.name}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">令牌总额 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#4a3e3d]">${info.total}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">剩余额度 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#d88c9a]">${info.remain}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">已用额度 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold ${info.isUnlimited ? 'text-[#c09a9c]' : 'text-[#4a3e3d]'}">${info.used}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">有效期至 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#d88c9a]">${info.expire}</span>
                </div>
            </div>

            <div class="pt-2 border-t border-[#f7ecee] flex justify-end">
                <button onclick="closeApiKeyDetailModal()" class="px-5 py-1.5 rounded-full bg-[#d88c9a] text-white text-xs font-bold hover:bg-[#c97b8b] transition shadow-sm">关闭</button>
            </div>
        </div>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function closeApiKeyDetailModal() {
    const modal = document.getElementById('apiKeyDetailModal');
    if (modal) modal.classList.add('hidden');
}

function copyFormattedTokenDetail(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;
    const infoText = `令牌名称: ${item.name}\nBase URL: ${item.baseUrl}\nAPI Key: ${item.apiKey}`;
    navigator.clipboard.writeText(infoText);
    showToast('📋', '已复制令牌详细信息');
}

window.openApiKeyDetailModal = openApiKeyDetailModal;
window.closeApiKeyDetailModal = closeApiKeyDetailModal;
window.copyFormattedTokenDetail = copyFormattedTokenDetail;
