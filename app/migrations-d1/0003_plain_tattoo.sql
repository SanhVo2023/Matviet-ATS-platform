ALTER TABLE `candidates` ADD `offer_token` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `offer_token_expires_at` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `offer_response` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `offer_responded_at` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `offer_response_note` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `expected_start_date` text;--> statement-breakpoint
ALTER TABLE `candidates` ADD `consent_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_candidates_offer_token` ON `candidates` (`offer_token`);--> statement-breakpoint
-- G12 data migration: the offer template gains the magic-link CTA. The
-- offer_link value is injected server-side at compose time (composeFromTemplate).
UPDATE email_templates
SET body_html = body_html || '<p>Vui lòng xác nhận quyết định của bạn tại đây: <a href="{{offer_link}}">Xác nhận nhận việc</a> (liên kết có hiệu lực 7 ngày).</p>',
    variables = json_insert(variables, '$[#]', 'offer_link'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE code = 'offer' AND body_html NOT LIKE '%offer_link%';
