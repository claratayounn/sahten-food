CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON public.orders (customer_phone);
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded'));
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_check CHECK (fulfillment IN ('delivery', 'pickup'));
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('whish', 'omt', 'cash'));
