/**
 * Stock photographs for products without a photo (DECISIONS D49).
 *
 *   npx tsx scripts/stock-photos.mts plan   -> prints each photo theme, its Unsplash query and how many products use it
 *   npx tsx scripts/stock-photos.mts sql    -> writes data/import/stock-photos.sql from data/import/stock-photos.json
 *
 * Products come from data/import/catalogue-import.sql (the live catalogue). Each product is matched to a theme by
 * the first rule whose pattern matches its name (else its category's fallback theme). Photos for a theme are picked
 * from stock-photos.json round-robin by a stable hash of the slug, so neighbours differ and re-runs agree.
 * The SQL only fills products that still have no photo, so an admin upload is never overwritten. Re-runnable.
 */
import { readFileSync, writeFileSync } from "node:fs";

type Rule = [RegExp, string];
interface Photo { url: string; author: string; authorUrl: string; unsplashId: string }
interface ThemeFile { themes: Record<string, { query: string; photos: Photo[] }> }

export const QUERIES: Record<string, string> = {
  basmati: "basmati rice",
  "brown-rice": "brown rice grains",
  "rice-grains": "white rice grains",
  poha: "flattened rice poha",
  "puffed-rice": "puffed rice",
  "rice-cracker": "rice crackers",
  chickpeas: "chickpeas",
  lentils: "lentils dal",
  "moong": "mung beans",
  beans: "kidney beans",
  peanuts: "peanuts",
  cashews: "cashew nuts",
  almonds: "almonds",
  pistachios: "pistachios",
  raisins: "raisins",
  figs: "dried figs",
  vermicelli: "vermicelli noodles",
  salt: "salt crystals",
  "pink-salt": "pink himalayan salt",
  sugar: "white sugar",
  jaggery: "jaggery",
  seeds: "mustard seeds",
  sesame: "sesame seeds",
  fennel: "fennel seeds",
  tamarind: "tamarind",
  soya: "soya chunks",
  "gulab-jamun": "gulab jamun",
  jam: "fruit jam jar",
  "dried-chilli": "dried red chillies",
  "chilli-flakes": "chili flakes",
  "fried-onions": "fried onions",
  sago: "sago pearls",
  breadcrumbs: "bread crumbs",
  pickle: "indian pickle achar",
  paprika: "paprika",
  msg: "white seasoning powder",
  cardamom: "green cardamom",
  "black-cardamom": "black cardamom",
  cinnamon: "cinnamon sticks",
  cloves: "cloves spice",
  pepper: "black peppercorns",
  "bay-leaves": "bay leaves",
  "star-anise": "star anise",
  coriander: "coriander seeds",
  nutmeg: "nutmeg mace",
  cumin: "cumin seeds",
  coconut: "desiccated coconut",
  noodles: "instant noodles",
  "curry-paste": "curry paste",
  hing: "asafoetida spice",
  methi: "dried fenugreek leaves",
  herbs: "dried herbs",
  poppy: "poppy seeds",
  "spice-mix": "spice market",
  "chilli-powder": "red chili powder",
  turmeric: "turmeric powder",
  "coriander-powder": "ground coriander",
  "cumin-powder": "ground cumin",
  "garam-masala": "garam masala",
  "pepper-powder": "ground black pepper",
  ginger: "ginger powder",
  "baking-powder": "baking powder",
  "coconut-milk": "coconut milk",
  atta: "whole wheat flour",
  "gram-flour": "chickpea flour besan",
  cornflour: "corn starch",
  "rice-flour": "rice flour",
  semolina: "semolina",
  millet: "millet",
  flour: "flour",
  tea: "indian chai tea",
  coffee: "instant coffee",
  malt: "hot chocolate drink",
  "soy-sauce": "soy sauce",
  "chilli-sauce": "hot chili sauce",
  chutney: "chutney",
  "mint-sauce": "mint sauce",
  ketchup: "tomato ketchup",
  sauce: "sauce bottles",
  "food-colour": "food coloring",
  oil: "cooking oil bottle",
  "coconut-oil": "coconut oil",
  "olive-oil": "olive oil",
  ghee: "ghee",
  cream: "fresh cream",
  custard: "custard",
  "condensed-milk": "condensed milk",
  mango: "mango pulp",
  tomatoes: "canned tomatoes",
  "canned-food": "canned food",
  "lemon-juice": "lemon juice",
  vinegar: "vinegar",
  "rose-water": "rose water",
  saffron: "saffron",
  "dish-soap": "dish soap",
  "canned-fruit": "canned fruit",
  vanilla: "vanilla extract",
  "rose-petals": "dried rose petals",
  "citric-acid": "citric acid",
  cola: "cola cans",
  water: "bottled water",
  "lemon-soda": "lemon lime soda",
  "orange-soda": "orange soda",
  "glass-soda": "glass soda bottles",
  "soft-drinks": "soft drink cans",
  containers: "takeaway food containers",
  "foil-trays": "aluminium foil container",
  cups: "paper coffee cups",
  bags: "paper bags",
  "cling-film": "plastic wrap roll",
  cutlery: "wooden cutlery",
  straws: "paper straws",
  napkins: "paper napkins",
  gloves: "disposable gloves",
  "bin-bags": "garbage bags",
  cleaning: "cleaning supplies",
  plates: "disposable plates",
  pizza: "pizza box",
  "sauce-cups": "sauce cups",
  packaging: "takeaway packaging",
};

