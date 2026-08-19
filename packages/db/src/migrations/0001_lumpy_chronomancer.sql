CREATE TABLE "booking" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text,
	"order_no" text PRIMARY KEY NOT NULL,
	"payload" jsonb,
	"pnr" text,
	"principal_id" text,
	"status" text NOT NULL,
	"total_amount" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_userId_idx" ON "booking" USING btree ("user_id");