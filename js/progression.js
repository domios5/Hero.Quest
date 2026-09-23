// js/progression.js — Progressão do personagem: compra de atributos com Ouro, Perícias (pontos de nível), level up, Prestígio, Habilidade de classe.


    // Sorte dá hipótese de crítico (até 40%, a todas as classes) e Destreza dá hipótese de esquiva
    // (até 20%, a todas as classes) só com base nas stats normais — combinam-se com Talentos e
    // Perícias pela fórmula de hipóteses independentes (1 - (1-A)*(1-B)), nunca as substituem.
    function getLuckCritChance() { return Math.min(40, getTotalAttr('luk') * 0.5) / 100; }
    function getDexDodgeChance() { return Math.min(20, getTotalAttr('dex') * 0.25) / 100; }

    function getTotalCritChance() {
        return 1 - (1 - getTalentCritChance()) * (1 - getLuckCritChance());
    }
    // Multiplicador do crítico: se tiveres o talento Golpe Crítico mantém a escala atual (x2/x2.5
    // especializado); se o crítico só vier da Sorte, é um x1.5 mais modesto.
    function getEffectiveCritMult() {
        return hasTalent('golpe_critico') ? getTalentCritMult() : 1.5;
    }

    // --- Compra de Atributos com Ouro ---
    // Cada compra aumenta o mesmo que antes (+2 no atributo, ou +20 HP máx para Vida), mas agora
    // custa Ouro em vez de Pontos, com custo a crescer exponencialmente por compra desse atributo
    // neste personagem: 25 * 1.15^n (n = nº de vezes já comprado).
    function getAttrCost(type) {
        const n = (p.attrPurchases && p.attrPurchases[type]) || 0;
        return Math.round(25 * Math.pow(1.15, n));
    }
    function buyAttr(type) {
        const cost = getAttrCost(type);
        if (p.gold < cost) { log(`Precisas de ${cost} Ouro para aumentar ${attrNames[type]}.`, "var(--btn-red)"); return; }
        p.gold -= cost;
        p.attrPurchases[type] = (p.attrPurchases[type] || 0) + 1;
        if (type === 'vit') { p.maxHp += 20; p.hp += 20; } else p[type] += 2;
        sfxClick();
        updateUI();
    }

    // --- Perícias (Pontos de Perícia, ganhos ao subir de nível) ---
    // Sistema de 9 perícias passivas, cada uma com um limite de pontos investidos e um efeito por
    // ponto. Guardadas em p.pericias = { chave: pontosInvestidos }. A maioria tem efeito percentual
    // (flat: false/omitido); "Mochila Expandida" é uma exceção com efeito plano (+N slots, sem %).
    const PERICIAS = {
        vitalidade_extra:  { name: 'Vitalidade Extra',      icon: '❤️', desc: '+1% de HP máximo por ponto',              perPoint: 1,   max: 20 },
        poder_ofensivo:    { name: 'Poder Ofensivo',        icon: '⚔️', desc: '+1% de dano em combate por ponto',        perPoint: 1,   max: 20 },
        fortitude:         { name: 'Fortitude',             icon: '🛡️', desc: '-1% de dano recebido por ponto',          perPoint: 1,   max: 20 },
        regeneracao_rapida:{ name: 'Regeneração Rápida',    icon: '⏱️', desc: '-1% de duração das missões por ponto',    perPoint: 1,   max: 20 },
        fortuna:           { name: 'Fortuna',               icon: '🍀', desc: '+1% de Ouro ganho por ponto',             perPoint: 1,   max: 20 },
        sabedoria:         { name: 'Sabedoria',             icon: '📚', desc: '+1% de XP ganho por ponto',               perPoint: 1,   max: 20 },
        instinto_saque:    { name: 'Instinto de Saque',     icon: '🎯', desc: '+0.5% de hipótese de loot por ponto',     perPoint: 0.5, max: 20 },
        reflexos:          { name: 'Reflexos',              icon: '💨', desc: '+0.75% de hipótese de esquiva por ponto', perPoint: 0.75, max: 20 },
        mochila_expandida: { name: 'Mochila Expandida',     icon: '🎒', desc: '+1 slot de mochila por ponto',            perPoint: 1,   max: 10, flat: true, unit: ' slots' }
    };

    function getPericiaPoints(key) { return (p.pericias && p.pericias[key]) || 0; }
    function getPericiaPercent(key) {
        const info = PERICIAS[key];
        if (!info) return 0;
        return getPericiaPoints(key) * info.perPoint;
    }
    // Bónus plano da Perícia Mochila Expandida (não é percentual, é aplicado diretamente à capacidade)
    function getPericiaBackpackSlots() { return getPericiaPoints('mochila_expandida') * (PERICIAS.mochila_expandida.perPoint || 1); }
    function addPericia(key) {
        const info = PERICIAS[key];
        if (!info) return;
        if (p.points <= 0) { log("Não tens Pontos de Perícia disponíveis.", "var(--btn-red)"); return; }
        const cur = getPericiaPoints(key);
        if (cur >= info.max) { log(`${info.name} já está no máximo.`, "var(--btn-red)"); return; }
        p.points--;
        p.pericias[key] = cur + 1;
        sfxClick();
        updateUI();
    }

    // Multiplicadores/derivados de cada perícia, combinados multiplicativamente com Talentos e Companion
    function getPericiaDamageMultiplier() { return 1 + getPericiaPercent('poder_ofensivo') / 100; }
    function getPericiaDefenseMultiplier() { return 1 - getPericiaPercent('fortitude') / 100; } // multiplica o dano RECEBIDO
    function getPericiaDurationMultiplier() { return 1 - getPericiaPercent('regeneracao_rapida') / 100; }
    function getPericiaGoldMultiplier() { return 1 + getPericiaPercent('fortuna') / 100; }
    function getPericiaXpMultiplier() { return 1 + getPericiaPercent('sabedoria') / 100; }
    function getPericiaLootBonus() { return getPericiaPercent('instinto_saque') / 100; } // somado diretamente à hipótese de loot
    function getPericiaDodgeBonus() { return getPericiaPercent('reflexos') / 100; }

    // Combina a esquiva de Talentos (Passos Silenciosos) com a de Perícias (Reflexos) como duas
    // hipóteses independentes: P(esquiva) = 1 - (1-A)*(1-B)
    function getTotalDodgeChance() {
        return 1 - (1 - getTalentDodgeChance()) * (1 - getPericiaDodgeBonus()) * (1 - getDexDodgeChance());
    }

    function renderPericiasBox() {
        const box = document.getElementById('pericias-box');
        if (!box) return;
        let html = `<p style="font-size:0.8em; color:#aaa; margin:0 0 8px 0;">Pontos de Perícia disponíveis: <b style="color:var(--gold);">${p.points}</b></p>`;
        Object.keys(PERICIAS).forEach(key => {
            const info = PERICIAS[key];
            const cur = getPericiaPoints(key);
            const atMax = cur >= info.max;
            const canBuy = p.points > 0 && !atMax;
            const val = (cur * info.perPoint);
            const valTxt = (Math.round(val * 100) / 100).toString();
            const suffix = info.flat ? (info.unit || '') : '%';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; background:#3a3a3a; padding:6px 10px; border-radius:4px;">
                <span title="${info.desc}">${info.icon} ${info.name}: <b>${cur}/${info.max}</b> <small style="color:#8f8;">(${info.flat ? '+' : ''}${valTxt}${suffix})</small></span>
                <button onclick="addPericia('${key}')" ${canBuy ? '' : 'disabled'} style="width:28px; height:28px; background:${canBuy ? '#4caf50' : '#666'}; color:white; border:none; cursor:${canBuy ? 'pointer' : 'not-allowed'}; border-radius:50%; font-weight:bold;">+</button>
            </div>`;
        });
        box.innerHTML = html;
    }

    function getPrestigeMultiplier() { return 1 + p.prestige * 0.05; }

    // --- Loja/Árvore de Prestígio (Pontos de Prestígio, 1 ganho a cada Prestígio) ---
    // Perks propositadamente à parte de dano/atributos (isso já é o papel de Talentos/Perícias),
    // para dar utilidade ao Prestígio a longo prazo sem inflacionar o poder de combate.
    const PRESTIGE_PERKS = {
        tenacidade: { name: 'Tenacidade',         icon: '💪', desc: '+1 tentativa base contra o Boss por ponto',        perPoint: 1, max: 3,  flat: true, unit: ' tentativas' },
        cacador:    { name: 'Caçador Incansável', icon: '⏳', desc: '-2% no tempo de reaparecimento do Boss por ponto', perPoint: 2, max: 10 },
        barganha:   { name: 'Barganha Eterna',    icon: '💰', desc: '-3% no preço dos itens da Loja por ponto',        perPoint: 3, max: 10 },
        bolso:      { name: 'Bolso Dimensional',  icon: '🎒', desc: '+1 slot de mochila por ponto',                    perPoint: 1, max: 10, flat: true, unit: ' slots' }
    };

    function getPrestigePerkPoints(key) { return (p.prestigePerks && p.prestigePerks[key]) || 0; }
    function getPrestigePerkPercent(key) {
        const info = PRESTIGE_PERKS[key];
        if (!info) return 0;
        return getPrestigePerkPoints(key) * info.perPoint;
    }
    function addPrestigePerk(key) {
        const info = PRESTIGE_PERKS[key];
        if (!info) return;
        if ((p.prestigePoints || 0) <= 0) { log("Não tens Pontos de Prestígio disponíveis.", "var(--btn-red)"); return; }
        const cur = getPrestigePerkPoints(key);
        if (cur >= info.max) { log(`${info.name} já está no máximo.`, "var(--btn-red)"); return; }
        p.prestigePoints--;
        p.prestigePerks[key] = cur + 1;
        sfxClick();
        updateUI();
    }

    function getPrestigePerkBossAttempts() { return getPrestigePerkPoints('tenacidade') * (PRESTIGE_PERKS.tenacidade.perPoint || 1); }
    function getPrestigePerkBossCooldownMultiplier() { return 1 - getPrestigePerkPercent('cacador') / 100; }
    function getPrestigePerkShopDiscount() { return 1 - getPrestigePerkPercent('barganha') / 100; }
    function getPrestigePerkBackpackSlots() { return getPrestigePerkPoints('bolso') * (PRESTIGE_PERKS.bolso.perPoint || 1); }

    function renderPrestigeShopBox() {
        const box = document.getElementById('prestige-shop-box');
        if (!box) return;
        let html = `<p style="font-size:0.8em; color:#aaa; margin:0 0 8px 0;">Pontos de Prestígio disponíveis: <b style="color:var(--gold);">${p.prestigePoints || 0}</b></p>`;
        Object.keys(PRESTIGE_PERKS).forEach(key => {
            const info = PRESTIGE_PERKS[key];
            const cur = getPrestigePerkPoints(key);
            const atMax = cur >= info.max;
            const canBuy = (p.prestigePoints || 0) > 0 && !atMax;
            const val = (cur * info.perPoint);
            const valTxt = (Math.round(val * 100) / 100).toString();
            const suffix = info.flat ? (info.unit || '') : '%';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; background:#3a3a3a; padding:6px 10px; border-radius:4px;">
                <span title="${info.desc}">${info.icon} ${info.name}: <b>${cur}/${info.max}</b> <small style="color:#8f8;">(${info.flat ? '+' : '-'}${valTxt}${suffix})</small></span>
                <button onclick="addPrestigePerk('${key}')" ${canBuy ? '' : 'disabled'} style="width:28px; height:28px; background:${canBuy ? '#4caf50' : '#666'}; color:white; border:none; cursor:${canBuy ? 'pointer' : 'not-allowed'}; border-radius:50%; font-weight:bold;">+</button>
            </div>`;
        });
        box.innerHTML = html;
    }

    function doPrestige() {
        if (p.lvl < PRESTIGE_LEVEL_REQ) return;
        showConfirm(`Fazer Prestígio? Perdes nível, XP, Ouro e atributos base, mas ganhas +5% de Ouro/XP permanente (atual: +${p.prestige * 5}% -> +${(p.prestige + 1) * 5}%) e +1 Ponto de Prestígio para a Loja de Prestígio. Equipamento e mochila mantêm-se.`, () => {
            p.prestige++;
            p.prestigePoints = (p.prestigePoints || 0) + 1;
            const cls = p.class;
            p.lvl = 1; p.xp = 0; p.nextLvl = 100; p.points = 0; p.gold = 50; p.arenaRank = 1;
            p.str = 5; p.dex = 5; p.int = 5; p.luk = 1;
            p.attrPurchases = { str: 0, vit: 0, dex: 0, int: 0, luk: 0 }; // custo de compra de atributos volta ao início, já que os atributos base foram reiniciados
            if (cls === 'Guerreiro') { p.maxHp = 150; p.str = 15; }
            else if (cls === 'Assassino') { p.maxHp = 100; p.dex = 15; }
            else if (cls === 'Mago') { p.maxHp = 70; p.int = 20; }
            p.hp = p.maxHp;
            // Limpa qualquer luta em curso (para não ficares preso contra um Boss antigo com atributos reiniciados),
            // mas NÃO reinicia o nextSpawn: o cooldown de 3 dias do World Boss continua a contar através do Prestígio,
            // para o Prestígio não poder ser usado para gerar Bosses grátis e sem espera.
            p.boss.hp = 0; p.boss.maxHp = 0; p.boss.dmg = 0; p.boss.attempts = 5; p.boss.active = false; p.boss.depletedAt = 0;

            log(`PRESTÍGIO! Agora tens +${p.prestige * 5}% de Ouro e XP para sempre.`, "var(--gold)");
            generateNewQuests();
            refreshShop();
            updateUI();
        });
    }

    // Duração efetiva da recarga, já com o desconto da Resistência Inabalável (Guerreiro)
    function getEffectiveAbilityCooldown() {
        const ab = ABILITIES[p.class];
        return ab ? Math.floor(ab.cooldown * getTalentAbilityCooldownMult()) : 0;
    }

    function useAbility() {
        const ab = ABILITIES[p.class];
        if (!ab) return;
        const now = Date.now();
        const remain = (p.ability.lastUsed + getEffectiveAbilityCooldown()) - now;
        if (remain > 0) { log(`Habilidade ainda em recarga (${Math.ceil(remain / 1000)}s).`, "var(--btn-red)"); return; }

        if (p.class === 'Guerreiro') {
            let heal = Math.floor(getTotalAttr('vit') * 0.5);
            if (hasTalent('resistencia_inabalavel') && isTalentSpecialized()) heal *= 2;
            p.hp = Math.min(getTotalAttr('vit'), p.hp + heal);
            log(`${ab.name}! Recuperaste ${heal} de HP.`, "var(--accent)");
        } else if (p.class === 'Assassino') {
            const g = p.lvl * 5;
            p.gold += g;
            log(`${ab.name}! Ganhaste ${g} de Ouro.`, "var(--accent)");
        } else if (p.class === 'Mago') {
            const x = p.lvl * 5;
            p.xp += x;
            checkLvl();
            log(`${ab.name}! Ganhaste ${x} de XP.`, "var(--accent)");
        }
        p.ability.lastUsed = now;
        updateUI();
    }

    function doLevelUp() {
        p.lvl++; p.xp -= p.nextLvl; if (p.xp < 0) p.xp = 0;
        p.nextLvl = Math.floor(p.nextLvl * 1.5); p.points += 5; p.hp = getTotalAttr('vit');
        log("LEVEL UP!"); sfxLevelUp();
    }
    function checkLvl() {
        if (p.xp < p.nextLvl) return;
        doLevelUp();
        // Talento: Sabedoria Ancestral especializada tem hipótese de dar um nível extra "de borla"
        if (hasTalent('sabedoria_ancestral') && isTalentSpecialized() && Math.random() < 0.10) {
            log("Sabedoria Ancestral: um lampejo de clareza dá-te um nível extra!", "var(--gold)");
            doLevelUp();
        }
    }