export const PRODUCT_CATEGORIES = [
  { id: 'vase', label: 'Vas', group: 'vase' },
  { id: 'bowl', label: 'Skål', group: 'bowl' },
  { id: 'artwork', label: 'Konstverk', group: 'artwork' },
  { id: 'jar', label: 'Burk', group: 'jar' },
  { id: 'lantern', label: 'Ljuslykta', group: 'lantern' },
  { id: 'other', label: 'Övrigt', group: 'other' },
] as const;

export type ProductCategoryId = (typeof PRODUCT_CATEGORIES)[number]['id'];
export type ProductFilterId = 'all' | ProductCategoryId;

export const SHOP_FILTERS: { id: ProductFilterId; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'vase', label: 'Vaser' },
  { id: 'bowl', label: 'Skålar' },
  { id: 'artwork', label: 'Konstverk' },
  { id: 'jar', label: 'Burkar' },
  { id: 'lantern', label: 'Ljuslyktor' },
  { id: 'other', label: 'Övrigt' },
];

export function isProductCategoryId(value: string | undefined | null): value is ProductCategoryId {
  return PRODUCT_CATEGORIES.some((category) => category.id === value);
}

export function categoryLabel(category: string | undefined | null): string {
  return PRODUCT_CATEGORIES.find((item) => item.id === category)?.label ?? 'Övrigt';
}

export function categoryGroup(category: string | undefined | null): Exclude<ProductFilterId, 'all'> {
  const match = PRODUCT_CATEGORIES.find((item) => item.id === category);
  return match?.group ?? 'other';
}
