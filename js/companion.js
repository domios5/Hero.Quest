// js/companion.js — Sistema de Companion: tipos, XP partilhado, nível derivado, escolha/retreino.


    // --- Companion ---
    // Desbloqueia-se no nível 20. O nível do companion é sempre DERIVADO do XP acumulado
    // (p.companion.xp, que nunca desce) através de uma curva própria, capado ao nível do jogador
    // e ao nível máximo do tipo escolhido — se o XP acumulado "chegar" para mais níveis do que o
    // jogador tem, fica em banco e é aplicado automaticamente assim que o jogador sobe de nível.
    const COMPANION_UNLOCK_LEVEL = 20;
    const COMPANION_RETRAIN_COST = 150;
    const COMPANIONS = {
        lobo:      { name: 'Lobo de Batalha', icon: '🐺', type: 'Ofensivo',  desc: '+0.4% de dano em combate por nível', perLevel: 0.4, maxLevel: 50 },
        coruja:    { name: 'Coruja Sábia',    icon: '🦉', type: 'Utilidade', desc: '+0.5% de Ouro e XP ganhos por nível', perLevel: 0.5, maxLevel: 40 },
        tartaruga: { name: 'Tartaruga Guardiã', icon: '🐢', type: 'Defensivo', desc: '-0.4% de dano recebido por nível', perLevel: 0.4, maxLevel: 50 }
    };

    // XP total cumulativo necessário para o companion atingir um dado nível (curva própria e simples)
    function companionXpForLevel(lvl) { return Math.floor(25 * lvl * (lvl - 1)); }

    function getCompanionLevel() {
        if (!p.companion || !p.companion.type) return 0;
        const info = COMPANIONS[p.companion.type];
        const cap = Math.min(info.maxLevel, p.lvl);
        let lvl = 1;
        while (lvl < cap && p.companion.xp >= companionXpForLevel(lvl + 1)) lvl++;
        return lvl;
    }

    // Chamado sempre que o jogador ganha XP (missões, arena, boss) — o companion ganha 50% dessa XP.
    function addCompanionXp(playerXpEarned) {
        if (!p.companion || !p.companion.type || playerXpEarned <= 0) return;
        p.companion.xp += Math.floor(playerXpEarned * 0.5);
    }

    function getCompanionDamageMultiplier() {
        if (!p.companion || p.companion.type !== 'lobo') return 1;
        return 1 + (getCompanionLevel() * COMPANIONS.lobo.perLevel) / 100;
    }
    function getCompanionGoldMultiplier() {
        if (!p.companion || p.companion.type !== 'coruja') return 1;
        return 1 + (getCompanionLevel() * COMPANIONS.coruja.perLevel) / 100;
    }
    function getCompanionXpMultiplier() {
        if (!p.companion || p.companion.type !== 'coruja') return 1;
        return 1 + (getCompanionLevel() * COMPANIONS.coruja.perLevel) / 100;
    }
    function getCompanionDefenseMultiplier() {
        if (!p.companion || p.companion.type !== 'tartaruga') return 1;
        return 1 - (getCompanionLevel() * COMPANIONS.tartaruga.perLevel) / 100;
    }

    function chooseCompanion(id) {
        if (p.lvl < COMPANION_UNLOCK_LEVEL || (p.companion && p.companion.type)) return;
        const info = COMPANIONS[id];
        if (!info) return;
        showConfirm(`Escolher "${info.icon} ${info.name}" como companion?`, () => {
            p.companion.type = id;
            log(`Novo companion: ${info.icon} ${info.name}!`, "var(--gold)");
            sfxLevelUp();
            updateUI();
        });
    }

    function retrainCompanion(id) {
        if (!p.companion || !p.companion.type || id === p.companion.type) return;
        const info = COMPANIONS[id];
        if (!info) return;
        if (p.gold < COMPANION_RETRAIN_COST) { log(`Precisas de ${COMPANION_RETRAIN_COST} Ouro para retreinar o companion.`, "var(--btn-red)"); return; }
        showConfirm(`Retreinar o companion para "${info.icon} ${info.name}" por ${COMPANION_RETRAIN_COST} Ouro? Mantém o nível/XP acumulado, só muda o tipo.`, () => {
            p.gold -= COMPANION_RETRAIN_COST;
            p.companion.type = id;
            log(`Companion retreinado para ${info.icon} ${info.name}!`, "var(--accent)");
            sfxClick();
            updateUI();
        });
    }

    function renderCompanionBox() {
        const box = document.getElementById('companion-box');
        if (!box) return;
        if (p.lvl < COMPANION_UNLOCK_LEVEL) {
            box.innerHTML = `<p style="color:#888; font-size:0.85em; background:#292929; padding:10px; border-radius:5px;">🔒 Disponível a partir do nível ${COMPANION_UNLOCK_LEVEL} (faltam ${COMPANION_UNLOCK_LEVEL - p.lvl} níveis).</p>`;
            return;
        }
        if (!p.companion || !p.companion.type) {
            let html = `<p style="font-size:0.8em; color:#aaa; margin-bottom:8px;">Escolhe o teu companion:</p>`;
            Object.keys(COMPANIONS).forEach(id => {
                const info = COMPANIONS[id];
                html += `<div class="item-card">
                    <b>${info.icon} ${info.name}</b> <small style="color:#888;">(${info.type})</small><br>
                    <small>${info.desc} (nível máx ${info.maxLevel})</small>
                    <button onclick="chooseCompanion('${id}')" style="background:#4caf50;">Escolher</button>
                </div>`;
            });
            box.innerHTML = html;
            return;
        }
        const cur = COMPANIONS[p.companion.type];
        const lvl = getCompanionLevel();
        const effectPct = Math.round(lvl * cur.perLevel * 100) / 100;
        let html = `<div class="item-card" style="border-color:var(--gold);">
            <b>${cur.icon} ${cur.name}</b> <small style="color:#888;">(${cur.type})</small><br>
            <small>Nível <b>${lvl}</b>/${Math.min(cur.maxLevel, p.lvl)} — efeito atual: <b style="color:var(--gold);">${cur.type === 'Defensivo' ? '-' : '+'}${effectPct}%</b></small>
        </div>
        <p style="font-size:0.75em; color:#888; margin:8px 0 6px 0;">Retreinar (mantém nível/XP, ${COMPANION_RETRAIN_COST}G):</p>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">`;
        Object.keys(COMPANIONS).forEach(id => {
            if (id === p.companion.type) return;
            const info = COMPANIONS[id];
            html += `<button onclick="retrainCompanion('${id}')" style="background:#555; font-size:0.75em; padding:4px 8px;">${info.icon} ${info.name}</button>`;
        });
        html += `</div>`;
        box.innerHTML = html;
    }