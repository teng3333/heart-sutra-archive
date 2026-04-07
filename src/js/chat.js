/**
 * Chat Bot "アン" — Heart Sutra Modern Archive
 * Powered by Gemini 2.5 Flash via Cloudflare Workers
 */

(function () {
  'use strict';

  const WORKER_URL = 'https://heart-sutra-chat.taka2800.workers.dev';
  const AVATAR_SRC = 'assets/covers/ann_avatar.png';
  const MAX_HISTORY = 20; // keep last N messages in context

  let conversationHistory = [];
  let isTyping = false;
  let isOpen = false;

  // ─── Build Chat UI ────────────────────────────────────────────────────────
  function buildChatUI() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      /* ── Chat Launcher Button ── */
      #ann-launcher {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #000;
        border: 1px solid rgba(255,255,255,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 24px rgba(255,255,255,0.06), 0 4px 32px rgba(0,0,0,0.8);
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s;
        overflow: hidden;
        padding: 0;
      }
      @media (min-width: 768px) {
        #ann-launcher {
          width: 64px;
          height: 64px;
          bottom: 32px;
          right: 32px;
        }
      }
      #ann-launcher:hover {
        transform: scale(1.08);
        border-color: rgba(255,255,255,0.35);
        box-shadow: 0 0 40px rgba(255,255,255,0.12), 0 4px 32px rgba(0,0,0,0.9);
      }
      #ann-launcher img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
        border-radius: 50%;
        filter: grayscale(100%) brightness(0.85);
        transition: filter 0.4s;
      }
      #ann-launcher:hover img {
        filter: grayscale(60%) brightness(1.0);
      }
      #ann-launcher .ann-launcher-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 14px;
        height: 14px;
        background: #fff;
        border-radius: 50%;
        border: 2px solid #000;
        animation: ann-pulse 2s infinite;
      }
      @keyframes ann-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(0.85); }
      }

      /* ── Chat Window ── */
      #ann-chat-window {
        position: fixed;
        bottom: 80px;
        right: 16px;
        z-index: 9998;
        width: calc(100vw - 32px);
        max-width: 380px;
        height: 480px;
        max-height: calc(100vh - 120px);
        background: #080808;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 0 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04);
        transform: translateY(20px) scale(0.95);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
      }
      @media (min-width: 768px) {
        #ann-chat-window {
          width: 380px;
          height: 560px;
          bottom: 108px;
          right: 32px;
          max-height: calc(100vh - 140px);
        }
      }
      #ann-chat-window.ann-open {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: all;
      }

      /* ── Chat Header ── */
      .ann-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.02);
        flex-shrink: 0;
      }
      .ann-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.15);
        flex-shrink: 0;
      }
      .ann-header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
        filter: grayscale(100%) brightness(0.9);
      }
      .ann-header-info {
        flex: 1;
      }
      .ann-header-name {
        font-family: 'Cinzel', serif;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.15em;
        color: #fff;
        line-height: 1;
        margin-bottom: 4px;
      }
      .ann-header-status {
        font-family: 'Noto Serif JP', serif;
        font-size: 10px;
        color: rgba(255,255,255,0.35);
        letter-spacing: 0.08em;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .ann-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255,255,255,0.5);
        animation: ann-pulse 2.5s infinite;
      }
      .ann-header-close {
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(255,255,255,0.3);
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        border-radius: 4px;
      }
      .ann-header-close:hover { color: rgba(255,255,255,0.8); }

      /* ── Messages Area ── */
      .ann-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      .ann-messages::-webkit-scrollbar { width: 4px; }
      .ann-messages::-webkit-scrollbar-track { background: transparent; }
      .ann-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

      /* ── Message Bubbles ── */
      .ann-msg {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        animation: ann-msg-in 0.3s ease forwards;
        opacity: 0;
        transform: translateY(8px);
      }
      @keyframes ann-msg-in {
        to { opacity: 1; transform: translateY(0); }
      }
      .ann-msg.ann-msg-user {
        flex-direction: row-reverse;
      }
      .ann-msg-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .ann-msg-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
        filter: grayscale(100%) brightness(0.85);
      }
      .ann-msg-user .ann-msg-avatar {
        background: rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .ann-msg-user .ann-msg-avatar svg {
        width: 16px;
        height: 16px;
        color: rgba(255,255,255,0.4);
      }
      .ann-msg-bubble {
        max-width: 75%;
        padding: 12px 16px;
        border-radius: 16px;
        font-family: 'Noto Serif JP', serif;
        font-size: 13px;
        line-height: 1.7;
        color: rgba(255,255,255,0.88);
        word-break: break-word;
      }
      .ann-msg-bot .ann-msg-bubble {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-bottom-left-radius: 4px;
      }
      .ann-msg-user .ann-msg-bubble {
        background: rgba(255,255,255,0.09);
        border: 1px solid rgba(255,255,255,0.12);
        border-bottom-right-radius: 4px;
        color: rgba(255,255,255,0.95);
      }
      .ann-msg-bubble a {
        color: rgba(255,255,255,0.7);
        text-decoration: underline;
        text-underline-offset: 2px;
        transition: color 0.2s;
      }
      .ann-msg-bubble a:hover { color: #fff; }

      /* ── Typing Indicator ── */
      .ann-typing {
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }
      .ann-typing-dots {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        padding: 14px 18px;
        display: flex;
        gap: 5px;
        align-items: center;
      }
      .ann-typing-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(255,255,255,0.4);
        animation: ann-dot-bounce 1.2s infinite;
      }
      .ann-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .ann-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ann-dot-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-5px); opacity: 1; }
      }

      /* ── Input Area ── */
      .ann-input-area {
        padding: 12px 16px 16px;
        border-top: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.01);
        flex-shrink: 0;
      }
      .ann-input-row {
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }
      .ann-input {
        flex: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 10px 14px;
        color: #fff;
        font-family: 'Noto Serif JP', serif;
        font-size: 13px;
        line-height: 1.5;
        resize: none;
        outline: none;
        min-height: 42px;
        max-height: 120px;
        transition: border-color 0.2s, background 0.2s;
        scrollbar-width: none;
      }
      .ann-input::-webkit-scrollbar { display: none; }
      .ann-input::placeholder { color: rgba(255,255,255,0.25); }
      .ann-input:focus {
        border-color: rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.07);
      }
      .ann-send-btn {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s, border-color 0.2s, transform 0.15s;
        color: rgba(255,255,255,0.6);
      }
      .ann-send-btn:hover {
        background: rgba(255,255,255,0.14);
        border-color: rgba(255,255,255,0.25);
        color: #fff;
        transform: scale(1.05);
      }
      .ann-send-btn:active { transform: scale(0.95); }
      .ann-send-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        transform: none;
      }
      .ann-input-hint {
        font-family: 'Noto Serif JP', serif;
        font-size: 10px;
        color: rgba(255,255,255,0.2);
        text-align: center;
        margin-top: 8px;
        letter-spacing: 0.05em;
      }

      /* ── Grain on chat window ── */
      #ann-chat-window::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        pointer-events: none;
        z-index: 0;
        border-radius: 16px;
      }

      /* ── Mobile ── */
      @media (max-width: 480px) {
        #ann-launcher { bottom: 20px; right: 20px; }
        #ann-chat-window {
          bottom: 96px;
          right: 16px;
          left: 16px;
          width: auto;
          max-width: none;
          height: 70vh;
        }
      }
    `;
    document.head.appendChild(style);

    // Launcher button
    const launcher = document.createElement('button');
    launcher.id = 'ann-launcher';
    launcher.setAttribute('aria-label', 'アンに話しかける');
    launcher.innerHTML = `
      <img src="${AVATAR_SRC}" alt="アン" />
      <span class="ann-launcher-badge"></span>
    `;
    document.body.appendChild(launcher);

    // Chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'ann-chat-window';
    chatWindow.setAttribute('role', 'dialog');
    chatWindow.setAttribute('aria-label', 'アン — 般若心経チャット');
    chatWindow.innerHTML = `
      <div class="ann-header">
        <div class="ann-header-avatar">
          <img src="${AVATAR_SRC}" alt="アン" />
        </div>
        <div class="ann-header-info">
          <div class="ann-header-name">ANN — アン</div>
          <div class="ann-header-status">
            <span class="ann-status-dot"></span>
            <span>阿吽 · 般若心経の案内役</span>
          </div>
        </div>
        <button class="ann-header-close" id="ann-close-btn" aria-label="閉じる">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="ann-messages" id="ann-messages"></div>
      <div class="ann-input-area">
        <div class="ann-input-row">
          <textarea 
            class="ann-input" 
            id="ann-input" 
            placeholder="今の気分を話してみて…" 
            rows="1"
            aria-label="メッセージを入力"
          ></textarea>
          <button class="ann-send-btn" id="ann-send-btn" aria-label="送信">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p class="ann-input-hint">Enter で送信 · Shift+Enter で改行</p>
      </div>
    `;
    document.body.appendChild(chatWindow);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function scrollToBottom() {
    const msgs = document.getElementById('ann-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function linkify(text) {
    // Convert markdown-style links [text](url) and bare URLs
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/(?<!\()(https?:\/\/[^\s\)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Convert **bold**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Convert newlines
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function addMessage(role, content) {
    const msgs = document.getElementById('ann-messages');
    if (!msgs) return;

    const msgEl = document.createElement('div');
    msgEl.className = `ann-msg ann-msg-${role === 'assistant' ? 'bot' : 'user'}`;

    const avatarEl = document.createElement('div');
    avatarEl.className = 'ann-msg-avatar';

    if (role === 'assistant') {
      avatarEl.innerHTML = `<img src="${AVATAR_SRC}" alt="アン" />`;
    } else {
      avatarEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    }

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'ann-msg-bubble';
    bubbleEl.innerHTML = linkify(content);

    msgEl.appendChild(avatarEl);
    msgEl.appendChild(bubbleEl);
    msgs.appendChild(msgEl);
    scrollToBottom();
  }

  function showTyping() {
    const msgs = document.getElementById('ann-messages');
    if (!msgs) return;
    const typingEl = document.createElement('div');
    typingEl.className = 'ann-typing';
    typingEl.id = 'ann-typing-indicator';
    typingEl.innerHTML = `
      <div class="ann-msg-avatar">
        <img src="${AVATAR_SRC}" alt="アン" />
      </div>
      <div class="ann-typing-dots">
        <div class="ann-typing-dot"></div>
        <div class="ann-typing-dot"></div>
        <div class="ann-typing-dot"></div>
      </div>
    `;
    msgs.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('ann-typing-indicator');
    if (el) el.remove();
  }

  function setInputDisabled(disabled) {
    const input = document.getElementById('ann-input');
    const sendBtn = document.getElementById('ann-send-btn');
    if (input) input.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled;
  }

  // ─── API Call ─────────────────────────────────────────────────────────────
  async function sendToAnn(userMessage) {
    if (isTyping) return;
    isTyping = true;
    setInputDisabled(true);

    // Add to history
    conversationHistory.push({ role: 'user', content: userMessage });
    addMessage('user', userMessage);

    // Trim history
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    showTyping();

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      hideTyping();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || '……言葉が出てこない。もう一度話してくれる？';

      conversationHistory.push({ role: 'assistant', content: reply });
      addMessage('assistant', reply);
    } catch (err) {
      hideTyping();
      console.error('Ann chat error:', err);
      addMessage('assistant', '……接続が途切れた。もう一度試してみて。');
    } finally {
      isTyping = false;
      setInputDisabled(false);
      const input = document.getElementById('ann-input');
      if (input) input.focus();
    }
  }

  // ─── Initial Greeting ─────────────────────────────────────────────────────
  async function sendGreeting() {
    showTyping();
    setInputDisabled(true);

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'はじめまして。自己紹介して。' }],
        }),
      });

      hideTyping();

      if (response.ok) {
        const data = await response.json();
        const greeting = data.reply || 'アンよ。今の気分は？';
        conversationHistory.push({ role: 'assistant', content: greeting });
        addMessage('assistant', greeting);
      } else {
        addMessage('assistant', '私はアン。今の気分は？');
      }
    } catch {
      hideTyping();
      addMessage('assistant', '私はアン。今の気分は？');
    } finally {
      setInputDisabled(false);
      const input = document.getElementById('ann-input');
      if (input) input.focus();
    }
  }

  // ─── Toggle Chat ──────────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    const win = document.getElementById('ann-chat-window');
    const badge = document.querySelector('.ann-launcher-badge');
    if (win) win.classList.add('ann-open');
    if (badge) badge.style.display = 'none';

    // Send greeting on first open
    const msgs = document.getElementById('ann-messages');
    if (msgs && msgs.children.length === 0) {
      sendGreeting();
    }
  }

  function closeChat() {
    isOpen = false;
    const win = document.getElementById('ann-chat-window');
    if (win) win.classList.remove('ann-open');
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────
  function bindEvents() {
    const launcher = document.getElementById('ann-launcher');
    const closeBtn = document.getElementById('ann-close-btn');
    const sendBtn = document.getElementById('ann-send-btn');
    const input = document.getElementById('ann-input');

    if (launcher) launcher.addEventListener('click', () => isOpen ? closeChat() : openChat());
    if (closeBtn) closeBtn.addEventListener('click', closeChat);

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const val = input ? input.value.trim() : '';
        if (val) {
          sendToAnn(val);
          input.value = '';
          input.style.height = 'auto';
        }
      });
    }

    if (input) {
      // Auto-resize textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });

      // Enter to send, Shift+Enter for newline
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const val = input.value.trim();
          if (val && !isTyping) {
            sendToAnn(val);
            input.value = '';
            input.style.height = 'auto';
          }
        }
      });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      const win = document.getElementById('ann-chat-window');
      const btn = document.getElementById('ann-launcher');
      if (win && !win.contains(e.target) && btn && !btn.contains(e.target)) {
        closeChat();
      }
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    buildChatUI();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
