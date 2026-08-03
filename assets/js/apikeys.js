// ============================================================
// API Key Manager Module
// ============================================================

const API_KEYS_STORAGE_KEY = 'TAVERN_API_KEYS_DATA_V1';

const PROVIDER_PRESETS = {
    openai: {
        name: 'OpenAI 官方',
        baseUrl: 'https://api.openai.com/v1',
        balancePath: '/dashboard/billing/credit_grants',
        icon: '🤖'
    },
    claude: {
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        balancePath: '',
        icon: '🧠'
    },
    siliconflow: {
        name: '硅基流动 (SiliconFlow)',
        baseUrl: 'https://api.siliconflow.cn/v1',
        balancePath: '/user/info',
        icon: '⚡'
    },
    deepseek: {
        name: 'DeepSeek 官方',
        baseUrl: 'https://api.deepseek.com/v1',
        balancePath: '/user/balance',
        icon: '🐳'
    },
    zhipu: {
        name: '智谱 GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        balancePath: '',
        icon: '🔮'
    },
    moonshot: {
        name: '月之暗面 (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1',
        balancePath: '/user/balance',
        icon: '🌙'
    },
    minimax_tts: {
        name: '🎙️ MiniMax 语音 (TTS)',
        baseUrl: 'https://api.minimax.chat/v1',
        balancePath: '',
        icon: '🎙️'
    },
    volcengine_tts: {
        name: '🎙️ 火山引擎语音 (字节)',
        baseUrl: 'https://openspeech.bytedance.com/api/v1/tts',
        balancePath: '',
        icon: '🌋'
    },
    aliyun_tts: {
        name: '🎙️ 阿里云语音 (nls)',
        baseUrl: 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts',
        balancePath: '',
        icon: '☁️'
    },
    tencent_tts: {
        name: '🎙️ 腾讯云语音 (TTS)',
        baseUrl: 'https://tts.cloud.tencent.com/stream',
        balancePath: '',
        icon: '🐧'
    },
    xunfei_tts: {
        name: '🎙️ 讯飞开放平台 (TTS)',
        baseUrl: 'https://tts-api.xfyun.cn/v2/tts',
        balancePath: '',
        icon: '🗣️'
    },
    azure_speech: {
        name: '🎙️ Microsoft Azure Speech',
        baseUrl: 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1',
        balancePath: '',
        icon: '🔷'
    },
    elevenlabs: {
        name: '🎙️ ElevenLabs',
        baseUrl: 'https://api.elevenlabs.io/v1',
        balancePath: '/user/subscription',
        icon: '🎧'
    },
    openai_tts: {
        name: '🎙️ OpenAI Audio TTS',
        baseUrl: 'https://api.openai.com/v1/audio/speech',
        balancePath: '',
        icon: '🔊'
    },
    oneapi: {
        name: '中转站 / One-API',
        baseUrl: 'https://your-oneapi-domain.com/v1',
        balancePath: '/api/user/self',
        icon: '🔀'
    },
    custom: {
        name: '自定义 OAI 兼容',
        baseUrl: '',
        balancePath: '',
        icon: '🔧'
    }
};

function getStoredApiKeys() {
    try {
        const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        console.error('Failed to parse API keys', e);
        return [];
    }
}

function saveStoredApiKeys(keys) {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    renderApiKeyList();
    if (typeof updateBadges === 'function') updateBadges();
}

function showAddApiKeyDialog() {
    const dialog = document.getElementById('apiKeyModal');
    if (dialog) {
        dialog.classList.remove('hidden');
        onProviderPresetChange();
    } else {
        createApiKeyModalDom();
    }
}

function closeApiKeyModal() {
    const dialog = document.getElementById('apiKeyModal');
    if (dialog) dialog.classList.add('hidden');
}

