/**
 * Shared constants for Stage 1 (recipe builder + cup display).
 */
(function (global) {
  global.RECIPE_META = {
    COFFEE_TYPES: [
      { key: "espresso",       name: "إسبريسو" },
      { key: "americano",      name: "أمريكانو" },
      { key: "cappuccino",     name: "كابتشينو" },
      { key: "latte",          name: "لاتيه" },
      { key: "flat-white",     name: "فلات وايت" },
      { key: "macchiato",      name: "ماكياتو" },
      { key: "mocha",          name: "موكا" },
      { key: "cortado",        name: "كورتادو" },
      { key: "iced-latte",     name: "آيس لاتيه" },
      { key: "iced-americano", name: "آيس أمريكانو" },
      { key: "spanish-latte",  name: "سبانش لاتيه" },
      { key: "turkish",        name: "قهوة تركية" },
      { key: "v60",            name: "في60 (مقطرة)" },
      { key: "cold-brew",      name: "كولد برو" },
      { key: "affogato",       name: "أفوغاتو" },
    ],
    PUMP_LABELS: {
      vanilla:"فانيلا", caramel:"كراميل", hazelnut:"بندق", chocolate:"شوكولاتة",
      cinnamon:"قرفة", toffee:"توفي", pumpkin:"يقطين", rose:"ورد", saffron:"زعفران"
    },
    MILK_LABELS: {
      full:"حليب كامل الدسم", low:"حليب قليل الدسم", oat:"حليب شوفان",
      almond:"حليب لوز", soy:"حليب صويا", coconut:"حليب جوز الهند", none:"بدون حليب"
    },
    SIZE_LABELS: { S: "صغير 240مل", M: "وسط 350مل", L: "كبير 470مل" },
    TEMP_LABELS: { hot: "ساخن", iced: "مثلّج" },
    ICE_LABELS:  ["بدون", "قليل", "متوسط", "كثير", "مملوء", "ثلج فقط"],
  };
})(window);
