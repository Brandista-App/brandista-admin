export function stockLabel(quantity: number) {
  return quantity === 0 ? 'Out of stock' : quantity <= 5 ? 'Low stock' : 'In stock'
}
export function validQuantity(value: string) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647
}
export function validPrice(value: string) {
  return /^\d{1,10}(\.\d{1,2})?$/.test(value)
}
