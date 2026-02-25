let wholesale = false;

export const setWholesaleMode = (value) => {
    wholesale = value;
};

export const isWholesaleMode = () => wholesale;

// ✅ AGREGA ESTO
export const withWholesale = (path) => {
    return wholesale ? `/mayorista${path}` : path;
};