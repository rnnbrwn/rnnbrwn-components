<?php
// Footer: the end of every page, with the logo (or the site title), a short text, buttons,
// social links, columns of links and a small-print line; or, with the Single line layout, only
// the small-print line. It's on every page, so it has its own page in wp-admin (Footer) rather
// than being one of a page's sections.
// Astro half: rnnbrwn-components/src/Footer.astro
//
// The links come from WordPress menus (Appearance → Menus):
//   - "Footer": items with sub-items become columns (the item is the column heading); items
//     without any are listed together in a first column with no heading.
//   - "Footer small print": a short row of links beside the © line (Privacy, Terms).

register_nav_menus( [
	'footer_navigation'  => 'Footer',
	'footer_small_print' => 'Footer small print',
] );

acf_add_options_page( [
	'page_title'         => 'Footer',
	'menu_title'         => 'Footer',
	'menu_slug'          => 'rnnbrwn-footer',
	'capability'         => 'edit_pages',
	'icon_url'           => 'dashicons-align-full-width',
	'position'           => 22,
	'show_in_graphql'    => true,
	'graphql_field_name' => 'footerSettings',
] );

// The Platform choices; the keys must match SOCIAL_PLATFORMS in rnnbrwn-components/src/social-icons.ts.
const RNNBRWN_FOOTER_PLATFORMS = [
	'bluesky'   => 'Bluesky',
	'mastodon'  => 'Mastodon',
	'instagram' => 'Instagram',
	'threads'   => 'Threads',
	'facebook'  => 'Facebook',
	'linkedin'  => 'LinkedIn',
	'x'         => 'X (Twitter)',
	'youtube'   => 'YouTube',
	'tiktok'    => 'TikTok',
	'github'    => 'GitHub',
	'spotify'   => 'Spotify',
	'vimeo'     => 'Vimeo',
	'pinterest' => 'Pinterest',
	'email'     => 'Email',
	'website'   => 'Website',
];

acf_add_local_field_group( [
	'key'    => 'group_rs_footer',
	'title'  => 'Footer',
	'fields' => [
		// Above the tabs, so it's always in view: Single line hides the tabs it doesn't use.
		rs_field( 'footer', 'radio', 'layout', 'Layout', [
			'choices'       => [
				'full' => 'Full: logo, text, buttons, social links, columns of links and a small-print line',
				'line' => 'Single line: only a line of text (set in the Small print tab)',
			],
			'default_value' => 'full',
			'return_format' => 'value',
			'layout'        => 'vertical',
		] ),
		rs_field( 'footer', 'tab', 'content_tab', 'Content', [ 'conditional_logic' => rs_when( 'footer', 'layout', 'line', '!=' ) ] ),
		rs_image( 'footer', 'logo', 'Logo', [
			'instructions' => 'Optional: without one, the site title is shown. PNG, JPG or WebP. Screen readers announce it as the site title.',
		] ),
		rs_image( 'footer', 'logo_dark', 'Logo for dark backgrounds', [
			'instructions' => 'Optional: a light version of the logo, shown when the footer is on a Black or Brand background. Without one, the logo above is used everywhere.',
		] ),
		rs_textarea( 'footer', 'text', 'Short text', 3, [
			'instructions' => 'Optional: a sentence or two under the logo, e.g. what the business does.',
		] ),
		rs_buttons( 'footer' ),
		rs_field( 'footer', 'message', 'menu_help', 'Links', [
			'message' => 'Edit the footer\'s links in <a href="' . admin_url( 'nav-menus.php' ) . '">Appearance → Menus</a>, in a menu with <strong>Footer</strong> ticked under "Menu Settings → Display location". To make a column, add an item for its heading (a custom link to <code>#</code> if the heading shouldn\'t go anywhere) and drag the column\'s links under it. Items with nothing under them are listed together in the first column.',
		] ),

		rs_field( 'footer', 'tab', 'social_tab', 'Social links', [ 'conditional_logic' => rs_when( 'footer', 'layout', 'line', '!=' ) ] ),
		// Repeater names must be unique across everything (see sections.php), hence footer_social.
		rs_field( 'footer', 'repeater', 'footer_social', 'Social links', [
			'instructions' => 'Optional. Shown as icons under the short text; screen readers read out the platform\'s name.',
			'layout'       => 'table',
			'button_label' => 'Add social link',
			'sub_fields'   => [
				rs_select( 'footer_social', 'platform', 'Platform', RNNBRWN_FOOTER_PLATFORMS, 'bluesky', [ 'required' => 1 ] ),
				rs_field( 'footer_social', 'text', 'url', 'Address', [
					'instructions' => 'The full address of the profile, e.g. https://bsky.app/profile/… (for Email: mailto:hello@example.com).',
					'required'     => 1,
				] ),
			],
		] ),

		rs_field( 'footer', 'tab', 'small_print_tab', 'Small print' ),
		rs_field( 'footer', 'true_false', 'show_copyright', 'Show © and the year', [
			'instructions'  => 'Start the line with "© 2026 Name". Untick it to write the whole line yourself in Small print below.',
			'default_value' => 1,
			'ui'            => 1,
		] ),
		rs_field( 'footer', 'text', 'copyright_name', 'Name after ©', [
			'instructions'      => 'Optional: the name in "© 2026 Name". Without one, the site title is used.',
			'conditional_logic' => rs_when( 'footer', 'show_copyright', '1' ),
		] ),
		rs_field( 'footer', 'number', 'copyright_from', 'First year', [
			'instructions'      => 'Optional: the year the site or business started, to show "© 2001–2026". The current year is always added automatically.',
			'min'               => 1900,
			'max'               => 2100,
			'step'              => 1,
			'conditional_logic' => rs_when( 'footer', 'show_copyright', '1' ),
		] ),
		rs_field( 'footer', 'text', 'small_print', 'Small print', [
			'instructions' => 'Optional: text after "© 2026 Name", e.g. "All rights reserved." or a company number; or, with © switched off, the whole line.',
		] ),
		rs_field( 'footer', 'message', 'small_print_help', 'Small print links', [
			'conditional_logic' => rs_when( 'footer', 'layout', 'line', '!=' ),
			'message' => 'Links such as Privacy and Terms go in a menu with <strong>Footer small print</strong> ticked under "Menu Settings → Display location" (<a href="' . admin_url( 'nav-menus.php' ) . '">Appearance → Menus</a>).',
		] ),

		rs_field( 'footer', 'tab', 'settings_tab', 'Settings' ),
		rs_background( 'footer' ),
		rs_select( 'footer', 'width', 'Width', array_intersect_key( RNNBRWN_SECTIONS_LANES, [ 'content' => 1, 'wide' => 1 ] ), 'wide', [
			'instructions' => 'Line the footer up with the page\'s Content or Wide sections (usually the same as Navigation).',
		] ),
	],
	'location'           => [ [ [ 'param' => 'options_page', 'operator' => '==', 'value' => 'rnnbrwn-footer' ] ] ],
	'show_in_graphql'    => 1,
	'graphql_field_name' => 'footer',
] );
