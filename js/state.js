// js/state.js — Estado do personagem: criação/migração de save, guardar/carregar, gestão de múltiplos personagens, login diário, ganhos offline, getTotalAttr.


    // Estado inicial de um personagem novo. É uma função (não um objeto fixo) porque agora
    // é possível criar vários personagens — cada um precisa da sua própria cópia limpa.
    function defaultCharacterState() {
        return {
            saveVersion: CURRENT_SAVE_VERSION,
            class: null, lvl: 1, gold: 50, xp: 0, nextLvl: 100, points: 0,
            hp: 100, maxHp: 100, str: 5, dex: 5, int: 5, luk: 1, arenaRank: 1,
            inv: [], equip: { weapon: null, armor: null, amulet: null, ring: null, boots: null, cape: null },
            shopItems: [], shopRefreshAt: 0, currentQuests: [],
            boss: {
                hp: 0,
                maxHp: 0,
                dmg: 0,
                attempts: 5,
                nextSpawn: 0, // Timestamp para daqui a 3 dias
                active: false,
                depletedAt: 0, // Timestamp de quando as tentativas chegaram a 0, para o boss fugir depois de 1h
                shieldHitsUsed: 0 // quantos ataques já foram absorvidos pelo Escudo Arcano nesta aparição
            },
            ability: { lastUsed: 0 },
            prestige: 0,
            prestigePoints: 0, // Pontos de Prestígio (1 ganho a cada Prestígio), gastos na Loja de Prestígio
            prestigePerks: {}, // { chave_perk: pontos_investidos }
            buffs: { dmgBoostNext: false },
            lastActiveAt: 0,
            lastLoginDay: null, // string "YYYY-MM-DD" do último dia em que o jogo foi aberto
            loginStreak: 0,
            stats: { questsDone: 0, arenaWins: 0, bossesKilled: 0, itemsFound: 0, enchantsDone: 0, goldEarned: 0, xpEarned: 0 },
            achievements: {},
            talent: { chosen: null }, // id do talento escolhido; a especialização não é gravada à parte, é sempre derivada do nível atual
            attrPurchases: { str: 0, vit: 0, dex: 0, int: 0, luk: 0 }, // quantas vezes cada atributo já foi comprado com Ouro (define o custo da próxima compra)
            pericias: {}, // { chave_pericia: pontos_investidos }, comprado com Pontos de Perícia (ganhos ao subir de nível)
            companion: { type: null, xp: 0 }, // xp acumulado (nunca desce); o nível é sempre derivado dele, capado ao nível do jogador
            invCapacityPurchases: 0, // quantas vezes a mochila já foi expandida com Ouro (define o custo da próxima expansão)
            uniqueItems: {} // { chave_item_unico: true } — Itens Únicos já alguma vez desbloqueados por este personagem
        };
    }

    let p = defaultCharacterState();
    let activeCharId = null; // id do personagem atualmente carregado (chave usada no localStorage)

    let invSortMode = 'none'; // não é guardado, reinicia a cada carregamento
    let sellRarityFilter = new Set(); // raridades marcadas para venda em lote; também não é guardado
    let arenaEnemyState = null; // { name, hp, maxHp } do inimigo da Arena durante/depois de um combate animado; transitório, não é guardado
    let combatAnimating = false; // true enquanto uma animação de combate (Arena ou Boss) está a decorrer

    // --- Personagens (cada um é gravado numa chave própria do localStorage) ---
    function charStorageKey(id) { return 'heroQuestChar_' + id; }
    function getCharList() {
        try { return JSON.parse(localStorage.getItem('heroQuestCharList') || '[]'); } catch (e) { return []; }
    }
    function saveCharList(list) {
        try { localStorage.setItem('heroQuestCharList', JSON.stringify(list)); } catch (e) {}
    }

    // Se existir o save de personagem único de versões anteriores do jogo e ainda não houver
    // nenhuma lista de personagens, converte-o automaticamente no primeiro personagem — não perdes o progresso.
    function migrateOldSingleSave() {
        const old = localStorage.getItem('heroQuestFinalSave');
        const list = getCharList();
        if (old && list.length === 0) {
            const id = 'char_' + Date.now();
            localStorage.setItem(charStorageKey(id), old);
            saveCharList([{ id, name: 'Aventureiro', createdAt: Date.now() }]);
            localStorage.setItem('heroQuestActiveChar', id);
            localStorage.removeItem('heroQuestFinalSave');
        }
    }

    function save() {
        if (!activeCharId) return;
        try {
            p.lastActiveAt = Date.now();
            localStorage.setItem(charStorageKey(activeCharId), JSON.stringify(p));
        } catch (e) {
            log("Não foi possível guardar o progresso (armazenamento cheio ou bloqueado).", "var(--btn-red)");
        }
    }

    // Preenche campos em falta em saves antigos, para não partir com versões anteriores do jogo
    function migrateSave() {
        if (!p.equip) p.equip = {};
        ['weapon', 'armor', 'amulet', 'ring', 'boots', 'cape'].forEach(s => { if (!(s in p.equip)) p.equip[s] = null; });
        if (!p.boss) p.boss = { hp: 0, maxHp: 0, dmg: 0, attempts: 5, nextSpawn: 0, active: false, depletedAt: 0 };
        if (p.boss.dmg === undefined) p.boss.dmg = p.lvl * 15;
        if (p.boss.depletedAt === undefined) p.boss.depletedAt = 0;
        if (p.boss.shieldHitsUsed === undefined) p.boss.shieldHitsUsed = 0;
        if (!p.ability) p.ability = { lastUsed: 0 };
        if (p.prestige === undefined) p.prestige = 0;
        if (p.prestigePoints === undefined) p.prestigePoints = 0;
        if (!p.prestigePerks) p.prestigePerks = {};
        if (!p.buffs) p.buffs = { dmgBoostNext: false };
        if (p.shopRefreshAt === undefined) p.shopRefreshAt = 0;
        if (!Array.isArray(p.inv)) p.inv = [];
        if (!p.stats) p.stats = { questsDone: 0, arenaWins: 0, bossesKilled: 0, itemsFound: 0, enchantsDone: 0, goldEarned: 0, xpEarned: 0 };
        ['questsDone', 'arenaWins', 'bossesKilled', 'itemsFound', 'enchantsDone', 'goldEarned', 'xpEarned'].forEach(k => { if (p.stats[k] === undefined) p.stats[k] = 0; });
        if (!p.achievements) p.achievements = {};
        if (!p.talent) p.talent = { chosen: null };
        if (!p.attrPurchases) p.attrPurchases = { str: 0, vit: 0, dex: 0, int: 0, luk: 0 };
        ['str', 'vit', 'dex', 'int', 'luk'].forEach(k => { if (p.attrPurchases[k] === undefined) p.attrPurchases[k] = 0; });
        if (!p.pericias) p.pericias = {};
        if (!p.companion) p.companion = { type: null, xp: 0 };
        if (p.companion.type === undefined) p.companion.type = null;
        if (p.companion.xp === undefined) p.companion.xp = 0;
        if (p.invCapacityPurchases === undefined) p.invCapacityPurchases = 0;
        if (!p.uniqueItems) p.uniqueItems = {};
        if (p.lastActiveAt === undefined) p.lastActiveAt = 0;
        if (p.lastLoginDay === undefined) p.lastLoginDay = null;
        if (p.loginStreak === undefined) p.loginStreak = 0;
        p.saveVersion = CURRENT_SAVE_VERSION;
    }

    function todayKey(d = new Date()) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

    // Sequência de login diário: dá ouro (mais nos dias de "marco") por abrires o jogo em dias seguidos.
    function checkDailyLogin() {
        const today = todayKey();
        if (p.lastLoginDay === today) return; // já contaste hoje

        const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
        if (p.lastLoginDay === yesterday) {
            p.loginStreak++;
        } else {
            p.loginStreak = 1; // quebrou a sequência (ou é o primeiro dia)
        }
        p.lastLoginDay = today;

        const bonusGold = 10 * p.loginStreak;
        p.gold += bonusGold;
        p.stats.goldEarned += bonusGold;

        let extra = '';
        if (p.loginStreak % 7 === 0) {
            const item = createItem(p.lvl);
            if (addToInventory(item)) extra = `\nBónus de 7 dias: ganhaste ${item.name}!`;
        }
        showNotice("Login Diário!", `Sequência: ${p.loginStreak} dia(s)\n+${bonusGold} Ouro${extra}`, updateUI);
        save();
    }

    // Dá uma pequena recompensa proporcional ao tempo que estiveste fora, até um máximo de 8h.
    function checkOfflineGains() {
        if (!p.lastActiveAt) return false;
        const awayMs = Date.now() - p.lastActiveAt;
        const awayMin = Math.min(OFFLINE_GOLD_CAP_MIN, Math.floor(awayMs / 60000));
        if (awayMin < 2) return false; // não vale a pena mostrar nada para ausências curtas

        const rate = 2 + p.lvl * 0.5;
        const gold = Math.floor(awayMin * rate * getPrestigeMultiplier());
        if (gold <= 0) return false;
        p.gold += gold;
        p.stats.goldEarned += gold;

        const hrs = Math.floor(awayMin / 60), mins = awayMin % 60;
        const timeStr = hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;
        showNotice("Bem-vindo de volta!", `Estiveste fora ${timeStr}.\nOs teus aventureiros de retaguarda renderam +${gold} Ouro.`, () => { updateUI(); checkDailyLogin(); });
        save();
        return true;
    }

    // Carrega um personagem existente e torna-o o ativo. Chamada ao clicar num cartão no ecrã de seleção.
    function loadCharacter(id) {
        const raw = localStorage.getItem(charStorageKey(id));
        if (!raw) return;
        try {
            p = JSON.parse(raw);
        } catch (e) {
            log("Save deste personagem está corrompido.", "var(--btn-red)");
            return;
        }
        activeCharId = id;
        localStorage.setItem('heroQuestActiveChar', id);
        migrateSave();
        closeCharSelect(true);

        if (p.class) {
            document.getElementById('class-selection').style.display = 'none';
            if (!p.currentQuests || p.currentQuests.length === 0) generateNewQuests();
            if (!p.shopItems || p.shopItems.length === 0) refreshShop();
            updateUI();
            const showedOffline = checkOfflineGains();
            if (!showedOffline) checkDailyLogin();
        } else {
            document.getElementById('class-selection').style.display = 'flex';
        }
    }

    // Cria um personagem novo com o nome escrito no ecrã de seleção e entra logo na escolha de classe.
    function createNewCharacter() {
        const input = document.getElementById('new-char-name');
        const name = input.value.trim();
        if (!name) { log("Dá um nome ao personagem antes de criar.", "var(--btn-red)"); return; }
        const list = getCharList();
        if (list.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            log("Já existe um personagem com esse nome.", "var(--btn-red)");
            return;
        }
        const id = 'char_' + Date.now() + Math.floor(Math.random() * 1000);
        list.push({ id, name, createdAt: Date.now() });
        saveCharList(list);

        p = defaultCharacterState();
        activeCharId = id;
        localStorage.setItem('heroQuestActiveChar', id);
        save();
        input.value = '';
        closeCharSelect(true);
        document.getElementById('class-selection').style.display = 'flex';
    }

    function deleteCharacter(id, name) {
        showConfirm(`Apagar "${name}"? Perdes todo o progresso deste personagem.`, () => {
            localStorage.removeItem(charStorageKey(id));
            saveCharList(getCharList().filter(c => c.id !== id));
            if (activeCharId === id) {
                activeCharId = null;
                localStorage.removeItem('heroQuestActiveChar');
            }
            renderCharList();
        });
    }

    function renderCharList() {
        const list = getCharList();
        const container = document.getElementById('char-list');
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center;">Ainda não tens personagens. Cria um abaixo.</p>';
            return;
        }
        list.forEach(c => {
            let info = 'Por escolher classe';
            try {
                const raw = localStorage.getItem(charStorageKey(c.id));
                if (raw) {
                    const cp = JSON.parse(raw);
                    if (cp.class) info = `${cp.class} · Nível ${cp.lvl}`;
                }
            } catch (e) { /* ignora saves ilegíveis na pré-visualização */ }

            const div = document.createElement('div');
            div.className = 'char-card';
            div.innerHTML = `<div><b>${c.name}</b><br><small style="color:#aaa;">${info}</small></div>`;
            const delBtn = document.createElement('button');
            delBtn.className = 'char-del';
            delBtn.innerText = 'Apagar';
            delBtn.onclick = (e) => { e.stopPropagation(); deleteCharacter(c.id, c.name); };
            div.appendChild(delBtn);
            div.onclick = () => loadCharacter(c.id);
            container.appendChild(div);
        });
    }

    // Abre o ecrã de seleção de personagens, guardando primeiro o progresso do personagem atual (se houver)
    function openCharSelect() {
        if (activeCharId && p.class) save();
        renderCharList();
        document.getElementById('char-select-screen').classList.add('visible');
        document.getElementById('btn-close-char-select').style.display = activeCharId ? 'inline-block' : 'none';
    }

    // force=true permite fechar mesmo vindo de dentro do próprio fluxo de troca (após escolher/criar)
    function closeCharSelect(force) {
        if (!activeCharId && !force) return; // não deixa fechar sem nenhum personagem escolhido
        document.getElementById('char-select-screen').classList.remove('visible');
    }

    function initClass(className) {
        p.class = className;
        if (className === 'Guerreiro') { p.maxHp = 150; p.str = 15; }
        else if (className === 'Assassino') { p.maxHp = 100; p.dex = 15; }
        else if (className === 'Mago') { p.maxHp = 70; p.int = 20; }
        p.hp = p.maxHp;
        document.getElementById('class-selection').style.display = 'none';
        generateNewQuests();
        refreshShop();
        updateUI();
        checkDailyLogin(); // marca o primeiro dia da sequência
    }

    function getTotalAttr(type) {
        let base = (type === 'vit') ? p.maxHp : (p[type] || 0);

        base += getAchievementBonus(); // bónus permanente de conquistas, igual em todos os atributos

        Object.values(p.equip).forEach(item => {
            if (item && item.bonuses && item.bonuses[type]) {
                base += item.bonuses[type];
            }
        });

        if (type === 'vit') {
            base = Math.round(base * (1 + getPericiaPercent('vitalidade_extra') / 100));
        }

        return base;
    }

    function resetGame() {
        if (!activeCharId) return;
        showConfirm("Reset? Vais perder todo o progresso deste personagem (os outros personagens não são afetados).", () => {
            localStorage.removeItem(charStorageKey(activeCharId));
            saveCharList(getCharList().filter(c => c.id !== activeCharId));
            localStorage.removeItem('heroQuestActiveChar');
            location.reload();
        });
    }

    function exportSave() {
        const dataStr = JSON.stringify(p, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hero-quest-save-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log("Save exportado!", "var(--accent)");
    }

    function importSaveFile(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!imported || typeof imported !== 'object' || !imported.class) {
                    throw new Error('Ficheiro inválido');
                }
                showConfirm("Importar este save vai substituir o progresso do personagem atual. Continuar?", () => {
                    p = imported;
                    migrateSave();
                    document.getElementById('class-selection').style.display = 'none';
                    if (!p.currentQuests || p.currentQuests.length === 0) generateNewQuests();
                    if (!p.shopItems || p.shopItems.length === 0) refreshShop();
                    save();
                    updateUI();
                    log("Save importado com sucesso!", "var(--accent)");
                });
            } catch (err) {
                log("Ficheiro de save inválido.", "var(--btn-red)");
            }
            input.value = '';
        };
        reader.readAsText(file);
    }