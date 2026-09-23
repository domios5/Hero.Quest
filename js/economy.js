// js/economy.js — Loja, inventário e itens: geração de itens, compra/venda, encantar, comparação, tooltips.


    function createItem(quality = 1) {
        // 1. Sortear Raridade baseada nas chances
        let rand = Math.random();
        let rarityKey = "COMUM";
        let cumulative = 0;

        for (let key in RARITIES) {
            cumulative += RARITIES[key].chance;
            if (rand <= cumulative) {
                rarityKey = key;
                break;
            }
        }
        const rarity = RARITIES[rarityKey];

        // 2. Sortear Tipo e Nome (Arma/Armadura dependem da classe; o resto é neutro)
        const types = ['weapon', 'armor', 'amulet', 'ring', 'boots', 'cape'];
        const t = types[Math.floor(Math.random() * types.length)];
        const baseName = pickItemName(t);

        // 3. Gerar Bónus (Atributos)
        let bonuses = {};
        let mainAttr = p.class === 'Guerreiro' ? 'str' : (p.class === 'Assassino' ? 'dex' : 'int');

        // Lógica de Atribuição baseada na tua regra:
        if (rarityKey === "COMUM") {
            bonuses[mainAttr] = genValue(quality);
        }
        else if (rarityKey === "INCOMUM") {
            bonuses[mainAttr] = genValue(quality);
            if (Math.random() > 0.5) bonuses['vit'] = genValue(quality, 20); // 50% chance de 2º bónus
        }
        else if (rarityKey === "RARO") {
            bonuses[mainAttr] = genValue(quality);
            bonuses['vit'] = genValue(quality, 20);
        }
        else if (rarityKey === "EPICO") {
            bonuses[mainAttr] = genValue(quality);
            bonuses['vit'] = genValue(quality, 20);
            if (Math.random() > 0.5) bonuses['luk'] = genValue(quality, 1, 3);
        }
        else if (rarityKey === "LENDARIO") {
            bonuses[mainAttr] = genValue(quality);
            bonuses['vit'] = genValue(quality, 20);
            bonuses['luk'] = genValue(quality, 1, 3);
        }
        else if (rarityKey === "MITICO") {
            // Todos os 5 atributos
            ['str', 'vit', 'dex', 'int', 'luk'].forEach(attr => {
                let mult = (attr === 'vit') ? 20 : (attr === 'luk' ? 1 : 1);
                bonuses[attr] = genValue(quality, mult);
            });
        }

        return {
            id: Date.now() + Math.random(),
            name: baseName,
            rarityName: rarity.name,
            rarityColor: rarity.color,
            type: t,
            bonuses: bonuses, // Objeto com múltiplos atributos
            price: quality * (rarity.slots * 50)
        };
    }

    // Função auxiliar para gerar valores equilibrados
    function genValue(q, multiplier = 1, min = 2) {
        return Math.floor((Math.random() * 5 + min) * q * multiplier * 0.5) + 1;
    }

    // Escolhe um nome para o item: Arma/Armadura usam a lista da classe atual (com fallback para
    // Guerreiro se por algum motivo p.class ainda não estiver definido); os outros slots são neutros.
    function pickItemName(type) {
        if (itemNamesByClass[type]) {
            const opts = itemNamesByClass[type][p.class] || itemNamesByClass[type]['Guerreiro'];
            return opts[Math.floor(Math.random() * opts.length)];
        }
        const opts = itemNamesGeneric[type];
        return opts[Math.floor(Math.random() * opts.length)];
    }

    // --- Capacidade da Mochila ---
    // Capacidade total = base + expansões compradas com Ouro (custo cresce por compra) + pontos
    // investidos na Perícia "Mochila Expandida" (+1 slot/ponto).
    function getInvCapacity() {
        return INV_CAPACITY_BASE + (p.invCapacityPurchases || 0) * INV_CAPACITY_PER_PURCHASE + getPericiaBackpackSlots();
    }
    function getInvCapacityCost() {
        const n = p.invCapacityPurchases || 0;
        return Math.round(50 * Math.pow(1.3, n));
    }
    function buyInvCapacity() {
        const cost = getInvCapacityCost();
        if (p.gold < cost) { log(`Precisas de ${cost} Ouro para expandir a mochila.`, "var(--btn-red)"); return; }
        p.gold -= cost;
        p.invCapacityPurchases = (p.invCapacityPurchases || 0) + 1;
        sfxClick();
        log(`Mochila expandida! +${INV_CAPACITY_PER_PURCHASE} slots.`, "var(--accent)");
        updateUI();
    }

    // Adiciona um item à mochila respeitando o limite de slots visíveis
    function addToInventory(item) {
        if (p.inv.length >= getInvCapacity()) {
            log("Mochila cheia! Vende ou usa itens antes de continuar.", "var(--btn-red)");
            return false;
        }
        p.inv.push(item);
        return true;
    }

    // Gera sempre um item Mítico "a sério" (5 atributos), em vez de sortear
    // uma raridade aleatória e só trocar o rótulo/cor no fim.
    function createMythicItem(quality) {
        const rarity = RARITIES.MITICO;
        const types = ['weapon', 'armor', 'amulet', 'ring', 'boots', 'cape'];
        const t = types[Math.floor(Math.random() * types.length)];
        const baseName = pickItemName(t);

        let bonuses = {};
        ['str', 'vit', 'dex', 'int', 'luk'].forEach(attr => {
            let mult = (attr === 'vit') ? 20 : 1;
            bonuses[attr] = genValue(quality, mult);
        });

        return {
            id: Date.now() + Math.random(),
            name: baseName,
            rarityName: rarity.name,
            rarityColor: rarity.color,
            type: t,
            bonuses: bonuses,
            price: quality * (rarity.slots * 50)
        };
    }

    // --- Itens Únicos ---
    // Cria o item físico correspondente a um UNIQUE_ITEMS[uid]. Stats muito acima de um Mítico
    // (multiplicadores bem maiores no genValue), sempre nos 5 atributos para servir qualquer classe,
    // preço 0 e uma flag "unique" que bloqueia a venda e ativa o visual especial (borda dourada).
    function createUniqueItem(uid) {
        const def = UNIQUE_ITEMS[uid];
        if (!def) return null;
        let bonuses = {};
        ['str', 'vit', 'dex', 'int', 'luk'].forEach(attr => {
            let mult = (attr === 'vit') ? 45 : 2.5;
            bonuses[attr] = genValue(Math.max(p.lvl, 1), mult);
        });
        return {
            id: 'unique_' + uid + '_' + Date.now(),
            uniqueId: uid,
            name: def.name,
            rarityName: 'Único',
            rarityColor: '#ffd700',
            type: def.slot,
            bonuses: bonuses,
            lore: def.lore,
            unique: true,
            price: 0
        };
    }

    // Verifica todos os Itens Únicos ainda não desbloqueados; ao cumprir a condição, cria o item,
    // força-o para a mochila (ignora o limite de capacidade — é demasiado raro para se perder por
    // falta de espaço) e avisa o jogador com a lore numa janela dedicada.
    function checkUniqueItems() {
        Object.keys(UNIQUE_ITEMS).forEach(uid => {
            if (p.uniqueItems[uid]) return;
            const def = UNIQUE_ITEMS[uid];
            if (!def.cond()) return;
            p.uniqueItems[uid] = true;
            const item = createUniqueItem(uid);
            p.inv.push(item); // sem verificação de capacidade — item único, nunca se pode perder
            log(`ITEM ÚNICO DESBLOQUEADO: ${def.icon} ${def.name}!`, "#ffd700");
            sfxLevelUp();
            showNotice(`✨ ${def.icon} ${def.name}`, `${def.lore}\n\nEncontras este item na tua mochila.`);
        });
    }

    function enchantItem(idx) {
        const item = p.inv[idx];
        if (!item || !item.bonuses || Object.keys(item.bonuses).length === 0) return;
        const cost = 50 * Object.keys(item.bonuses).length;
        if (p.gold < cost) { log("Ouro insuficiente para encantar.", "var(--btn-red)"); return; }
        showConfirm(`Encantar ${item.name} por ${cost} Ouro?`, () => {
            p.gold -= cost;
            const keys = Object.keys(item.bonuses);
            const k = keys[Math.floor(Math.random() * keys.length)];
            const boost = Math.floor(Math.random() * 3) + 1;
            item.bonuses[k] += boost;
            p.stats.enchantsDone++;
            log(`${item.name} encantado! +${boost} ${(attrNames[k] || k.toUpperCase())}.`, "var(--accent)");
            sfxLoot();
            document.getElementById('item-actions').style.display = 'none';
            updateUI();
        });
    }

    function unequip(slot) {
        const item = p.equip[slot];
        if (!item) return;
        if (p.inv.length >= getInvCapacity()) { log("Mochila cheia! Não é possível desequipar.", "var(--btn-red)"); return; }
        addToInventory(item);
        p.equip[slot] = null;
        updateUI();
    }

    function refreshShop() {
        p.shopItems = [createItem(p.lvl), createItem(p.lvl)];
        p.shopRefreshAt = Date.now() + SHOP_REFRESH_INTERVAL;
    }

    function checkShopRefresh() {
        if (Date.now() >= p.shopRefreshAt) refreshShop();
    }

    function manualRefreshShop() {
        if (p.gold < 10) { log("Ouro insuficiente para atualizar a loja.", "var(--btn-red)"); return; }
        p.gold -= 10;
        refreshShop();
        log("Loja atualizada!", "var(--accent)");
        updateUI();
    }

    function getShopPrice(basePrice) { return Math.max(1, Math.floor(basePrice * getTalentShopDiscount())); }

    function buyItem(idx) {
        const it = p.shopItems[idx];
        const price = getShopPrice(it.price);
        if (p.inv.length >= getInvCapacity()) { log("Mochila cheia! Vende algo antes de comprar.", "var(--btn-red)"); return; }
        if (p.gold >= price) { p.gold -= price; addToInventory(it); p.shopItems.splice(idx, 1); updateUI(); }
    }

    function buyPotionById(id) {
        const pot = POTIONS.find(x => x.id === id);
        if (!pot) return;
        if (p.inv.length >= getInvCapacity()) { log("Mochila cheia! Vende algo antes de comprar.", "var(--btn-red)"); return; }
        if (p.gold < pot.price) { log("Ouro insuficiente.", "var(--btn-red)"); return; }
        p.gold -= pot.price;
        addToInventory({ name: pot.name, type: 'consumable', effect: pot.effect, amount: pot.amount });
        updateUI();
    }

    // Preço de venda: antes era sempre 15 de Ouro para qualquer item, ignorando a raridade.
    // Agora escala com o valor de compra do item (equipamento) ou é um valor fixo pequeno (consumíveis).
    function getSellPrice(item) {
        if (item.type === 'consumable') return 8;
        const base = item.price || 20;
        return Math.max(5, Math.floor(base * 0.4));
    }

    // Compara um item candidato com o que já está equipado nesse slot, para mostrar as diferenças
    // de atributos antes de o jogador decidir equipar (evita trocas às cegas).
    function compareItems(newItem, oldItem) {
        const keys = ['str', 'vit', 'dex', 'int', 'luk'];
        let rows = '';
        keys.forEach(k => {
            const nv = (newItem.bonuses && newItem.bonuses[k]) || 0;
            const ov = (oldItem && oldItem.bonuses && oldItem.bonuses[k]) || 0;
            if (nv === 0 && ov === 0) return;
            const diff = nv - ov;
            const cls = diff > 0 ? 'compare-up' : diff < 0 ? 'compare-down' : '';
            const sign = diff > 0 ? '+' : '';
            rows += `<div class="compare-row"><span>${attrNames[k]}</span><span class="${cls}">${nv} (${sign}${diff})</span></div>`;
        });
        return rows || '<div class="compare-row"><span style="color:#888;">Sem atributos para comparar</span></div>';
    }

    function buildItemTooltip(item) {
        let lines = [item.name + (item.rarityName ? ` (${item.rarityName})` : '')];
        if (item.bonuses) {
            for (let b in item.bonuses) lines.push(`+${item.bonuses[b]} ${attrNames[b] || b}`);
        }
        if (item.unique) {
            lines.push('');
            lines.push(`"${item.lore}"`);
            lines.push('Item Único — não pode ser vendido.');
        } else if (item.price) {
            lines.push(`Valor: ${item.price} Ouro`);
        }
        return lines.join('\n');
    }

    function getSortedInventoryIndices() {
        let indices = p.inv.map((_, i) => i);
        if (invSortMode === 'rarity') {
            const order = ['Único', 'Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];
            indices.sort((a, b) => {
                const ra = order.indexOf(p.inv[a].rarityName); const rb = order.indexOf(p.inv[b].rarityName);
                return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
            });
        } else if (invSortMode === 'type') {
            indices.sort((a, b) => (p.inv[a].type || '').localeCompare(p.inv[b].type || ''));
        }
        return indices;
    }

    function setInvSort(mode) { invSortMode = mode; updateUI(); }