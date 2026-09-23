// js/data.js — Dados estáticos do jogo: configuração geral, listas de nomes, raridades, habilidades, poções, missões lendárias.


    const CURRENT_SAVE_VERSION = 2;
    const INV_CAPACITY = 12;
    const SHOP_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
    const PRESTIGE_LEVEL_REQ = 10;

    const missionNames = ["Caçar Ratos", "Limpar Esgotos", "Escolta Real", "Colher Ervas", "Roubar os Planos", "Matar Slimes", "Pescar", "Treinar Tropas", "Explorar Mina"];
    const itemNames = { weapon: ["Espada", "Adaga", "Cajado"], armor: ["Túnica", "Couro", "Placas"], amulet: ["Colar"], ring: ["Anel"], boots: ["Botas"], cape: ["Capa"] };
    const slotLabels = { weapon: "Arma", armor: "Armadura", amulet: "Colar", ring: "Anel", boots: "Botas", cape: "Capa" };
    const attrNames = { str: "Força", vit: "Vida", dex: "Destreza", int: "Inteligência", luk: "Sorte" };

    const ARENA_ENEMIES = ["Goblin Feroz", "Orc Selvagem", "Lobo das Sombras", "Esqueleto Guerreiro", "Troll da Montanha", "Bandido Mascarado", "Aranha Gigante", "Golem de Pedra"];

    const ABILITIES = {
        'Guerreiro': { name: 'Fúria de Batalha', desc: 'Cura instantaneamente 50% do teu HP máximo.', cooldown: 60000 },
        'Assassino': { name: 'Golpe Certeiro', desc: 'Ganha ouro instantâneo (5x o teu nível).', cooldown: 60000 },
        'Mago': { name: 'Surto Arcano', desc: 'Ganha XP instantâneo (5x o teu nível).', cooldown: 60000 }
    };

    const POTIONS = [
        { id: 'small', name: 'Poção de Vida', price: 20, effect: 'heal', amount: 50 },
        { id: 'full', name: 'Elixir Maior', price: 50, effect: 'full_heal' },
        { id: 'fury', name: 'Elixir de Fúria', price: 40, effect: 'dmg_boost' }
    ];

    // Configuração de Raridades
    const RARITIES = {
        COMUM:     { name: "Comum", color: "#ffffff", chance: 0.60, slots: 1 },
        INCOMUM:   { name: "Incomum", color: "#1eff00", chance: 0.20, slots: 2 }, // 1 a 2 bónus
        RARO:      { name: "Raro", color: "#0070dd", chance: 0.10, slots: 2 },
        EPICO:     { name: "Épico", color: "#a335ee", chance: 0.06, slots: 3 }, // 2 a 3 bónus
        LENDARIO:  { name: "Lendário", color: "#ff8000", chance: 0.03, slots: 3 },
        MITICO:    { name: "Mítico", color: "#ff0000", chance: 0.01, slots: 5 }
    };

    const OFFLINE_GOLD_CAP_MIN = 8 * 60; // no máximo 8h de ganhos offline contabilizados

    const LEGENDARY_QUEST_CHANCE = 0.08; // ~1 em cada 12 gerações de missões traz uma Lendária
    const legendaryMissionNames = ["Derrotar o Dragão Ancião", "Assaltar a Fortaleza Negra", "Recuperar a Coroa Perdida", "Selar o Portal Amaldiçoado"];

    const BOSS_FLEE_TIME = 60 * 60 * 1000; // 1 hora sem tentativas e o boss foge