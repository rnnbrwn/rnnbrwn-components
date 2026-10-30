<?php
// Navigation: the site header, with the logo (or the site title) and the main links, which
// sit behind a menu button on small screens. It's on every page, so it has its own page in
// wp-admin (Navigation) rather than being one of a page's sections.
// Astro half: rnnbrwn-components/src/Navigation.astro
//
// The links come from either:
//   - a WordPress menu (Appearance → Menus) set to the "Main navigation" location, or
//   - sections with an Anchor ID, picked from a list (for one-page sites).

register_nav_menus( [ 'main_navigation' => 'Main navigation' ] );

acf_add_options_page( [
	'page_title'         => 'Navigation',
	'menu_title'         => 'Navigation',
	'menu_slug'          => 'rnnbrwn-navigation',
	'capability'         => 'edit_pages',
	'icon_url'           => 'dashicons-menu',
	'position'           => 21,
	'show_in_graphql'    => true,
	'graphql_field_name' => 'navigationSettings',
] );

acf_add_local_field_group( [
	'key'    => 'group_rs_navigation',
	'title'  => 'Navigation',
	'fields' => [
		rs_image( 'navigation', 'logo', 'Logo', [
			'instructions' => 'Optional: without one, the site title is shown. PNG, JPG or WebP (WordPress doesn\'t accept SVG uploads). Screen readers announce it as the site title.',
		] ),
		rs_image( 'navigation', 'logo_dark', 'Logo for dark backgrounds', [
			'instructions' => 'Optional: a light version of the logo, shown when the navigation is on a Black or Brand background (for example on a dark page). Without one, the logo above is used everywhere.',
		] ),
		rs_field( 'navigation', 'radio', 'source', 'Links', [
			'choices'       => [
				'menu'     => 'A WordPress menu',
				'sections' => 'Sections on the site (for one-page sites)',
			],
			'default_value' => 'menu',
			'return_format' => 'value',
			'layout'        => 'vertical',
		] ),
		rs_field( 'navigation', 'message', 'menu_help', 'WordPress menu', [
			'message'           => 'Edit the links in <a href="' . admin_url( 'nav-menus.php' ) . '">Appearance → Menus</a>: add pages or custom links (a custom link can be an anchor like <code>/#contact</code>), then tick <strong>Main navigation</strong> under "Menu Settings → Display location". To give a link sub-links, drag items under it (slightly to the right): they open in a dropdown on wider screens and are listed under it on phones. Only one level of sub-links is shown.',
			'conditional_logic' => rs_when( 'navigation', 'source', 'menu' ),
		] ),
		// Repeater names must be unique across everything (see sections.php), hence navigation_sections.
		rs_field( 'navigation', 'repeater', 'navigation_sections', 'Sections to link to', [
			'button_label'      => 'Add link',
			'layout'            => 'table',
			'instructions'      => 'Only sections with an Anchor ID (in their Settings tab) are listed.',
			'conditional_logic' => rs_when( 'navigation', 'source', 'sections' ),
			'sub_fields'        => [
				rs_field( 'navigation_sections', 'select', 'target', 'Section', [
					'choices'       => [],  // filled in below
					'return_format' => 'value',
					'ui'            => 1,
					'required'      => 1,
				] ),
				rs_field( 'navigation_sections', 'text', 'label', 'Menu label', [ 'required' => 1 ] ),
			],
		] ),
		rs_background( 'navigation' ),
		rs_select( 'navigation', 'width', 'Width', array_intersect_key( RNNBRWN_SECTIONS_LANES, [ 'content' => 1, 'wide' => 1 ] ), 'wide', [
			'instructions' => 'Line the logo and links up with the page\'s Content or Wide sections.',
		] ),
	],
	'location'           => [ [ [ 'param' => 'options_page', 'operator' => '==', 'value' => 'rnnbrwn-navigation' ] ] ],
	'show_in_graphql'    => 1,
	'graphql_field_name' => 'navigation',
] );

// The "Section" dropdown lists every section with an Anchor ID, on every page built from
// sections, e.g. "Home: Our services (#services)". The value saved is the link itself
// ("/#services", "/about/#team"), so it works from any page. Only worked out in wp-admin.
add_filter( 'acf/load_field/key=field_rs_navigation_sections_target', function ( $field ) {
	if ( ! is_admin() ) {
		return $field;
	}
	$pages = get_posts( [ 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'menu_order title', 'order' => 'ASC' ] );
	foreach ( $pages as $page ) {
		$path = 'home' === $page->post_name ? '/' : wp_make_link_relative( get_permalink( $page ) );
		foreach ( (array) get_field( 'sections', $page->ID ) as $section ) {
			$anchor = sanitize_title( $section['anchor'] ?? '' );
			if ( $anchor ) {
				$heading = wp_strip_all_tags( $section['heading'] ?? '' ) ?: $section['acf_fc_layout'];
				$field['choices'][ "{$path}#{$anchor}" ] = "{$page->post_title}: {$heading} (#{$anchor})";
			}
		}
	}
	return $field;
} );
