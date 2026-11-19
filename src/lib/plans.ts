export const plans = {
  free: { name: 'Free', boxes: 10, members: 2, photos: 10 },
  family: { name: 'Family', price: '€29', boxes: 200, members: 5, photos: 200 },
} as const

export const billingEnabled = import.meta.env.VITE_BILLING_ENABLED === 'true'