/** First match wins: specific before general. Matched against the lower-case product name. */
export const RULES: Rule[] = [
  [/rice cracker/, "rice-cracker"], [/poha|rice flakes/, "poha"], [/mamra|puffed/, "puffed-rice"], [/rice flour/, "rice-flour"],
  [/brown rice|matta/, "brown-rice"], [/basmati/, "basmati"], [/\brice\b/, "rice-grains"],
  [/chick ?peas|chana|kabuli|fried gram/, "chickpeas"], [/moong/, "moong"], [/\bdal\b|toor|masoor|urid|horse gram/, "lentils"],
  [/beans|rajma|lobia|white peas/, "beans"], [/peanut/, "peanuts"], [/cashew/, "cashews"], [/almond powder/, "almonds"], [/almond/, "almonds"],
  [/pista/, "pistachios"], [/raisin/, "raisins"], [/fig/, "figs"], [/vermicelli/, "vermicelli"], [/pink salt/, "pink-salt"], [/salt|kala namak/, "salt"],
  [/jaggery/, "jaggery"], [/sugar/, "sugar"], [/sesame/, "sesame"], [/fennel/, "fennel"], [/poppy/, "poppy"],
  [/mustard seeds|ajwan|kalonji|jowar seeds|pumpkin seeds/, "seeds"], [/tamarind sauce/, "chutney"], [/tamarind/, "tamarind"], [/soya/, "soya"],
  [/gulab jamun/, "gulab-jamun"], [/\bjam\b/, "jam"], [/chilli flakes|crushed chilli|chilli crushed/, "chilli-flakes"],
  [/chilli powder|chilli chutney powder|deggi mirchi/, "chilli-powder"], [/chilli sauce|sriracha|tabasco|hot sauce/, "chilli-sauce"],
  [/whole chilli|dried chilli|kashmiri whole|chilli whole/, "dried-chilli"], [/chilli pickle|pickle/, "pickle"], [/fried onion/, "fried-onions"],
  [/sago/, "sago"], [/bread crumb/, "breadcrumbs"], [/paprika/, "paprika"], [/ajinomoto/, "msg"],
  [/black cardamom/, "black-cardamom"], [/cardamom/, "cardamom"], [/cinnamon/, "cinnamon"], [/clove/, "cloves"],
  [/pepper powder|pepper ground|pepper coarse/, "pepper-powder"], [/pepper/, "pepper"], [/bay lea/, "bay-leaves"], [/star anis/, "star-anise"],
  [/coriander powder/, "coriander-powder"], [/coriander/, "coriander"], [/nutmeg|mace/, "nutmeg"], [/cumin powder/, "cumin-powder"], [/jeera soda/, "glass-soda"],
  [/jeera|cumin/, "cumin"], [/coconut milk/, "coconut-milk"], [/coconut (cooking )?oil|virgin coconut/, "coconut-oil"], [/coconut/, "coconut"],
  [/noodle|maggie noodles|yippee/, "noodles"], [/paste|haleem/, "curry-paste"], [/hing|inguva/, "hing"], [/meth/, "methi"], [/parsley|dagad|curry leaf/, "herbs"],
  [/turmeric/, "turmeric"], [/garam|masala|curry powder|sambar|rasam|tandoori|biryani|chat|nihari|paya|charmagaz|amchoor/, "garam-masala"],
  [/ginger|garlic powder/, "ginger"], [/baking powder/, "baking-powder"],
  [/gram flour|besan/, "gram-flour"], [/corn ?flour/, "cornflour"], [/semolina|rava|rawa|upma/, "semolina"], [/ragi|millet|jowar/, "millet"],
  [/atta|wheat/, "atta"], [/flour|maida/, "flour"],
  [/coffee|bru/, "coffee"], [/tea/, "tea"], [/boost|bournvita|horlicks|complan|chocolate/, "malt"],
  [/soy/, "soy-sauce"], [/mint sauce/, "mint-sauce"], [/ketchup/, "ketchup"], [/chutney/, "chutney"], [/sauce/, "sauce"],
  [/food colour/, "food-colour"], [/olive oil/, "olive-oil"], [/\boil\b/, "oil"], [/ghee/, "ghee"], [/condensed/, "condensed-milk"], [/custard/, "custard"], [/cream/, "cream"],
  [/mango/, "mango"], [/tomato/, "tomatoes"], [/can\b|canned|jackfruit/, "canned-food"], [/lemon|lime juice/, "lemon-juice"], [/vinegar/, "vinegar"],
  [/rose petal/, "rose-petals"], [/rose water|kewra|rose syrup/, "rose-water"], [/saffron/, "saffron"], [/washing up/, "dish-soap"],
  [/lychee|pineapple/, "canned-fruit"], [/vanilla/, "vanilla"], [/citric/, "citric-acid"],
  [/cola|coke|pepsi|thum/, "cola"], [/water/, "water"], [/sprite|7up|limca/, "lemon-soda"], [/fanta|mirinda|tango/, "orange-soda"], [/goli|soda/, "glass-soda"],
  [/pizza/, "pizza"], [/foil|alumin/, "foil-trays"], [/sauce cup|portion pot|souffle/, "sauce-cups"], [/\bcups?\b/, "cups"], [/\bbags?\b|carrier/, "bags"],
  [/cling|film|wrap/, "cling-film"], [/fork|spoon|knife|cutlery|stirrer/, "cutlery"], [/straw/, "straws"], [/napkin|tissue|roll|towel/, "napkins"],
  [/glove/, "gloves"], [/sack|bin liner|refuse/, "bin-bags"], [/clean|sanitis|bleach|wipe|detergent|soap|degreaser|disinfect|polish|sponge|scourer/, "cleaning"],
  [/plate|bowl/, "plates"], [/container|box|tray|clamshell|lid|tub|pot/, "containers"],
];

