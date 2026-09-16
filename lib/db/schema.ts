import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => ({ userIdIdx: index('session_userId_idx').on(table.userId) }))

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
}, (table) => ({ userIdIdx: index('account_userId_idx').on(table.userId) }))

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ identifierIdx: index('verification_identifier_idx').on(table.identifier) }))

export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(), nameEn: text('name_en').notNull(), nameAr: text('name_ar').notNull(), descriptionEn: text('description_en'), descriptionAr: text('description_ar'), category: text('category').notNull(), price: numeric('price', { precision: 10, scale: 2 }).notNull(), prepHours: integer('prep_hours').notNull(), available: boolean('available').notNull().default(true), imageUrl: text('image_url'), sortOrder: integer('sort_order').notNull().default(0), unit: text('unit').notNull().default('piece'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const menuItemServices = pgTable('menu_item_services', { id: text('id').primaryKey(), menuItemId: text('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }), name: text('name').notNull(), nameAr: text('name_ar'), fee: numeric('fee', { precision: 10, scale: 2 }).notNull().default('0') })

export const orders = pgTable('orders', { id: text('id').primaryKey(), orderNumber: text('order_number').notNull(), customerName: text('customer_name').notNull(), customerPhone: text('customer_phone').notNull(), deliveryAddress: text('delivery_address'), fulfillment: text('fulfillment').notNull(), readyDate: text('ready_date').notNull(), itemsSubtotal: numeric('items_subtotal', { precision: 10, scale: 2 }).notNull(), servicesTotal: numeric('services_total', { precision: 10, scale: 2 }).notNull(), deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull(), total: numeric('total', { precision: 10, scale: 2 }).notNull(), depositDue: numeric('deposit_due', { precision: 10, scale: 2 }).notNull(), balanceRemaining: numeric('balance_remaining', { precision: 10, scale: 2 }).notNull(), paymentMethod: text('payment_method').notNull(), paymentStatus: text('payment_status').notNull(), depositPaid: boolean('deposit_paid').notNull().default(false), balancePaid: boolean('balance_paid').notNull().default(false), paymentReference: text('payment_reference'), paymentProofUrl: text('payment_proof_url'), verifiedBy: text('verified_by').references(() => user.id, { onDelete: 'set null' }), verifiedAt: timestamp('verified_at', { withTimezone: true }), lastVerifiedBy: text('last_verified_by').references(() => user.id, { onDelete: 'set null' }), lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }), readyAt: timestamp('ready_at', { withTimezone: true }), status: text('status').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), }, (table) => ({ orderNumberUnique: uniqueIndex('orders_order_number_unique_idx').on(table.orderNumber), createdAtIdx: index('orders_created_at_idx').on(table.createdAt), customerPhoneIdx: index('orders_customer_phone_idx').on(table.customerPhone), statusCheck: check('orders_status_check', sql`${table.status} IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')`), paymentStatusCheck: check('orders_payment_status_check', sql`${table.paymentStatus} IN ('unpaid', 'partially_paid', 'paid', 'refunded')`), fulfillmentCheck: check('orders_fulfillment_check', sql`${table.fulfillment} IN ('delivery', 'pickup')`), paymentMethodCheck: check('orders_payment_method_check', sql`${table.paymentMethod} IN ('whish', 'omt', 'cash')`) }))

export const settings = pgTable('settings', { id: integer('id').primaryKey().default(1), serviceFee: numeric('service_fee', { precision: 10, scale: 2 }).notNull().default('0'), deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'), whatsappNumber: text('whatsapp_number').notNull().default('96100000000'), minPrepHoursNotice: integer('min_prep_hours_notice').notNull().default(24) })

export const orderItems = pgTable('order_items', { id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }), menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }), nameSnapshot: text('name_snapshot').notNull(), priceSnapshot: numeric('price_snapshot', { precision: 10, scale: 2 }).notNull(), quantity: integer('quantity').notNull(), selectedService: text('selected_service'), serviceFeeSnapshot: numeric('service_fee_snapshot', { precision: 10, scale: 2 }).notNull().default('0') })


