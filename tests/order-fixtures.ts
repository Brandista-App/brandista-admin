import type { MerchantOrderDetail, MerchantOrderSummary } from '../src/api/types'

export const orderBrands = [
  { id: 3, name: 'Atelier A', slug: 'atelier-a', logoReference: null },
  { id: 4, name: 'Studio B', slug: 'studio-b', logoReference: null },
]
export function orderSummary(brandId = 3, orderId = 701): MerchantOrderSummary {
  return {
    orderId,
    brandId,
    createdAt: '2026-10-21T10:00:00',
    fulfillmentStatus: 'PLACED',
    version: 0,
    currency: 'PKR',
    itemsSubtotal: 2750.5,
    lineCount: 1,
    availableTransitions: ['ACCEPTED'],
  }
}
export function orderDetail(brandId = 3, orderId = 701): MerchantOrderDetail {
  return {
    order: orderSummary(brandId, orderId),
    deliveryAddress: {
      recipientName: 'Synthetic Recipient',
      phoneNumber: '+92 300 1234567',
      addressLine1: 'Synthetic street',
      addressLine2: null,
      city: 'Synthetic city',
      province: 'Punjab',
      postalCode: '00000',
      deliveryInstructions: 'Synthetic delivery note',
    },
    items: [
      {
        productId: 10,
        productSlug: 'linen-shirt',
        productName: brandId === 3 ? 'Brand A linen shirt' : 'Brand B scarf',
        brandId,
        brandName: brandId === 3 ? 'Atelier A' : 'Studio B',
        quantity: 1,
        unitPrice: 2750.5,
        lineSubtotal: 2750.5,
      },
    ],
    timeline: [],
  }
}
