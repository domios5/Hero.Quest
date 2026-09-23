// js/main.js — Som (Web Audio), instalação PWA, janelas de confirmação/aviso, e arranque do jogo.


    // --- Premir e segurar para repetir uma ação (botões "+" de Perícias, Loja de Prestígio,
    // Atributos e Mochila) --- Um único temporizador global chega, porque só pode haver uma
    // ação a repetir de cada vez; ao soltar o rato/dedo (em qualquer sítio, mesmo fora do botão
    // original, o que importa quando o botão é substituído a meio por um updateUI()), para logo.
    let holdRepeatTimer = null;
    function startHoldRepeat(action) {
        stopHoldRepeat();
        action(); // primeiro clique/toque atua de imediato, tal como um clique normal
        holdRepeatTimer = setTimeout(function repeatStep() {
            action();
            holdRepeatTimer = setTimeout(repeatStep, 80);
        }, 350); // espera 350ms antes de começar a repetir, para não confundir um clique normal
    }
    function stopHoldRepeat() {
        clearTimeout(holdRepeatTimer);
        holdRepeatTimer = null;
    }
    document.addEventListener('mouseup', stopHoldRepeat);
    document.addEventListener('mouseleave', stopHoldRepeat);
    document.addEventListener('touchend', stopHoldRepeat);
    document.addEventListener('touchcancel', stopHoldRepeat);

    // Janela de confirmação própria do jogo (evita depender do confirm() nativo do
    // browser, que alguns browsers deixam de mostrar depois de vários usos na mesma página)
    function showConfirm(message, onYes) {
        const overlay = document.createElement('div');
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:200; display:flex; align-items:center; justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#2c2c2c; border:2px solid #555; border-radius:10px; padding:20px; max-width:300px; text-align:center;">
                <p style="margin:0 0 15px 0;">${message}</p>
                <div style="display:flex; gap:10px;">
                    <button id="confirm-yes" style="background:#4caf50;">Sim</button>
                    <button id="confirm-no" style="background:#a32a2a;">Não</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('confirm-yes').onclick = () => { document.body.removeChild(overlay); onYes(); };
        document.getElementById('confirm-no').onclick = () => { document.body.removeChild(overlay); };
    }

    // Janela de aviso com um único botão "OK", para mensagens informativas (login diário, ganhos offline).
    // onClose (opcional) corre depois de fechada, para encadear vários avisos sem se sobreporem.
    function showNotice(title, message, onClose) {
        const overlay = document.createElement('div');
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:200; display:flex; align-items:center; justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#2c2c2c; border:2px solid var(--gold); border-radius:10px; padding:20px; max-width:320px; text-align:center;">
                <h3 style="color:var(--gold); margin-top:0;">${title}</h3>
                <p style="margin:0 0 15px 0; white-space:pre-line;">${message}</p>
                <button id="notice-ok" style="background:var(--btn-blue);">OK</button>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('notice-ok').onclick = () => { document.body.removeChild(overlay); if (onClose) onClose(); };
    }

    // --- Som (Web Audio API, sem ficheiros externos) ---
    let soundMuted = localStorage.getItem('heroQuestSoundMuted') === '1';
    let audioCtx = null;
    function playTone(freqs, duration = 0.12) {
        if (soundMuted) return;
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            freqs.forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                gain.gain.value = 0.08;
                osc.connect(gain); gain.connect(audioCtx.destination);
                const start = audioCtx.currentTime + i * duration;
                osc.start(start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                osc.stop(start + duration);
            });
        } catch (e) { /* Web Audio indisponível, ignora silenciosamente */ }
    }
    function sfxClick() { playTone([440], 0.05); }
    function sfxLevelUp() { playTone([523, 659, 784, 1047], 0.1); }
    function sfxVictory() { playTone([392, 523, 659], 0.12); }
    function sfxDefeat() { playTone([300, 200], 0.15); }
    function sfxLoot() { playTone([660, 880], 0.08); }
    function toggleSound() {
        soundMuted = !soundMuted;
        localStorage.setItem('heroQuestSoundMuted', soundMuted ? '1' : '0');
        document.getElementById('btn-sound').innerText = soundMuted ? '🔇' : '🔊';
        if (!soundMuted) sfxClick();
    }

    // --- Instalar como App (PWA) ---
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        const btn = document.getElementById('btn-install');
        if (btn) btn.style.display = 'inline-block';
    });
    function installApp() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(() => {
            deferredInstallPrompt = null;
            document.getElementById('btn-install').style.display = 'none';
        });
    }
    window.addEventListener('appinstalled', () => {
        document.getElementById('btn-install').style.display = 'none';
    });

    setInterval(() => { if (p.class) tickTimers(); }, 1000);

    document.getElementById('btn-sound').innerText = soundMuted ? '🔇' : '🔊';

    // Arranque: converte um save antigo de personagem único (se existir) e continua o último
    // personagem jogado; se não houver nenhum personagem ativo, mostra o ecrã de seleção.
    migrateOldSingleSave();
    const savedActiveChar = localStorage.getItem('heroQuestActiveChar');
    if (savedActiveChar && localStorage.getItem(charStorageKey(savedActiveChar))) {
        loadCharacter(savedActiveChar);
    } else {
        openCharSelect();
    }

    if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
    }
