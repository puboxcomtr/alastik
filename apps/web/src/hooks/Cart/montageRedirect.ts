import { ROUTES } from '@/src/config/routes';
import { getProductType } from '@/src/hooks/Products/productHelpers';
import type { Product } from '@/src/types/products';

/** LJA: lastik sepete eklenince müşteri montaj noktası seçimine yönlendirilir */
export const shouldRedirectToMontage = (product: Product): boolean => getProductType(product) === 'LASTIK';

export const MONTAGE_REDIRECT_PATH = ROUTES.MONTAGE;
