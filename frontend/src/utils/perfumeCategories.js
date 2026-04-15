export const PERFUME_CATEGORY_DEFINITIONS = [
    { id: 0, name: "Más Vendidos", slug: "mas-vendidos" },
    { id: 1, name: "Fragancias Masculinas", slug: "fragancias-masculinas" },
    { id: 2, name: "Fragancias Femeninas", slug: "fragancias-femeninas" },
    { id: 3, name: "Fragancias Unisex", slug: "fragancias-unisex" },
    { id: 4, name: "Perfumes Árabes", slug: "perfumes-arabes" },
    { id: 5, name: "Perfumes de Diseñador", slug: "perfumes-de-disenador" },
    { id: 6, name: "Perfumes de Nicho", slug: "perfumes-de-nicho" },
];

export const PERFUME_CATEGORY_NAMES = PERFUME_CATEGORY_DEFINITIONS.map((category) => category.name);

export const CATEGORY_ID_TO_NAME = PERFUME_CATEGORY_DEFINITIONS.reduce(
    (acc, category) => ({ ...acc, [category.id]: category.name }),
    {}
);

export const CATEGORY_NAME_TO_ID = {
    "Más Vendidos": 0,
    "Mas Vendidos": 0,
    "Fragancias Masculinas": 1,
    "Fragancias de Hombre": 1,
    Masculinos: 1,
    "Perfumes masculinos": 1,
    "Perfumes Masculinos": 1,
    "Fragancias Femeninas": 2,
    "Fragancias de Mujer": 2,
    Femeninos: 2,
    "Fragancias Unisex": 3,
    Unisex: 3,
    "Perfumes Árabes": 4,
    "Perfumes Arabes": 4,
    "Perfumes de Diseñador": 5,
    "Perfumes de Disenador": 5,
    "Perfumes de Nicho": 6,
};

export const LEGACY_CATEGORY_NAME_TO_CURRENT = {
    "Fragancias de Hombre": "Fragancias Masculinas",
    "Fragancias de Mujer": "Fragancias Femeninas",
    "Productos Karseell": "Fragancias Unisex",
    Masculinos: "Fragancias Masculinas",
    Femeninos: "Fragancias Femeninas",
    Unisex: "Fragancias Unisex",
    "Vapes Desechables": "Fragancias Masculinas",
    "Pods Recargables": "Fragancias Masculinas",
    "Líquidos": "Fragancias Femeninas",
    Resistencias: "Fragancias Unisex",
    Celulares: "Perfumes Árabes",
    Perfumes: "Perfumes de Diseñador",
    "Body splash victoria secret": "Perfumes de Nicho",
    "Body Splash Victoria Secret": "Perfumes de Nicho",
    "Perfumes de Disenador": "Perfumes de Diseñador",
};

export const SLUG_TO_NAME = PERFUME_CATEGORY_DEFINITIONS.reduce(
    (acc, category) => ({ ...acc, [category.slug]: category.name }),
    {
        "perfumes-masculinos": "Fragancias Masculinas",
        femeninos: "Fragancias Femeninas",
        unisex: "Fragancias Unisex",
        "vapes-desechables": "Fragancias Masculinas",
        "pods-recargables": "Fragancias Masculinas",
        liquidos: "Fragancias Femeninas",
        resistencias: "Fragancias Unisex",
        celulares: "Perfumes Árabes",
        perfumes: "Perfumes de Diseñador",
    }
);

export const SLUG_TO_ID = PERFUME_CATEGORY_DEFINITIONS.reduce(
    (acc, category) => ({ ...acc, [category.slug]: category.id }),
    {
        "perfumes-masculinos": 1,
        femeninos: 2,
        unisex: 3,
        "vapes-desechables": 1,
        "pods-recargables": 1,
        liquidos: 2,
        resistencias: 3,
        celulares: 4,
        perfumes: 5,
    }
);

export const NAME_TO_SLUG = {
    "Más Vendidos": "mas-vendidos",
    "Mas Vendidos": "mas-vendidos",
    "Fragancias Masculinas": "fragancias-masculinas",
    "Fragancias de Hombre": "fragancias-masculinas",
    Masculinos: "fragancias-masculinas",
    "Perfumes masculinos": "fragancias-masculinas",
    "Perfumes Masculinos": "fragancias-masculinas",
    "Fragancias Femeninas": "fragancias-femeninas",
    "Fragancias de Mujer": "fragancias-femeninas",
    Femeninos: "fragancias-femeninas",
    "Fragancias Unisex": "fragancias-unisex",
    Unisex: "fragancias-unisex",
    "Perfumes Árabes": "perfumes-arabes",
    "Perfumes Arabes": "perfumes-arabes",
    "Perfumes de Diseñador": "perfumes-de-disenador",
    "Perfumes de Disenador": "perfumes-de-disenador",
    "Perfumes de Nicho": "perfumes-de-nicho",
    "Vapes Desechables": "mas-vendidos",
    "Pods Recargables": "fragancias-masculinas",
    "Líquidos": "fragancias-femeninas",
    Resistencias: "fragancias-unisex",
    Celulares: "perfumes-arabes",
    Perfumes: "perfumes-de-disenador",
    "Body splash victoria secret": "perfumes-de-nicho",
    "Body Splash Victoria Secret": "perfumes-de-nicho",
};

export const mapCategoryIdFromName = (value = "") => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (normalized.includes("mas vendido")) return 1;
    if (normalized.includes("mascul")) return 1;
    if (normalized.includes("hombre")) return 1;
    if (normalized.includes("femen")) return 2;
    if (normalized.includes("mujer")) return 2;
    if (normalized.includes("unisex")) return 3;
    if (normalized.includes("arab")) return 4;
    if (normalized.includes("disen")) return 5;
    if (normalized.includes("nicho")) return 6;
    if (normalized.includes("perfume")) return 4;
    return 1;
};

export const getDisplayCategoryName = (product) => {
    const byId = CATEGORY_ID_TO_NAME[Number(product?.category_id)];
    if (byId) return byId;

    const raw = String(product?.category_name || "").trim();
    if (!raw) return "Sin categoría";

    return LEGACY_CATEGORY_NAME_TO_CURRENT[raw] || raw;
};
