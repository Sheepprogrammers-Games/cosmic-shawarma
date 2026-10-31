const EMPTY_WRAP = { meat: 0, tentacle: 0, sauce: 0, pepper: 0, fries: 0, syrup: 0 };

export function createProduct() {
  return { wrap: { ...EMPTY_WRAP }, snack: null, drink: null, heats: [], friesBest: false, rolled: false, packed: false };
}

export function copyProduct(product) {
  return { ...product, wrap: { ...product.wrap }, heats: [...product.heats] };
}

export function productHasContent(product) {
  return Object.values(product.wrap).some(Boolean) || product.snack || product.drink;
}
