CREATE TABLE "fare_search" (
	"adults" integer DEFAULT 1 NOT NULL,
	"cabin" text NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text NOT NULL,
	"departure_date" text NOT NULL,
	"destination" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"infants" integer DEFAULT 0 NOT NULL,
	"origin" text NOT NULL,
	"request_id" text,
	"result_count" integer DEFAULT 0 NOT NULL,
	"return_date" text,
	"trip_type" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_fare" (
	"airline" text NOT NULL,
	"baggage_included" boolean DEFAULT false NOT NULL,
	"cabin" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text NOT NULL,
	"flight_numbers" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"price_at_save" numeric(12, 2) NOT NULL,
	"routing_identifier" text,
	"search_id" text,
	"stops" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fare_search" ADD CONSTRAINT "fare_search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_fare" ADD CONSTRAINT "saved_fare_search_id_fare_search_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."fare_search"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_fare" ADD CONSTRAINT "saved_fare_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fare_search_userId_idx" ON "fare_search" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fare_search_createdAt_idx" ON "fare_search" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "fare_search_route_idx" ON "fare_search" USING btree ("origin","destination");--> statement-breakpoint
CREATE INDEX "saved_fare_userId_idx" ON "saved_fare" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_fare_searchId_idx" ON "saved_fare" USING btree ("search_id");