function onProviderPresetChange() {
    const presetSelect = document.getElementById('keyProviderSelect');
    const urlInput = document.getElementById('keyBaseUrlInput');
    if (!presetSelect || !urlInput) return;
    const p = PROVIDER_PRESETS[presetSelect.value];
    if (p && p.baseUrl) {
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

    const keys = getStoredApiKeys();
    keys.push({
        id: 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name,
        provider,
        baseUrl,
        apiKey,
        createdAt: Date.now()
    });

    saveStoredApiKeys(keys);
    closeApiKeyModal();
    if (nameInput) nameInput.value = '';
    if (secretInput) secretInput.value = '';
    showToast('🎉', 'API Key 保存成功！');
}

function deleteApiKeyItem(id) {
    if (!confirm('确定删除该 API Key 吗？')) return;
    let keys = getStoredApiKeys();
    keys = keys.filter(k => k.id !== id);
    saveStoredApiKeys(keys);
    showToast('🗑️', '已删除密钥');
}

function copyApiKeyText(text, label) {
    if (!text) { showToast('⚠️', '无可复制内容'); return; }
    navigator.clipboard.writeText(text);
    showToast('📋', `已复制 ${label || '内容'}`);
}

function copyCurlSnippet(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;
    const url = (item.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
    const snippet = `curl "${url}" \\
  -H "Authorization: Bearer ${item.apiKey}" \\
  -H "Content-[#Header]: application/json" \\
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}]}'`;
    navigator.clipboard.writeText(snippet);
    showToast('💻', '已复制 curl 测试指令');
}

async function testApiKeyConnection(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;
    
    showToast('⏳', '正在连接测试...');
    const url = (item.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${item.apiKey}` }
        });
        if (res.ok) {
            showToast('✅', '接口连通成功！');
        } else {
            showToast('⚠️', `响应状态: ${res.status}`);
        }
    } catch(err) {
        showToast('❌', '请求失败：网络或跨域限制');
    }
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
        <div class="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-[#f2e3e3]">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-2.5">
                <h3 class="font-bold text-sm text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🔑</span> 新增 API Key 密钥
                </h3>
                <button onclick="closeApiKeyModal()" class="text-gray-400 hover:text-gray-600 text-lg font-bold">&times;</button>
            </div>
            
            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-[#785e60] mb-1">密钥名称 / 备注</label>
                    <input id="keyNameInput" type="text" placeholder="例: 我的 MiniMax / 硅基流动" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg p-2 focus:outline-none focus:border-[#d88c9a]">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-1">服务商预设</label>
                    <select id="keyProviderSelect" onchange="onProviderPresetChange()" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg p-2 focus:outline-none focus:border-[#d88c9a]">
                        ${providerOptions}
                    </select>
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-1">Base URL (接口请求基地址)</label>
                    <input id="keyBaseUrlInput" type="text" placeholder="https://..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg p-2 focus:outline-none focus:border-[#d88c9a] font-mono">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-1">API Key 密钥</label>
                    <input id="keySecretInput" type="password" placeholder="sk-..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg p-2 focus:outline-none focus:border-[#d88c9a] font-mono">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-[#f7ecee]">
                <button onclick="closeApiKeyModal()" class="px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 transition">取消</button>
                <button onclick="submitSaveApiKey()" class="px-4 py-1.5 rounded-full bg-[#d88c9a] text-white text-xs font-bold hover:bg-[#c97b8b] shadow-sm transition">保存密钥</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
        onProviderPresetChange();
    } else {
        modal.classList.remove('hidden');
    }
}

function renderApiKeyList() {
    const container = document.getElementById('apikeyList') || document.getElementById('apikeysListContainer');
    if (!container) return;

    const keys = getStoredApiKeys();
    const countBadge = document.getElementById('tab-apikeys-count');
    if (countBadge) countBadge.innerText = keys.length;

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center text-[#b89b9d]">
                <div class="text-3xl mb-2">🔑</div>
                <p class="text-xs font-semibold">暂未保存任何 API 密钥</p>
                <p class="text-[11px] opacity-75 mt-1">点击右上角 “+ 新增密钥” 开始配置</p>
            </div>
        `;
        return;
    }

    let html = '';
    keys.forEach(k => {
        const preset = PROVIDER_PRESETS[k.provider] || PROVIDER_PRESETS.custom;
        const icon = preset.icon || '🔑';
        const providerName = preset.name || k.provider;
        const maskedKey = k.apiKey.length > 10 ? k.apiKey.substring(0, 4) + '...' + k.apiKey.substring(k.apiKey.length - 4) : '******';

        html += `
            <div class="bg-white border border-[#f2e3e3] rounded-2xl p-4 shadow-sm space-y-3 relative hover:border-[#d88c9a] transition">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${icon}</span>
                        <div>
                            <h4 class="font-bold text-xs text-[#4a3e3d]">${k.name}</h4>
                            <span class="inline-block text-[10px] text-[#8c7476] bg-[#f8eeee] px-2 py-0.5 rounded-full mt-0.5">${providerName}</span>
                        </div>
                    </div>
                    <button onclick="deleteApiKeyItem('${k.id}')" class="text-gray-300 hover:text-rose-500 transition p-1" title="删除">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>

                <div class="bg-[#faf6f0] p-2.5 rounded-xl space-y-1.5 text-[11px] font-mono text-[#5c494a] overflow-hidden">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-gray-400 shrink-0">URL:</span>
                        <span class="truncate">${k.baseUrl || '（使用默认官方地址）'}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-gray-400 shrink-0">KEY:</span>
                        <span>${maskedKey}</span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 pt-1 overflow-x-auto">
                    <button onclick="copyApiKeyText('${k.apiKey}', 'API Key')" class="px-2.5 py-1 rounded-lg bg-[#f8eeee] text-[#785e60] text-[11px] font-medium hover:bg-[#f2dadc] transition shrink-0">📋 复制 Key</button>
                    <button onclick="copyApiKeyText('${k.baseUrl}', 'Base URL')" class="px-2.5 py-1 rounded-lg bg-[#f8eeee] text-[#785e60] text-[11px] font-medium hover:bg-[#f2dadc] transition shrink-0">🔗 复制 URL</button>
                    <button onclick="copyCurlSnippet('${k.id}')" class="px-2.5 py-1 rounded-lg bg-[#f8eeee] text-[#785e60] text-[11px] font-medium hover:bg-[#f2dadc] transition shrink-0">💻 复制 curl</button>
                    <button onclick="fetchApiKeyBalance('${k.id}')" class="px-2.5 py-1 rounded-lg bg-[#d88c9a]/10 text-[#d88c9a] text-[11px] font-bold hover:bg-[#d88c9a]/20 transition shrink-0">💰 查余额</button>
                    <button onclick="testApiKeyConnection('${k.id}')" class="px-2.5 py-1 rounded-lg bg-[#d88c9a]/10 text-[#d88c9a] text-[11px] font-bold hover:bg-[#d88c9a]/20 transition shrink-0 ml-auto">⚡ 连通测试</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// Global hook
window.showAddApiKeyDialog = showAddApiKeyDialog;
window.closeApiKeyModal = closeApiKeyModal;
window.submitSaveApiKey = submitSaveApiKey;
window.onProviderPresetChange = onProviderPresetChange;
window.renderApiKeyList = renderApiKeyList;
window.deleteApiKeyItem = deleteApiKeyItem;
window.copyApiKeyText = copyApiKeyText;
window.copyCurlSnippet = copyCurlSnippet;
window.testApiKeyConnection = testApiKeyConnection;

async function fetchApiKeyBalance(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;

    const preset = PROVIDER_PRESETS[item.provider] || PROVIDER_PRESETS.custom;
    const origin = (item.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    
    if (['minimax_tts', 'volcengine_tts', 'aliyun_tts', 'tencent_tts', 'xunfei_tts', 'azure_speech', 'openai_tts'].includes(item.provider)) {
        showToast('ℹ️', '该语音服务请前往对应控制台查看');
        return;
    }

    showToast('⏳', '正在查询余额...');

    // 针对 New-API / neko-api-key-tool 站点的候选路径，把 /api/usage/token/ 设为最高优先级！
    const candidatePaths = [
        '/api/usage/token/',
        '/api/user/self',
        '/v1/dashboard/billing/subscription',
        '/v1/dashboard/billing/credit_grants',
        '/user/balance'
    ];
    if (preset.balancePath) candidatePaths.unshift(preset.balancePath);

    const uniquePaths = [...new Set(candidatePaths)];

    for (const path of uniquePaths) {
        const fullUrl = origin.endsWith('/v1') && path.startsWith('/v1') ? origin + path.slice(3) : origin + path;
        try {
            const res = await fetch(fullUrl, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + item.apiKey, 'Accept': 'application/json' }
            });
            if (!res.ok) continue;
            const data = await res.json();

            // A. neko-api-key-tool / New-API token 专属接口: { data: { unlimited_quota: true/false, total_granted: ..., total_used: ..., total_available: ... } }
            if (data && data.data && typeof data.data.total_used !== 'undefined') {
                const d = data.data;
                const used = (d.total_used / 500000).toFixed(2);
                if (d.unlimited_quota) {
                    showToast('💰', `令牌额度: 无限额度 (已用 $${used})`);
                } else {
                    const granted = (d.total_granted / 500000).toFixed(2);
                    const avail = (d.total_available / 500000).toFixed(2);
                    showToast('💰', `充值剩余: $${avail} / 限额 $${granted} (已用 $${used})`);
                }
                return;
            }

            // B. New-API / One-API 用户配额: { success: true, data: { quota: 5000000, used_quota: 50000 } }
            if (data && data.data && typeof data.data.quota !== 'undefined') {
                const remainQuota = (data.data.quota / 500000).toFixed(2);
                showToast('💰', `账户余额: $${remainQuota}`);
                return;
            }

            // C. OpenAI / Subscription
            if (data && typeof data.hard_limit_usd !== 'undefined') {
                let hardLimitUSD = data.hard_limit_usd / 100;
                let usedUSD = 0;
                try {
                    const now = new Date();
                    const usageUrl = (origin.endsWith('/v1') ? origin : origin + '/v1') + `/dashboard/billing/usage?start_date=${now.getFullYear()}-01-01&end_date=${now.getFullYear()}-12-31`;
                    const usageRes = await fetch(usageUrl, { headers: { 'Authorization': 'Bearer ' + item.apiKey } });
                    if (usageRes.ok) {
                        const usageData = await usageRes.json();
                        if (usageData && typeof usageData.total_usage !== 'undefined') {
                            usedUSD = usageData.total_usage / 100;
                        }
                    }
                } catch(e) {}

                let remainUSD = Math.max(0, hardLimitUSD - usedUSD);
                if (hardLimitUSD >= 1000000) {
                    showToast('💰', `可用额度: $${remainUSD.toFixed(2)} (已用 $${usedUSD.toFixed(2)})`);
                } else {
                    showToast('💰', `账户余额: $${remainUSD.toFixed(2)}`);
                }
                return;
            }

            // D. total_available
            if (data && typeof data.total_available !== 'undefined') {
                showToast('💰', `账户余额: $${Number(data.total_available).toFixed(2)}`);
                return;
            }
        } catch(e) {
            // 尝试下一个候选路径
        }
    }

    showToast('⚠️', '未能识别账户余额（请确认 Key 权限或接口格式）');
}
window.fetchApiKeyBalance = fetchApiKeyBalance;
