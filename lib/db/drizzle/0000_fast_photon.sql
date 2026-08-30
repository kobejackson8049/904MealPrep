CREATE TABLE "meal_prep_admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_prep_admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "meal_prep_business_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT '904 Meal Prepz' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"pickup_information" text DEFAULT '' NOT NULL,
	"announcement" text DEFAULT '' NOT NULL,
	"standard_price" numeric(10, 2) DEFAULT '8' NOT NULL,
	"premium_charge" numeric(10, 2) DEFAULT '2' NOT NULL,
	"show_demo_label" boolean DEFAULT false NOT NULL,
	"cash_app_handle" text DEFAULT '' NOT NULL,
	"venmo_handle" text DEFAULT '' NOT NULL,
	"zelle_contact" text DEFAULT '' NOT NULL,
	"cash_app_qr_path" text DEFAULT '' NOT NULL,
	"venmo_qr_path" text DEFAULT '' NOT NULL,
	"zelle_qr_path" text DEFAULT '' NOT NULL,
	"cash_app_enabled" boolean DEFAULT true NOT NULL,
	"venmo_enabled" boolean DEFAULT true NOT NULL,
	"zelle_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_prep_customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "meal_prep_delivery_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fee" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_email_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"event_type" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_mode" text DEFAULT 'demo' NOT NULL,
	"delivered_at" timestamp with time zone,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_meals" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"meal_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"premium_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"calories" integer NOT NULL,
	"protein" integer NOT NULL,
	"carbs" integer NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"sold_out" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"meal_id" text NOT NULL,
	"meal_name_snapshot" text DEFAULT '' NOT NULL,
	"meal_number_snapshot" integer DEFAULT 0 NOT NULL,
	"category_snapshot" text DEFAULT '' NOT NULL,
	"unit_price_snapshot" numeric(10, 2) DEFAULT '0' NOT NULL,
	"premium_charge_snapshot" numeric(10, 2) DEFAULT '0' NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"menu_id" text NOT NULL,
	"fulfillment" text NOT NULL,
	"pickup_window" text DEFAULT '' NOT NULL,
	"delivery_zone" text DEFAULT '' NOT NULL,
	"delivery_address" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"meal_subtotal" numeric(10, 2) NOT NULL,
	"premium_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" text DEFAULT 'square' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"expected_sender_name" text DEFAULT '' NOT NULL,
	"payment_submitted_at" timestamp with time zone,
	"payment_confirmed_at" timestamp with time zone,
	"payment_confirmed_by" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"square_checkout_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_prep_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "meal_prep_payment_confirmations" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"payment_method" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"expected_sender_name" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_prep_weekly_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"week_label" text NOT NULL,
	"order_deadline" timestamp with time zone NOT NULL,
	"deadline_label" text NOT NULL,
	"announcement" text DEFAULT '' NOT NULL,
	"pickup_windows" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_prep_admin_notifications" ADD CONSTRAINT "meal_prep_admin_notifications_order_id_meal_prep_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."meal_prep_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_email_events" ADD CONSTRAINT "meal_prep_email_events_order_id_meal_prep_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."meal_prep_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_meals" ADD CONSTRAINT "meal_prep_meals_menu_id_meal_prep_weekly_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."meal_prep_weekly_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_order_items" ADD CONSTRAINT "meal_prep_order_items_order_id_meal_prep_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."meal_prep_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_order_items" ADD CONSTRAINT "meal_prep_order_items_meal_id_meal_prep_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_prep_meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_orders" ADD CONSTRAINT "meal_prep_orders_customer_id_meal_prep_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."meal_prep_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_orders" ADD CONSTRAINT "meal_prep_orders_menu_id_meal_prep_weekly_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."meal_prep_weekly_menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_payment_confirmations" ADD CONSTRAINT "meal_prep_payment_confirmations_order_id_meal_prep_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."meal_prep_orders"("id") ON DELETE cascade ON UPDATE no action;