/**
 * Shared constants for Stage 1 (recipe builder + cup display).
 */
(function (global) {
  const DRINKS = [
    { key: "latte",             name: "لاتيه",                sub: "1 Shot · 150ml",               icon: "🥛" },
    { key: "cappuccino",        name: "كابتشينو",             sub: "⅓ · ⅓ · ⅓",                    icon: "☕" },
    { key: "espresso",          name: "إسبريسو",              sub: "1 Shot Strong",                icon: "☕" },
    { key: "macchiato",         name: "ماكياتو",              sub: "1 Shot · Dollop",              icon: "☕" },
    { key: "flat-white",        name: "فلات وايت",            sub: "Ristretto 2",                  icon: "☕" },
    { key: "americano",         name: "أمريكانو",             sub: "2 Shots + Water",              icon: "☕" },
    { key: "spanish-latte",     name: "لاتيه إسباني",         sub: "Condensed + Esp",              icon: "🥛" },
    { key: "cortado",           name: "كورتادو",              sub: "Ratio 1:1",                    icon: "☕" },
    { key: "mocha",             name: "موكا",                 sub: "Choc · Esp · Milk",            icon: "🍫" },
    { key: "iced-latte",        name: "لاتيه بارد",           sub: "Esp · Cold · Ice",             icon: "🧊" },
    { key: "chocolate",         name: "شوكولاتة",             sub: "Dark + Milk 72%",              icon: "🍫" },
    { key: "matcha-latte",      name: "ماتشا لاتيه",          sub: "Grade A · Velvety",            icon: "🍵" },
    { key: "iced-white-mocha",  name: "آيس أمريكانو وايت موكا", sub: "White Mocha · Esp · Water · Ice", icon: "🤍" },
    { key: "iced-spanish",      name: "لاتيه إسباني بارد",    sub: "Condensed · Cold",             icon: "🧊" },
    { key: "iced-americano",    name: "أمريكانو بارد",        sub: "2 Shots · Cold · Ice",         icon: "🧊" },
    { key: "frappe",            name: "فرابيه",               sub: "Blended · Cream",              icon: "🥤" },
    { key: "tea",               name: "شاي",                  sub: "Black / Green",                icon: "🍵" },
    { key: "iced-mocha",        name: "موكا بارد",            sub: "Choc · Esp · Cold",            icon: "🍫" },
  ];

  // per-type sensible defaults applied when a drink is picked
  const DRINK_DEFAULTS = {
    "latte":            { shots: 1, milk: 150, sugar: 0, temp: "hot",  size: "M", foam: "light",  ice: "none",    water: "none" },
    "cappuccino":       { shots: 1, milk: 120, sugar: 0, temp: "hot",  size: "M", foam: "heavy",  ice: "none",    water: "none" },
    "espresso":         { shots: 1, milk: 0,   sugar: 0, temp: "hot",  size: "S", foam: "none",   ice: "none",    water: "none" },
    "macchiato":        { shots: 1, milk: 30,  sugar: 0, temp: "hot",  size: "S", foam: "medium", ice: "none",    water: "none" },
    "flat-white":       { shots: 2, milk: 120, sugar: 0, temp: "hot",  size: "S", foam: "light",  ice: "none",    water: "none" },
    "americano":        { shots: 2, milk: 0,   sugar: 0, temp: "hot",  size: "M", foam: "none",   ice: "none",    water: "full" },
    "spanish-latte":    { shots: 2, milk: 180, sugar: 0, temp: "hot",  size: "M", foam: "light",  ice: "none",    water: "none" },
    "cortado":          { shots: 2, milk: 60,  sugar: 0, temp: "hot",  size: "S", foam: "none",   ice: "none",    water: "none" },
    "mocha":            { shots: 2, milk: 180, sugar: 0, temp: "hot",  size: "M", foam: "light",  ice: "none",    water: "none" },
    "iced-latte":       { shots: 2, milk: 180, sugar: 0, temp: "cold", size: "L", foam: "none",   ice: "regular", water: "none" },
    "chocolate":        { shots: 0, milk: 220, sugar: 1, temp: "hot",  size: "M", foam: "light",  ice: "none",    water: "none" },
    "matcha-latte":     { shots: 0, milk: 220, sugar: 0, temp: "hot",  size: "M", foam: "light",  ice: "none",    water: "none" },
    "iced-white-mocha": { shots: 2, milk: 0,   sugar: 0, temp: "cold", size: "L", foam: "none",   ice: "regular", water: "half" },
    "iced-spanish":     { shots: 2, milk: 180, sugar: 0, temp: "cold", size: "L", foam: "none",   ice: "regular", water: "none" },
    "iced-americano":   { shots: 2, milk: 0,   sugar: 0, temp: "cold", size: "L", foam: "none",   ice: "regular", water: "full" },
    "frappe":           { shots: 1, milk: 180, sugar: 1, temp: "cold", size: "L", foam: "none",   ice: "heavy",   water: "none" },
    "tea":              { shots: 0, milk: 0,   sugar: 0, temp: "hot",  size: "M", foam: "none",   ice: "none",    water: "full" },
    "iced-mocha":       { shots: 2, milk: 180, sugar: 0, temp: "cold", size: "L", foam: "none",   ice: "regular", water: "none" },
  };

  const SIZES = [
    { key: "L", name: "كبير",  ml: 480 },
    { key: "M", name: "وسط",  ml: 360 },
    { key: "S", name: "صغير", ml: 240 },
  ];

  const TEMPS = [
    { key: "cold", name: "بارد", icon: "🧊" },
    { key: "warm", name: "دافئ", icon: "🌡️" },
    { key: "hot",  name: "ساخن", icon: "🔥" },
  ];

  const MILK_TYPES = [
    { key: "regular", name: "عادي",        icon: "🥛" },
    { key: "skim",    name: "خالي الدسم", icon: "🥛" },
    { key: "low-fat", name: "قليل الدسم", icon: "🥛" },
    { key: "oat",     name: "شوفان",       icon: "🌾" },
    { key: "almond",  name: "لوز",         icon: "🤍" },
    { key: "soy",     name: "صويا",        icon: "🫘" },
  ];

  const FOAM_LEVELS = [
    { key: "none",   name: "بدون رغوة"  },
    { key: "light",  name: "رغوة خفيفة" },
    { key: "medium", name: "رغوة متوسطة"},
    { key: "heavy",  name: "رغوة كثيفة" },
  ];

  const ICE_LEVELS = [
    { key: "none",    name: "بدون ثلج" },
    { key: "light",   name: "ثلج خفيف" },
    { key: "regular", name: "ثلج عادي" },
    { key: "heavy",   name: "ثلج كثير" },
  ];

  const WATER_LEVELS = [
    { key: "none", name: "بدون ماء" },
    { key: "half", name: "نص ماء" },
    { key: "full", name: "ماء كامل" },
  ];

  const PUMPS = [
    { key: "vanilla",     name: "فانيلا",   en: "Vanilla",     icon: "🌿",  tag: "" },
    { key: "caramel",     name: "كراميل",   en: "Caramel",     icon: "🍮",  tag: "" },
    { key: "hazelnut",    name: "بندق",     en: "Hazelnut",    icon: "🌰",  tag: "" },
    { key: "white-mocha", name: "وايت موكا", en: "White Mocha", icon: "🤍",  tag: "Sauce" },
    { key: "mocha-sauce", name: "موكا",     en: "Mocha",       icon: "🍫",  tag: "Sauce" },
    { key: "classic",     name: "كلاسيك",   en: "Classic",     icon: "✨",  tag: "" },
  ];

  const EXTRA_PUMPS = [
    { key: "cinnamon",   name: "قرفة",       en: "Cinnamon",   icon: "🌙", tag: "" },
    { key: "toffee",     name: "توفي",       en: "Toffee",     icon: "🍬", tag: "" },
    { key: "pumpkin",    name: "يقطين",      en: "Pumpkin",    icon: "🎃", tag: "" },
    { key: "rose",       name: "ورد",        en: "Rose",       icon: "🌹", tag: "" },
    { key: "saffron",    name: "زعفران",     en: "Saffron",    icon: "🌼", tag: "" },
    { key: "coconut",    name: "جوز الهند", en: "Coconut",    icon: "🥥", tag: "" },
    { key: "peppermint", name: "نعناع",     en: "Peppermint", icon: "🌱", tag: "" },
    { key: "lavender",   name: "لافندر",    en: "Lavender",   icon: "💜", tag: "" },
  ];

  global.RECIPE_META = {
    DRINKS, DRINK_DEFAULTS, SIZES, TEMPS, MILK_TYPES,
    FOAM_LEVELS, ICE_LEVELS, WATER_LEVELS, PUMPS, EXTRA_PUMPS,
  };
})(window);
