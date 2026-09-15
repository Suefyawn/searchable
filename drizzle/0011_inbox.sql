CREATE TABLE "inbox_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"mailbox" text NOT NULL,
	"from_address" text NOT NULL,
	"from_name" text,
	"to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_to" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text NOT NULL,
	"snippet" text NOT NULL,
	"text" text,
	"has_html" integer DEFAULT 0 NOT NULL,
	"message_id" text,
	"in_reply_to" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"read_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inbox_messages_status_idx" ON "inbox_messages" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "inbox_messages_mailbox_idx" ON "inbox_messages" USING btree ("mailbox","received_at");