const FALLBACK: Record<string, string> = {
  rice: "rice-grains",
  "pulses-nuts-and-groceries": "lentils",
  "whole-spices": "spice-mix",
  "powders-and-ground-masala": "garam-masala",
  "flours-atta-and-rava": "flour",
  "tea-powders-and-milk-mix": "tea",
  sauces: "sauce",
  "food-colours": "food-colour",
  "restaurant-groceries": "canned-food",
  drinks: "soft-drinks",
  "restaurant-packing-and-cleaning": "packaging",
};

interface Product { category: string; name: string; slug: string; imagePath: string | null }

function products(): Product[] {
  const sql = readFileSync("data/import/catalogue-import.sql", "utf8");
  const out: Product[] = [];
  const re = /\('([a-z-]+)','((?:[^']|'')*)','([a-z0-9-]+)',(null|'(?:[^']|'')*'),(null|'(?:[^']|'')*'),'/g;
  for (const m of sql.matchAll(re)) {
    out.push({ category: m[1], name: m[2].replace(/''/g, "'"), slug: m[3], imagePath: m[5] === "null" ? null : m[5].slice(1, -1) });
  }
  return out;
}

export function themeFor(name: string, category: string): string {
  const n = name.toLowerCase();
  for (const [re, theme] of RULES) if (re.test(n)) return theme;
  return FALLBACK[category] ?? "packaging";
}

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const mode = process.argv[2];
const all = products().filter((p) => !p.imagePath);
if (mode === "plan") {
  const count = new Map<string, number>();
  for (const p of all) {
    const t = themeFor(p.name, p.category);
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  for (const [t, n] of [...count].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${t.padEnd(16)} ${QUERIES[t] ?? "!! no query"}`);
  console.log(`${all.length} products without a photo, ${count.size} themes`);
} else if (mode === "sql") {
  const file = JSON.parse(readFileSync("data/import/stock-photos.json", "utf8")) as ThemeFile;
  const lines = ["-- Generated by scripts/stock-photos.mts. Fills only products that still have no photo. Re-runnable.", ""];
  let filledCount = 0;
  const missing = new Set<string>();
  for (const p of all) {
    const t = themeFor(p.name, p.category);
    const photos = file.themes[t]?.photos ?? [];
    if (!photos.length) {
      missing.add(t);
      continue;
    }
    const photo = photos[hash(p.slug) % photos.length];
    lines.push(`update public.products set image_path = '${photo.url.replace(/'/g, "''")}' where slug = '${p.slug}' and image_path is null;`);
    filledCount++;
  }
  writeFileSync("data/import/stock-photos.sql", lines.join("\n") + "\n");
  console.log(`${filledCount} products get a photo; themes without photos: ${[...missing].join(", ") || "none"}`);
} else {
  console.error("Usage: stock-photos.mts plan | sql");
  process.exit(1);
}
