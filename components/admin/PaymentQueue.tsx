'use client'

import { OrderTable, type Order } from './OrderTable'

export function PaymentQueue(props: Omit<React.ComponentProps<typeof OrderTable>, 'paymentsOnly'>) {
  return <OrderTable {...props} paymentsOnly />
}
