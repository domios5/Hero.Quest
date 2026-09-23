// js/combat.js — Combate: cálculo de atributos totais em combate, Arena e World Boss.


    function checkBossSpawn() {
        const agora = Date.now();
        if (p.lvl < 2) return; // Boss só aparece depois do 1º level up, para não confundir no início
        if (!p.boss.active && agora >= p.boss.nextSpawn) {
            // Criar novo Boss baseado no nível do jogador
            p.boss.maxHp = p.lvl * 1000;
            p.boss.hp = p.boss.maxHp;
            p.boss.dmg = p.lvl * 15; // Dano do boss escala com o nível DELE, não com a tua vida
            p.boss.attempts = 5;
            p.boss.active = true;
            p.boss.depletedAt = 0;
            p.boss.shieldHitsUsed = 0; // reinicia o Escudo Arcano (Mago) para esta nova aparição
            log("UM BOSS MÍTICO APARECEU!", "var(--gold)");
        }
    }

    // Se ficares sem tentativas e não pagares por mais, o boss não fica preso para sempre:
    // foge ao fim de 1h e volta a contar os 3 dias normais para o próximo aparecer.
    function checkBossFlee() {
        if (p.boss.active && p.boss.attempts <= 0 && p.boss.depletedAt) {
            if (Date.now() - p.boss.depletedAt >= BOSS_FLEE_TIME) {
                p.boss.active = false;
                p.boss.depletedAt = 0;
                p.boss.nextSpawn = Date.now() + (3 * 24 * 60 * 60 * 1000);
                log("O Boss fugiu enquanto recuperavas forças! Vai demorar a aparecer outro.", "var(--btn-red)");
            }
        }
    }

    function getBossAttemptCost() { return p.lvl * 15; }

    function buyBossAttempt() {
        if (!p.boss.active) return;
        const cost = getBossAttemptCost();
        if (p.gold < cost) { log(`Precisas de ${cost} Ouro para uma tentativa extra.`, "var(--btn-red)"); return; }
        showConfirm(`Comprar 1 tentativa extra contra o Boss por ${cost} Ouro?`, () => {
            p.gold -= cost;
            p.boss.attempts++;
            p.boss.depletedAt = 0; // já não está "sem tentativas", para parar a contagem de fuga
            log("Compraste uma tentativa extra contra o Boss!", "var(--accent)");
            updateUI();
        });
    }

    function attackBoss() {
        // 1. Verificações básicas
        if (!p.boss.active || p.boss.attempts <= 0) return;
        if (p.hp <= 1) {
            log("Estás demasiado fraco para enfrentar o Boss! Cura-te primeiro.", "var(--btn-red)");
            return;
        }

        // 2. Calcular Dano do Jogador
        let dmgAttr = p.class === 'Guerreiro' ? 'str' : p.class === 'Assassino' ? 'dex' : 'int';
        let playerDamage = getTotalAttr(dmgAttr) * 5;
        if (p.buffs.dmgBoostNext) {
            playerDamage = Math.floor(playerDamage * 1.5);
            p.buffs.dmgBoostNext = false;
            log("Elixir de Fúria ativo! +50% de dano.", "var(--accent)");
        }

        // Talentos: dano ofensivo (Fúria Implacável / Sobrecarga Arcana)
        playerDamage = Math.floor(playerDamage * getTalentDamageMultiplier());
        // Perícias: Poder Ofensivo, e Companion: Lobo de Batalha
        playerDamage = Math.floor(playerDamage * getPericiaDamageMultiplier() * getCompanionDamageMultiplier());
        // Crítico: Talento Golpe Crítico + hipótese base da Sorte
        const isCrit = Math.random() < getTotalCritChance();
        if (isCrit) {
            playerDamage = Math.floor(playerDamage * getEffectiveCritMult());
            log("Golpe Crítico!", "var(--gold)");
        }

        // 3. Calcular Dano do Boss (O contra-ataque)
        // O dano do Boss é fixo por combate (definido quando ele nasce) e escala com o nível DELE,
        // não com a tua vida/equipamento — antes, ter mais vida fazia o boss bater mais forte.
        let bossDamage = p.boss.dmg || (p.lvl * 15);

        // Talentos: dano recebido reduzido (Muralha de Aço)
        bossDamage = Math.floor(bossDamage * getTalentDefenseMultiplier());
        // Perícias: Fortitude, e Companion: Tartaruga Guardiã
        bossDamage = Math.max(0, Math.floor(bossDamage * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier()));

        // Talentos: Escudo Arcano — absorve os primeiros N ataques do Boss em cada aparição
        const shieldHits = getTalentShieldHits();
        let shieldBlocked = false;
        if (shieldHits > 0 && (p.boss.shieldHitsUsed || 0) < shieldHits) {
            p.boss.shieldHitsUsed = (p.boss.shieldHitsUsed || 0) + 1;
            bossDamage = 0;
            shieldBlocked = true;
        }

        // Talentos: esquiva total ao contra-ataque (Passos Silenciosos)
        let dodged = false;
        if (!shieldBlocked && Math.random() < getTotalDodgeChance()) {
            bossDamage = 0;
            dodged = true;
        }

        // Talentos: custo de vida da Sobrecarga Arcana
        const arcaneSelfDmg = getTalentArcaneSelfDamage();

        // Aplicar danos
        p.boss.hp -= playerDamage;
        p.hp -= bossDamage;
        if (arcaneSelfDmg > 0) p.hp -= arcaneSelfDmg;
        p.boss.attempts--;
        flashDamage();

        log(`Ataque feroz! Causaste ${playerDamage} de dano.`, "var(--accent)");
        if (shieldBlocked) log("O Escudo Arcano absorveu o contra-ataque do Boss!", "var(--accent)");
        else if (dodged) log("Esquivaste-te do contra-ataque do Boss!", "var(--accent)");
        else log(`O Boss contra-atacou! Perdeste ${bossDamage} de HP.`, "var(--btn-red)");

        // Talentos: lifesteal da Fúria Implacável especializada
        if (hasTalent('furia_implacavel') && isTalentSpecialized() && playerDamage > 0 && p.hp > 0) {
            const heal = Math.floor(playerDamage * 0.05);
            if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`Fúria Implacável drena ${heal} HP do Boss!`, "var(--accent)"); }
        }

        // 4. Verificação de Morte do Jogador
        if (p.hp <= 0) {
            p.hp = 1; // Deixa com 1 de HP para não quebrar o jogo
            log("Foste nocauteado pelo Boss! Recupera as tuas forças.", "var(--btn-red)");
        }

        // 4b. Se as tentativas chegaram a 0 e o boss continua vivo, começa a contagem para ele fugir
        if (p.boss.attempts <= 0 && p.boss.hp > 0 && !p.boss.depletedAt) {
            p.boss.depletedAt = Date.now();
        }

        // 5. Verificação de Vitória (Se o Boss morreu)
        if (p.boss.hp <= 0) {
            p.boss.hp = 0;
            p.boss.active = false;
            p.boss.depletedAt = 0;
            p.boss.nextSpawn = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 dias

            // Recompensas (com multiplicador de Prestígio, Talento, Perícias e Companion)
            const gEarn = Math.floor(p.lvl * 500 * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier());
            const xEarn = Math.floor(p.lvl * 1000 * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier());
            p.gold += gEarn; p.xp += xEarn;
            p.stats.goldEarned += gEarn; p.stats.xpEarned += xEarn;
            addCompanionXp(xEarn);
            p.stats.bossesKilled++;

            // Gera o item Mítico (agora sempre com os 5 atributos, não só o rótulo trocado)
            const itemMitico = createMythicItem(p.lvl);
            const coube = addToInventory(itemMitico);
            if (coube) p.stats.itemsFound++;

            log("VITÓRIA LENDÁRIA! O Boss caiu e deixou um rasto de ouro" + (coube ? " e um item Mítico!" : "!"), "var(--gold)");
            sfxVictory();
            checkLvl();
        }

        updateUI(); // Atualiza as barras de vida e textos
    }

    function fightArena() {
        const enemyName = ARENA_ENEMIES[Math.floor(Math.random() * ARENA_ENEMIES.length)];
        let bHp = p.arenaRank * 70, bDmg = p.arenaRank * 12;
        let pDmg = getTotalAttr(p.class === 'Guerreiro' ? 'str' : p.class === 'Assassino' ? 'dex' : 'int');
        if (p.buffs.dmgBoostNext) {
            pDmg = Math.floor(pDmg * 1.5);
            p.buffs.dmgBoostNext = false;
            log("Elixir de Fúria ativo! +50% de dano.", "var(--accent)");
        }

        // Talentos: dano ofensivo (Fúria Implacável / Sobrecarga Arcana)
        pDmg = Math.floor(pDmg * getTalentDamageMultiplier());
        // Perícias: Poder Ofensivo, e Companion: Lobo de Batalha
        pDmg = Math.floor(pDmg * getPericiaDamageMultiplier() * getCompanionDamageMultiplier());
        // Crítico: Talento Golpe Crítico + hipótese base da Sorte
        if (Math.random() < getTotalCritChance()) {
            pDmg = Math.floor(pDmg * getEffectiveCritMult());
            log("Golpe Crítico!", "var(--gold)");
        }
        // Talentos: dano recebido reduzido (Muralha de Aço); Perícias: Fortitude; Companion: Tartaruga Guardiã
        bDmg = Math.max(0, Math.floor(bDmg * getTalentDefenseMultiplier() * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier()));
        // Talentos: esquiva total ao contra-ataque (Passos Silenciosos), + Perícias: Reflexos
        if (Math.random() < getTotalDodgeChance()) {
            bDmg = 0;
            log("Esquivaste-te de todos os contra-ataques!", "var(--accent)");
        }
        // Talentos: custo de vida da Sobrecarga Arcana
        const arcaneSelfDmg = getTalentArcaneSelfDamage();
        if (arcaneSelfDmg > 0) { p.hp -= arcaneSelfDmg; if (p.hp < 1) p.hp = 1; }

        log(`A enfrentar ${enemyName} (Rank ${p.arenaRank})...`);
        let totalDealt = 0;
        while (p.hp > 0 && bHp > 0) { bHp -= pDmg; totalDealt += pDmg; if (bHp > 0) p.hp -= bDmg; }

        // Talentos: lifesteal da Fúria Implacável especializada
        if (hasTalent('furia_implacavel') && isTalentSpecialized() && totalDealt > 0 && p.hp > 0) {
            const heal = Math.floor(totalDealt * 0.05);
            if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`Fúria Implacável drena ${heal} HP do inimigo!`, "var(--accent)"); }
        }

        if (bHp <= 0) {
            log(`VITÓRIA contra ${enemyName}!`);
            const gEarn = Math.floor(p.arenaRank * 100 * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier());
            const xEarn = Math.floor(p.arenaRank * 50 * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier());
            p.gold += gEarn; p.xp += xEarn;
            p.stats.goldEarned += gEarn; p.stats.xpEarned += xEarn;
            addCompanionXp(xEarn);
            p.stats.arenaWins++;
            p.arenaRank++; checkLvl();
            sfxVictory();
        }
        else { p.hp = 1; flashDamage(); log(`DERROTA contra ${enemyName}!`); sfxDefeat(); }
        updateUI();
    }