// js/ui.js — Renderização de UI: updateUI() e funções de apoio (log, tabs, flash de dano, timers).


    function flashDamage() {
        const box = document.querySelector('.stats-grid');
        if (!box) return;
        box.classList.remove('flash-dmg');
        void box.offsetWidth; // reinicia a animação mesmo em danos seguidos
        box.classList.add('flash-dmg');
    }

    // Atualização "leve" das barras de vida durante uma animação de combate (Arena/Boss): só toca
    // no que muda turno a turno, sem re-renderizar a mochila/conquistas/etc. nem gravar o save —
    // isso só acontece uma vez, no updateUI() completo chamado no fim do combate.
    function updateCombatBars() {
        const maxHpVal = getTotalAttr('vit') || 1;
        const hpShown = Math.max(0, p.hp);
        document.getElementById('hp-cur').innerText = Math.floor(hpShown);
        const pct = Math.max(0, Math.min(100, (hpShown / maxHpVal) * 100));
        const hpBar = document.getElementById('hp-bar-inner');
        hpBar.style.width = pct + '%';
        hpBar.style.background = pct > 50 ? '#4caf50' : (pct > 20 ? '#e6b800' : '#c0392b');

        if (p.boss.active) {
            document.getElementById('boss-hp-val').innerText = Math.max(0, p.boss.hp);
            document.getElementById('boss-hp-max').innerText = p.boss.maxHp;
            document.getElementById('boss-hp-bar').style.width = Math.max(0, (p.boss.hp / p.boss.maxHp) * 100) + '%';
        }
        if (arenaEnemyState) {
            document.getElementById('arena-enemy-name').innerText = arenaEnemyState.name;
            document.getElementById('arena-enemy-hp-val').innerText = Math.max(0, arenaEnemyState.hp);
            document.getElementById('arena-enemy-hp-max').innerText = arenaEnemyState.maxHp;
            document.getElementById('arena-enemy-hp-bar').style.width = Math.max(0, (arenaEnemyState.hp / arenaEnemyState.maxHp) * 100) + '%';
        }
    }

    // Resumo agregado de todos os bónus atuais (Talento + Perícias + Companion + Prestígio), para
    // o jogador não ter de somar tudo de cabeça. Usa exatamente as mesmas funções multiplicadoras
    // já aplicadas no combate/economia, só que aqui só para apresentação.
    function renderBonusSummary() {
        const box = document.getElementById('bonus-summary-box');
        if (!box) return;

        const dmgPct = Math.round((getTalentDamageMultiplier() * getPericiaDamageMultiplier() * getCompanionDamageMultiplier() * (1 + getUniqueDamagePercent() / 100) * (1 + getRunePercent('dano') / 100) - 1) * 100);
        const defPct = Math.round((1 - getTalentDefenseMultiplier() * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier()) * 100);
        const critChance = Math.round(getTotalCritChance() * 1000) / 10;
        const critMult = getEffectiveCritMult();
        const dodgeChance = Math.round(getTotalDodgeChance() * 1000) / 10;
        const goldPct = Math.round((getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier() * getRuneGoldMultiplier() - 1) * 100);
        const xpPct = Math.round((getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier() * getRuneXpMultiplier() - 1) * 100);
        const durationPct = Math.round((1 - getPericiaDurationMultiplier()) * 100);
        const lootPct = Math.round((getPericiaLootBonus() + getRuneLootBonus()) * 1000) / 10;

        const row = (label, val) => `<div class="stat-row"><span>${label}</span><b>${val}</b></div>`;

        box.innerHTML =
            row('Dano em combate', `+${dmgPct}%`) +
            row('Dano recebido', `-${defPct}%`) +
            row('Hipótese de crítico', `${critChance}% (x${critMult})`) +
            row('Hipótese de esquiva', `${dodgeChance}%`) +
            row('Ouro ganho (Arena/Boss)', `+${goldPct}%`) +
            row('XP ganho (Arena/Boss)', `+${xpPct}%`) +
            row('Duração das missões', `-${durationPct}%`) +
            row('Hipótese de loot extra', `+${lootPct}%`) +
            `<p style="font-size:0.7em; color:#888; margin:6px 0 0 0;">Nas missões, Ouro e XP ganham ainda um bónus extra da tua Destreza/Inteligência.</p>`;
    }

    function updateUI() {
        document.getElementById('display-class').innerText = p.class || "...";
        const headerImg = document.getElementById('header-class-img');
        const classImgSrc = CLASS_IMAGES[p.class];
        if (headerImg) { if (classImgSrc) { headerImg.src = classImgSrc; headerImg.style.display = 'inline-block'; } else { headerImg.style.display = 'none'; } }
        const charInfo = activeCharId ? (getCharList().find(c => c.id === activeCharId) || null) : null;
        document.getElementById('display-char-name').innerText = charInfo ? charInfo.name : '';
        document.getElementById('lvl').innerText = p.lvl;
        document.getElementById('gold').innerText = p.gold;
        document.getElementById('xp').innerText = p.xp;
        document.getElementById('nextLvl').innerText = p.nextLvl;
        document.getElementById('points').innerText = p.points;
        document.getElementById('hp-cur').innerText = Math.floor(p.hp);
        document.getElementById('hp-max').innerText = getTotalAttr('vit');
        document.getElementById('arena-rank').innerText = p.arenaRank;

        let dmgA = p.class === 'Guerreiro' ? 'str' : p.class === 'Assassino' ? 'dex' : 'int';
        document.getElementById('player-dmg-val').innerText = getTotalAttr(dmgA);

        const hpEl = document.getElementById('hp-cur');
        hpEl.innerText = Math.floor(p.hp);
        hpEl.style.color = p.hp <= 1 ? "var(--btn-red)" : "white"; // Fica vermelho se estiver a 1

        // Barra de HP colorida
        const maxHpVal = getTotalAttr('vit') || 1;
        const pct = Math.max(0, Math.min(100, (Math.max(0, p.hp) / maxHpVal) * 100));
        const hpBar = document.getElementById('hp-bar-inner');
        hpBar.style.width = pct + '%';
        hpBar.style.background = pct > 50 ? '#4caf50' : (pct > 20 ? '#e6b800' : '#c0392b');

        // Render Quests corrigido dentro da função updateUI
        const qB = document.getElementById('quest-board');
        qB.innerHTML = '';

        p.currentQuests.forEach((q, i) => {
            const isLowHP = p.hp <= 1; // Verifica se a vida está no limite
            const isLegendary = q.type === 'legendary';
            const tClass = q.type === 'gold' ? 'tag-gold' : q.type === 'xp' ? 'tag-xp' : isLegendary ? 'tag-legendary' : 'tag-bal';
            const tLabel = isLegendary ? 'lendária' : q.type;

            // Configuração do botão baseada no HP
            const btnStyle = isLowHP ? 'style="background:#555; cursor:not-allowed;"' : '';
            const btnText = isLowHP ? 'Ferido!' : 'Ir';

            const div = document.createElement('div');
            div.className = 'quest-card' + (isLegendary ? ' legendary' : '');
            div.innerHTML = `
                <span class="tag ${tClass}">${tLabel}</span><br>
                <b>${q.name}</b><br>
                <small>${getQuestFinalGold(q)} G | ${getQuestFinalXp(q)} XP</small>
                <button class="q-btn" onclick="startQuest(${i})" ${btnStyle}>
                    ${btnText}
                </button>`;

            qB.appendChild(div);
        });


        // Equipamento Atual (Slots)
        ['weapon', 'armor', 'amulet', 'ring', 'boots', 'cape'].forEach(slot => {
            const item = p.equip[slot];
            const el = document.getElementById('name-' + slot);
            const slotEl = document.getElementById('slot-' + slot);
            if (item) {
                let bTxt = "";
                for (let b in item.bonuses) bTxt += `+${item.bonuses[b]}${b.toUpperCase()} `;
                const uniqueTag = item.unique ? '✨ ' : '';
                const runeIcons = (item.runes || []).map(r => r ? `${RUNES[r.type].icon}+${r.level}` : '').filter(Boolean).join(' ');
                el.innerHTML = `<span style="color:${item.rarityColor}">${uniqueTag}${item.name}</span><br><small>${bTxt}</small>${runeIcons ? `<br><small style="color:#ffd700;">${runeIcons}</small>` : ''}`;
                if (slotEl) { slotEl.title = buildItemTooltip(item); slotEl.classList.toggle('unique-item', !!item.unique); }
            } else {
                el.innerText = "Vazio";
                if (slotEl) { slotEl.title = slotLabels[slot] + ": vazio (clica num item na mochila para equipar)"; slotEl.classList.remove('unique-item'); }
            }
        });

        // Habilidade
        const abInfo = ABILITIES[p.class];
        if (abInfo) document.getElementById('ability-desc').innerHTML = `<b>${abInfo.name}</b>: ${abInfo.desc}`;

        // Talento
        renderTalentBox();

        // Companion
        renderCompanionBox();

        // Perícias
        renderPericiasBox();

        // Runas: contadores de Pó de Runa e Pedras de Extração
        const duCount = document.getElementById('rune-dust-count');
        if (duCount) duCount.innerText = p.runeDust || 0;
        const esCount = document.getElementById('extraction-stone-count');
        if (esCount) esCount.innerText = p.extractionStones || 0;

        // Prestígio
        document.getElementById('prestige-lvl').innerText = p.prestige;
        document.getElementById('prestige-bonus').innerText = p.prestige * 5;
        const btnPrestige = document.getElementById('btn-prestige');
        btnPrestige.disabled = p.lvl < PRESTIGE_LEVEL_REQ;
        btnPrestige.innerText = p.lvl < PRESTIGE_LEVEL_REQ ? `Fazer Prestígio (requer Nível ${PRESTIGE_LEVEL_REQ})` : 'Fazer Prestígio';

        // Loja de Prestígio
        renderPrestigeShopBox();

        // Atributos
        const attrList = document.getElementById('attr-list'); attrList.innerHTML = '';

        const mainStatInfo = p.class === 'Guerreiro' ? 'Força' : p.class === 'Assassino' ? 'Destreza' : 'Inteligência';
        attrList.innerHTML = `<p style="font-size: 0.8em; color: #aaa; margin-bottom: 10px;">Dano principal: <b style="color: white;">${mainStatInfo}</b></p>`;

        ['str', 'vit', 'dex', 'int', 'luk'].forEach(a => {
            const row = document.createElement('div');
            row.className = "attr-row";
            row.style = "display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center; margin-bottom:8px; background:#444; padding:8px 10px; border-radius:4px;";
            const cost = getAttrCost(a);
            const canAfford = p.gold >= cost;
            row.innerHTML = `<span>${attrNames[a]}: <b>${getTotalAttr(a)}</b></span>
                 <button class="plus-btn" onmousedown="startHoldRepeat(() => buyAttr('${a}'))" ontouchstart="event.preventDefault(); startHoldRepeat(() => buyAttr('${a}'))" ${canAfford ? '' : 'disabled'} title="Comprar +${a === 'vit' ? '20 HP máx' : '2'}" style="min-width:56px; height:28px; background:${canAfford ? '#c98a00' : '#666'}; color:white; border:none; cursor:${canAfford ? 'pointer' : 'not-allowed'}; border-radius:4px; font-weight:bold; font-size:0.75em; padding:0 6px;">💰${cost}</button>`;
            attrList.appendChild(row);
        });

        // Capacidade da mochila (base + expansões compradas + Perícia Mochila Expandida)
        const capBox = document.getElementById('inv-capacity-box');
        if (capBox) {
            const capCost = getInvCapacityCost();
            const canAffordCap = p.gold >= capCost;
            capBox.innerHTML = `<div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center; background:#3a3a3a; padding:6px 10px; border-radius:4px;">
                <span>🎒 Capacidade: <b>${p.inv.length}/${getInvCapacity()}</b></span>
                <button onmousedown="startHoldRepeat(buyInvCapacity)" ontouchstart="event.preventDefault(); startHoldRepeat(buyInvCapacity)" ${canAffordCap ? '' : 'disabled'} style="width:auto; padding:4px 8px; font-size:0.75em; margin-top:0; background:${canAffordCap ? '#c98a00' : '#666'};">Expandir (+${INV_CAPACITY_PER_PURCHASE}) — 💰${capCost}</button>
            </div>`;
        }

        // Vender por raridade (venda em lote)
        renderSellRarityBox();

        // Inventário (com ordenação de exibição)
        const invL = document.getElementById('inventory-list'); invL.innerHTML = '';
        const order = getSortedInventoryIndices();
        for (let slotPos = 0; slotPos < getInvCapacity(); slotPos++) {
            const s = document.createElement('div'); s.className = 'slot';
            const realIdx = order[slotPos];
            const item = realIdx !== undefined ? p.inv[realIdx] : null;
            if (item && item.type === 'rune') {
                const def = RUNES[item.runeType];
                s.innerHTML = `<b style="color:#ffd700;">${def.icon} ${def.name}</b><br><small>${item.level > 0 ? `+${item.level} (guardada)` : 'por encaixar'}</small>`;
                s.title = `${def.name}\nEncaixa numa peça de equipamento (🔮 no separador Herói) para fazer efeito.\nValor: ${Math.round(def.base * 100) / 100}% a ${Math.round(def.max * 100) / 100}% (nível 0 a ${RUNE_MAX_LEVEL}).`;
                s.onclick = () => showActions(item, realIdx);
            } else if (item) {
                let bTxt = "";
                if (item.bonuses) for (let b in item.bonuses) bTxt += `+${item.bonuses[b]} `;
                const uniqueTag = item.unique ? '✨ ' : '';
                s.innerHTML = `<b style="color:${item.rarityColor || '#fff'}">${uniqueTag}${item.name}</b><br><small>${bTxt}</small>`;
                s.title = buildItemTooltip(item);
                s.onclick = () => showActions(item, realIdx);
                if (item.unique) s.classList.add('unique-item');
            } else { s.innerText = "Vazio"; }
            invL.appendChild(s);
        }

        checkBossSpawn(); // Verifica se o boss deve nascer
        checkBossFlee(); // Verifica se o boss deve fugir por falta de tentativas

        const bossArea = document.getElementById('boss-area');
        if (p.boss.active) {
            bossArea.style.display = 'block';
            document.getElementById('boss-hp-val').innerText = p.boss.hp;
            document.getElementById('boss-hp-max').innerText = p.boss.maxHp;
            document.getElementById('boss-attempts').innerText = p.boss.attempts;

            let perc = (p.boss.hp / p.boss.maxHp) * 100;
            document.getElementById('boss-hp-bar').style.width = perc + "%";

            document.getElementById('btn-attack-boss').disabled = (p.boss.attempts <= 0);
            document.getElementById('btn-buy-attempt').innerText = `Comprar Tentativa Extra (${getBossAttemptCost()} Ouro)`;
        } else {
            bossArea.style.display = 'none';
        }

        // Verifica se algum Item Único foi desbloqueado (independente da aba aberta)
        checkUniqueItems();

        // Perfil: Resumo de Bónus (agregado de Talento + Perícias + Companion + Prestígio)
        renderBonusSummary();

        // Perfil: estatísticas e conquistas
        checkAchievements();
        document.getElementById('stat-streak').innerText = `${p.loginStreak} dia(s)`;
        document.getElementById('stat-quests').innerText = p.stats.questsDone;
        document.getElementById('stat-arena').innerText = p.stats.arenaWins;
        document.getElementById('stat-bosses').innerText = p.stats.bossesKilled;
        document.getElementById('stat-items').innerText = p.stats.itemsFound;
        document.getElementById('stat-enchants').innerText = p.stats.enchantsDone;
        document.getElementById('stat-gold').innerText = p.stats.goldEarned;
        document.getElementById('stat-xp').innerText = p.stats.xpEarned;
        document.getElementById('stat-achv-bonus').innerText = `+${getAchievementBonus()} em todos os atributos`;

        const achvL = document.getElementById('achv-list'); achvL.innerHTML = '';
        ACHIEVEMENTS.forEach(a => {
            const done = !!p.achievements[a.id];
            const bonus = ACHIEVEMENT_TIER_BONUS[a.tier] || 0;
            const div = document.createElement('div');
            div.className = 'achv-card' + (done ? ' done' : '');
            div.innerHTML = `<div class="achv-title${done ? ' done' : ''}">${done ? '✓ ' : ''}${a.name} <small style="color:#888; font-weight:normal;">(${TIER_LABELS[a.tier]}, +${bonus} atributos)</small></div><small>${a.desc}</small>`;
            achvL.appendChild(div);
        });

        const uniqL = document.getElementById('unique-items-list'); uniqL.innerHTML = '';
        Object.keys(UNIQUE_ITEMS).forEach(uid => {
            const def = UNIQUE_ITEMS[uid];
            if (def.classReq && def.classReq !== p.class && !p.uniqueItems[uid]) return; // esconde exclusivos de outra classe ainda não obtidos
            const done = !!p.uniqueItems[uid];
            const div = document.createElement('div');
            div.className = 'unique-card' + (done ? ' done' : '');
            const classTag = def.classReq ? ` <small style="color:#888;">(${def.classReq})</small>` : '';
            const imgSrc = UNIQUE_ITEM_IMAGES[uid];
            const imgHtml = imgSrc ? `<img src="${imgSrc}" alt="${def.name}" style="max-width:90px; max-height:90px; display:block; margin:4px 0; border-radius:6px; ${done ? '' : 'filter:grayscale(1) brightness(0.5);'}" onerror="this.remove()">` : '';
            div.innerHTML = `<div class="unique-title">${done ? '✓ ' : '🔒 '}${def.icon} ${def.name}${classTag}</div>
                ${imgHtml}
                <small>${slotLabels[def.slot]} — requer: ${def.condDesc}</small>
                ${def.abilityDesc ? `<br><small style="color:#ffd700;">⚡ ${def.abilityDesc}</small>` : ''}
                ${done ? `<br><small style="color:#ccc; font-style:italic;">"${def.lore}"</small>` : ''}`;
            uniqL.appendChild(div);
        });

        // Loja
        checkShopRefresh();

        const potD = document.getElementById('potion-list'); potD.innerHTML = '';
        POTIONS.forEach(pot => {
            const price = getPotionPrice(pot);
            const affordable = p.gold >= price;
            const div = document.createElement('div'); div.className = 'item-card';
            div.innerHTML = `<strong>🧪 ${pot.name}</strong> (${price} Ouro)
                            <button onclick="buyPotionById('${pot.id}')" ${affordable ? '' : 'disabled'}>Comprar</button>`;
            potD.appendChild(div);
        });

        const esBox = document.getElementById('extraction-stone-box');
        if (esBox) {
            const esPrice = getExtractionStonePrice();
            const esAffordable = p.gold >= esPrice;
            esBox.innerHTML = `<div class="item-card"><strong>💠 Pedra de Extração</strong> (${esPrice} Ouro) — retira uma runa sem a destruir
                <button onclick="buyExtractionStone()" ${esAffordable ? '' : 'disabled'}>Comprar</button></div>`;
        }

        const sD = document.getElementById('shop-items'); sD.innerHTML = '<h4>Mercado</h4>';
        p.shopItems.forEach((item, i) => {
            let bTxt = "";
            for (let b in item.bonuses) bTxt += `+${item.bonuses[b]}${b.toUpperCase()} `;
            const shopPrice = getShopPrice(item.price);
            const priceTxt = shopPrice < item.price ? `<s style="color:#888;">${item.price}</s> ${shopPrice} G` : `${item.price} G`;
            const div = document.createElement('div'); div.className = 'item-card';
            div.innerHTML = `<b style="color:${item.rarityColor}">${item.name}</b> (${item.rarityName})<br><small>${bTxt}</small>
                            <button onclick="buyItem(${i})">Comprar (${priceTxt})</button>`;
            sD.appendChild(div);
        });
        save();
    }

    // Caixa de venda em lote por raridade, na Mochila: uma checkbox por raridade (o estado
    // marcado/desmarcado vive em sellRarityFilter, que sobrevive a re-renders mas não é guardado).
    function renderSellRarityBox() {
        const box = document.getElementById('sell-rarity-box');
        if (!box) return;
        const chips = Object.keys(RARITIES).map(key => {
            const r = RARITIES[key];
            const checked = sellRarityFilter.has(r.name);
            return `<label style="display:flex; align-items:center; gap:4px; font-size:0.75em; background:#3a3a3a; padding:4px 8px; border-radius:4px; cursor:pointer; border:1px solid ${checked ? r.color : '#555'};">
                <input type="checkbox" onchange="toggleSellRarityFilter('${r.name}', this.checked)" ${checked ? 'checked' : ''} style="margin:0; width:auto;">
                <span style="color:${r.color};">${r.name}</span>
            </label>`;
        }).join('');
        const { count, gold } = getSellByRarityPreview();
        box.innerHTML = `<p style="font-size:0.8em; color:#aaa; margin:0 0 6px 0;">Vender por raridade:</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">${chips}</div>
            <button onclick="sellByRarity()" ${count > 0 ? '' : 'disabled'} style="background:${count > 0 ? '#e67e22' : '#666'};">${count > 0 ? `Vender ${count} item(ns) por ${gold} Ouro` : 'Seleciona uma raridade com itens'}</button>`;
    }

    // Fecha o modal de ações do item (Equipar/Usar, Encantar, Vender), aberto por showActions().
    function closeItemActions() {
        const overlay = document.getElementById('item-actions-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // --- Painel de Runas de uma peça de equipamento ---
    // Mostra cada slot de runa da peça (getRuneSlotCount() no total): se ocupado, o valor atual e
    // botões Melhorar/Extrair; se vazio, as runas soltas na mochila que dá para encaixar ali.
    function closeRuneSocketPanel() {
        const overlay = document.getElementById('rune-socket-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function openRuneSocketPanel(equipSlot) {
        const item = p.equip[equipSlot];
        if (!item) { log("Equipa primeiro algo nesse slot.", "var(--btn-red)"); return; }
        document.getElementById('rune-socket-title').innerHTML = `🔮 Runas de <span style="color:${item.rarityColor || '#fff'}">${item.name}</span>`;
        renderRuneSocketSlots(equipSlot);
        document.getElementById('rune-socket-overlay').style.display = 'flex';
    }

    function renderRuneSocketSlots(equipSlot) {
        const item = p.equip[equipSlot];
        const box = document.getElementById('rune-socket-slots');
        if (!item || !box) return;
        if (!item.runes) item.runes = [];
        const slotCount = getRuneSlotCount();
        const looseRunes = p.inv.map((it, i) => ({ it, i })).filter(x => x.it.type === 'rune');
        let html = '';
        for (let i = 0; i < slotCount; i++) {
            const rune = item.runes[i];
            if (rune) {
                const def = RUNES[rune.type];
                const val = Math.round(getRuneValue(rune.type, rune.level) * 100) / 100;
                const atMax = rune.level >= RUNE_MAX_LEVEL;
                const cost = getRuneUpgradeCost(rune.level);
                html += `<div style="background:#3a3a3a; padding:8px; border-radius:5px; margin-bottom:8px;">
                    <div>${def.icon} <b>${def.name}</b> +${rune.level} <small style="color:#8f8;">(${val}%)</small></div>
                    ${atMax ? '<small style="color:var(--gold);">Nível máximo</small>' :
                        `<button onclick="upgradeRune('${equipSlot}', ${i}); renderRuneSocketSlots('${equipSlot}');" style="margin-top:6px; background:#8e44ad;">Melhorar (${cost.gold} Ouro + ${cost.dust} Pó)</button>`}
                    <button onclick="extractRune('${equipSlot}', ${i}); renderRuneSocketSlots('${equipSlot}');" style="margin-top:6px; background:#e67e22;">Extrair (1 Pedra)</button>
                </div>`;
            } else {
                html += `<div style="background:#333; padding:8px; border-radius:5px; margin-bottom:8px;">
                    <small style="color:#aaa;">Slot ${i + 1}: vazio</small>`;
                if (looseRunes.length === 0) {
                    html += `<br><small style="color:#888;">Sem runas na mochila para encaixar.</small>`;
                } else {
                    looseRunes.forEach(({ it, i: invIdx }) => {
                        html += `<button onclick="socketRune('${equipSlot}', ${i}, ${invIdx}); renderRuneSocketSlots('${equipSlot}');" style="margin-top:6px; background:#4caf50;">Encaixar ${it.icon} ${it.name}</button>`;
                    });
                }
                html += `</div>`;
            }
        }
        if (slotCount < 2) {
            html += `<small style="color:#888;">2º slot desbloqueável na Loja de Prestígio (perk "Engaste Duplo").</small>`;
        }
        box.innerHTML = html;
    }

    function showActions(item, idx) {
        const overlay = document.getElementById('item-actions-overlay'); overlay.style.display = 'flex';
        if (item.type === 'rune') {
            const def = RUNES[item.runeType];
            document.getElementById('action-info').innerHTML = `<b style="color:#ffd700;">${def.icon} ${def.name}</b>
                <br><small style="color:#ccc;">${item.level > 0 ? `Guardada em nível +${item.level}.` : 'Ainda por encaixar.'}</small>
                <br><small style="color:#ccc;">Encaixa-se numa peça de equipamento — usa o 🔮 no separador Herói.</small>`;
            document.getElementById('btn-equip-use').style.display = 'none';
            document.getElementById('btn-enchant').style.display = 'none';
            const sellBtn = document.getElementById('btn-sell');
            const sellPrice = getSellPrice(item);
            sellBtn.disabled = false;
            sellBtn.innerText = `Vender (${sellPrice}G)`;
            sellBtn.onclick = () => {
                showConfirm(`Vender ${item.name} por ${sellPrice} Ouro?`, () => {
                    p.gold += sellPrice; p.inv.splice(idx, 1); closeItemActions(); updateUI();
                    sfxClick();
                });
            };
            return;
        }
        document.getElementById('btn-equip-use').style.display = '';
        document.getElementById('btn-enchant').style.display = '';
        const uniqueDef = item.unique ? UNIQUE_ITEMS[item.uniqueId] : null;
        const abilityHtml = uniqueDef && uniqueDef.abilityDesc
            ? `<br><small style="color:#ffd700;">⚡ ${uniqueDef.abilityDesc}</small>` : '';
        const uniqueImgSrc = item.unique ? UNIQUE_ITEM_IMAGES[item.uniqueId] : null;
        const uniqueImgHtml = uniqueImgSrc ? `<img src="${uniqueImgSrc}" alt="${item.name}" style="max-width:140px; max-height:140px; display:block; margin:0 auto 8px auto; border-radius:6px;" onerror="this.remove()">` : '';
        document.getElementById('action-info').innerHTML = item.unique
            ? `${uniqueImgHtml}<b style="color:${item.rarityColor};">✨ ${item.name}</b><br><small style="color:#ccc; font-style:italic;">"${item.lore}"</small>${abilityHtml}`
            : `<b>${item.name}</b>`;
        const btn = document.getElementById('btn-equip-use');
        const enchantBtn = document.getElementById('btn-enchant');
        // Itens Únicos exclusivos de outra classe nunca podem ser equipados (podem acontecer de
        // teres desbloqueado antes de existir esta restrição, ou por edição manual da save).
        const classLocked = uniqueDef && uniqueDef.classReq && uniqueDef.classReq !== p.class;

        if (item.type === 'consumable') {
            enchantBtn.style.display = 'none';
            btn.disabled = false;
            btn.innerText = "Usar";
            btn.onclick = () => {
                if (item.effect === 'full_heal') {
                    p.hp = getTotalAttr('vit');
                    log("Curaste todo o HP!", "var(--accent)");
                } else if (item.effect === 'dmg_boost') {
                    p.buffs.dmgBoostNext = true;
                    log("Elixir de Fúria pronto para o próximo combate!", "var(--accent)");
                } else {
                    // healPercent (poções novas) é % da vida máxima; amount (saves antigas) continua
                    // a funcionar como valor fixo, para não invalidar poções já guardadas.
                    const maxHp = getTotalAttr('vit');
                    const amount = item.healPercent ? Math.round(maxHp * item.healPercent / 100) : (item.amount || 50);
                    p.hp = Math.min(maxHp, p.hp + amount);
                    log(`Recuperaste ${amount} HP.`, "var(--accent)");
                }
                p.inv.splice(idx, 1); updateUI(); closeItemActions();
            };
        } else if (classLocked) {
            btn.innerText = `Exclusivo de ${uniqueDef.classReq}`;
            btn.disabled = true;
            btn.onclick = null;
            enchantBtn.style.display = 'none';
        } else {
            btn.disabled = false;
            btn.innerText = "Equipar"; btn.onclick = () => {
                const t = item.type; if (p.equip[t]) p.inv.push(p.equip[t]);
                p.equip[t] = item; p.inv.splice(idx, 1); updateUI(); closeItemActions();
                sfxClick();
            };

            // Comparação com o item já equipado nesse slot, antes de decidires trocar
            const currentEquipped = p.equip[item.type];
            const compareHtml = `<div style="margin-top:8px; background:#333; padding:6px 10px; border-radius:5px;">
                <small style="color:#aaa;">${currentEquipped ? `Vs. ${currentEquipped.name} equipado:` : 'Slot vazio atualmente:'}</small>
                ${compareItems(item, currentEquipped)}
            </div>`;
            document.getElementById('action-info').innerHTML += compareHtml;

            if (item.bonuses && Object.keys(item.bonuses).length > 0) {
                const cost = getEnchantCost(item);
                enchantBtn.style.display = 'block';
                enchantBtn.innerText = `Encantar (${cost}G/vez)`;
                enchantBtn.onclick = () => showEnchantChoice(idx);
            } else {
                enchantBtn.style.display = 'none';
            }
        }
        const sellBtn = document.getElementById('btn-sell');
        if (item.unique) {
            sellBtn.disabled = true;
            sellBtn.innerText = 'Item Único — não pode ser vendido';
            sellBtn.onclick = null;
        } else {
            sellBtn.disabled = false;
            const sellPrice = getSellPrice(item);
            sellBtn.innerText = `Vender (${sellPrice}G)`;
            sellBtn.onclick = () => {
                showConfirm(`Vender ${item.name} por ${sellPrice} Ouro?`, () => {
                    p.gold += sellPrice; p.inv.splice(idx, 1); closeItemActions(); updateUI();
                    sfxClick();
                });
            };
        }
    }

    function openTab(id, evt) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        const source = evt || window.event;
        if (source && source.currentTarget) source.currentTarget.classList.add('active');
    }

    function log(msg, color = "#ccc") {
        const logDiv = document.getElementById('game-log');
        logDiv.innerHTML = `<div style="color:${color}">> ${msg}</div>` + logDiv.innerHTML;
    }

    function formatMs(ms) {
        const totalSec = Math.max(0, Math.ceil(ms / 1000));
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}m ${s.toString().padStart(2, '0')}s`;
    }

    function tickTimers() {
        // Cooldown da habilidade
        const ab = ABILITIES[p.class];
        const btn = document.getElementById('btn-ability');
        if (ab && btn) {
            const remain = (p.ability.lastUsed + getEffectiveAbilityCooldown()) - Date.now();
            if (remain > 0) {
                btn.disabled = true;
                btn.innerText = `Recarregando (${Math.ceil(remain / 1000)}s)`;
            } else {
                btn.disabled = false;
                btn.innerText = "Usar Habilidade";
            }
        }
        // Contagem da loja
        const shopTimer = document.getElementById('shop-refresh-timer');
        if (shopTimer) {
            const remain = p.shopRefreshAt - Date.now();
            shopTimer.innerText = remain > 0 ? `Novos itens em ${formatMs(remain)}` : 'Prestes a renovar...';
        }
        // Contagem até o boss fugir, quando sem tentativas
        const fleeTimer = document.getElementById('boss-flee-timer');
        if (fleeTimer) {
            if (p.boss.active && p.boss.attempts <= 0 && p.boss.depletedAt) {
                const remain = BOSS_FLEE_TIME - (Date.now() - p.boss.depletedAt);
                fleeTimer.innerText = remain > 0 ? `O Boss foge em ${formatMs(remain)} se não compares mais tentativas!` : '';
            } else {
                fleeTimer.innerText = '';
            }
        }
    }