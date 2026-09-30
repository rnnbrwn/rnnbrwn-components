<?php
// Creates (or refreshes) the component test pages shown at rnnbrwn.xyz/components/:
// a "Components" overview page, one child page per component (/components/hero/ ...) on the
// Sections template holding test versions of that component, a "Sections" page listing the
// sections, a "Parts" page listing the parts (see $part_names), a "Site" page listing the Navigation and Footer test pages, the test Navigation
// menu linking them, and the test Footer and its menus. Safe to re-run: it updates the pages instead of duplicating them.
// When a component is added to the library, give it a page below and add its test rows.
//
// Run from platform/rnnbrwn-cms:
//   export SITE=rnnbrwn-xyz DB_NAME=cms_rnnbrwn_xyz
//   docker compose --env-file .env.local run --rm -T wpcli eval "$(sed 1d ../rnnbrwn-components/showcase/seed.php)"

// ---------- Pages ----------

$test_page = function ( $slug, $title, $parent = 0, $order = 0 ) {
	$page = get_page_by_path( $parent ? "components/{$slug}" : $slug );
	$id   = $page ? $page->ID : wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug ] );
	wp_update_post( [ 'ID' => $id, 'post_title' => $title, 'post_parent' => $parent, 'menu_order' => $order ] );
	update_post_meta( $id, '_wp_page_template', 'template-sections.php' );
	// Page settings: a white page (the test pages' preview switch can show the others).
	update_field( 'field_rs_page_background', 'white', $id );
	return $id;
};

$id              = $test_page( 'components', 'Components' );
$component_pages = [
	'hero'        => $test_page( 'hero', 'Hero', $id, 1 ),
	'rich_text'   => $test_page( 'rich-text', 'Rich Text', $id, 2 ),
	'card_grid'   => $test_page( 'card-grid', 'Card Grid', $id, 3 ),
	'media_text'  => $test_page( 'media-text', 'Media Text', $id, 4 ),
	'accordion'   => $test_page( 'accordion', 'Accordion', $id, 5 ),
	'stats'       => $test_page( 'stats', 'Stats', $id, 6 ),
	'testimonials' => $test_page( 'testimonials', 'Testimonials', $id, 7 ),
	'logo_strip'  => $test_page( 'logo-strip', 'Logo Strip', $id, 8 ),
	'contact_bar' => $test_page( 'contact-bar', 'Contact Bar', $id, 9 ),
	'cta_banner'  => $test_page( 'cta-banner', 'CTA Banner', $id, 10 ),
	'buttons'     => $test_page( 'buttons', 'Buttons', $id, 11 ),
	'placeholder' => $test_page( 'placeholder', 'Placeholder', $id, 12 ),
];
// Sections are what an editor adds to a page; parts are shared pieces that sections are built
// from (Buttons is both: its own section, and the buttons inside Hero). In the test menu the
// sections sit under "Sections" and the parts under "Parts", each a page of its own
// (/components/sections/, /components/parts/) that lists them.
$sections_id = $test_page( 'sections', 'Sections', $id, 0 );
$part_names = [ 'buttons', 'placeholder' ];
$parts_id   = $test_page( 'parts', 'Parts', $id, 13 );
// Site components (Navigation, Footer) are on every page of a real site and edited on their own
// wp-admin pages, not added as sections. Each has a test page showing it around a little text,
// under "Site" (/components/site/), which lists them as Parts lists the parts.
$site_id    = $test_page( 'site', 'Site', $id, 12 );
$site_pages = [
	'navigation' => $test_page( 'navigation', 'Navigation', $id, 13 ),
	'footer'     => $test_page( 'footer', 'Footer', $id, 14 ),
];

// The Example Site: a realistic page built from the components, which Ronnie adds to in wp-admin
// as components are built. Unlike the test pages, the seed never changes it once it exists
// (its starter content, at the end, only goes in while it has no sections).
$example_page = get_page_by_path( 'components/example-site' );
$example_id   = $example_page ? $example_page->ID : wp_insert_post( [
	'post_type'   => 'page',
	'post_status' => 'publish',
	'post_name'   => 'example-site',
	'post_title'  => 'Example Site',
	'post_parent' => $id,
	'menu_order'  => 0,
	'meta_input'  => [ '_wp_page_template' => 'template-sections.php' ],
] );
if ( ! $example_page ) {
	update_field( 'field_rs_page_background', 'white', $example_id );
}

// ---------- Section helpers ----------

// One section: its layout, its own fields, the shared Settings tab's defaults (or the layout's
// own, in $fields), then this row's changes ($settings).
$section = fn( $layout, $fields, $settings = [] ) => array_merge(
	[ 'acf_fc_layout' => $layout, 'width' => 'content', 'spacing' => 'm', 'background' => 'page', 'anchor' => '' ],
	$fields,
	$settings
);

// A link field's value. Paths ("/contact/") become addresses on the CMS, as the link box saves them.
$link   = fn( $title, $url = '/contact/', $target = '' ) => [ 'title' => $title, 'url' => str_starts_with( $url, '/' ) ? home_url( $url ) : $url, 'target' => $target ];
// One row of a buttons field (rs_buttons).
$button = fn( $title, $style, $url = '/contact/', $target = '' ) => [ 'link' => $link( $title, $url, $target ), 'style' => $style ];

// ---------- Placeholder: every width, background and spacing option of the shared settings ----------
$placeholder = fn( $heading, $settings, $note = '' ) => $section( 'placeholder', [
	'heading' => $heading,
	'note'    => $note,
], $settings );

// ---------- Navigation (site-wide: wp-admin → Navigation) ----------

// Test logos, drawn here so the seed needs no image files. Made once, then reused.
// $text is the lettering colour: dark for the normal logo, white for dark backgrounds.
$test_logo = function ( $option, $name, $text ) {
	$id = (int) get_option( $option );
	if ( $id && get_post( $id ) ) {
		return $id;
	}
	$small = imagecreatetruecolor( 60, 16 );
	imagesavealpha( $small, true );
	imagefill( $small, 0, 0, imagecolorallocatealpha( $small, 0, 0, 0, 127 ) );
	imagefilledrectangle( $small, 0, 2, 11, 13, imagecolorallocate( $small, 59, 91, 219 ) );
	imagestring( $small, 3, 15, 1, 'LOGO', imagecolorallocate( $small, ...$text ) );
	$logo = imagescale( $small, 240, 64, IMG_NEAREST_NEIGHBOUR );
	imagesavealpha( $logo, true );
	$file = wp_tempnam( $name );
	imagepng( $logo, $file );
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$id = media_handle_sideload( [ 'name' => $name, 'tmp_name' => $file ], 0, 'Test logo' );
	update_option( $option, $id );
	return $id;
};
$logo_id      = $test_logo( 'rs_test_logo_id', 'test-logo.png', [ 29, 29, 31 ] );
$logo_dark_id = $test_logo( 'rs_test_logo_dark_id', 'test-logo-dark.png', [ 255, 255, 255 ] );
update_field( 'field_rs_navigation_logo', $logo_id, 'option' );
update_field( 'field_rs_navigation_logo_dark', $logo_dark_id, 'option' );

// A WordPress menu (Appearance → Menus) in the "Main navigation" location, rebuilt each time.
$menu = wp_get_nav_menu_object( 'Main navigation (test)' );
if ( $menu ) {
	wp_delete_nav_menu( $menu->term_id );
}
$menu_id = wp_create_nav_menu( 'Main navigation (test)' );
$add_page = fn( $page_id, $parent_item = 0 ) => wp_update_nav_menu_item( $menu_id, 0, [
	'menu-item-object'    => 'page',
	'menu-item-object-id' => $page_id,
	'menu-item-type'      => 'post_type',
	'menu-item-status'    => 'publish',
	'menu-item-parent-id' => $parent_item,
] );
$add_link = fn( $title, $url, $target = '' ) => wp_update_nav_menu_item( $menu_id, 0, [
	'menu-item-title'  => $title,
	'menu-item-url'    => $url,
	'menu-item-target' => $target,
	'menu-item-type'   => 'custom',
	'menu-item-status' => 'publish',
] );
// The overview, the Example Site, then Sections, Parts and Site, each with its pages as
// sub-links (a dropdown on wider screens), so the bar stays one line however many there are.
$add_page( $id );
$add_page( $example_id );
$sections_item = $add_page( $sections_id );
foreach ( $component_pages as $name => $page_id ) {
	if ( ! in_array( $name, $part_names, true ) ) {
		$add_page( $page_id, $sections_item );
	}
}
$parts_item = $add_page( $parts_id );
foreach ( $part_names as $name ) {
	$add_page( $component_pages[ $name ], $parts_item );
}
$site_item = $add_page( $site_id );
foreach ( $site_pages as $page_id ) {
	$add_page( $page_id, $site_item );
}
set_theme_mod( 'nav_menu_locations', array_merge( (array) get_theme_mod( 'nav_menu_locations' ), [ 'main_navigation' => $menu_id ] ) );

update_field( 'field_rs_navigation_source', 'menu', 'option' );
// The one-page alternative, ready to try by switching Links to "Sections on the site".
update_field( 'field_rs_navigation_navigation_sections', [
	[ 'target' => '/components/hero/#hero', 'label' => 'Hero' ],
	[ 'target' => '/components/rich-text/#rich-text', 'label' => 'Rich Text' ],
	[ 'target' => '/components/placeholder/#backgrounds', 'label' => 'Backgrounds' ],
], 'option' );
update_field( 'field_rs_navigation_background', 'page', 'option' );
update_field( 'field_rs_navigation_width', 'wide', 'option' );

// ---------- Footer (site-wide: wp-admin → Footer) ----------

// Its two WordPress menus, rebuilt each time. Items: a page (int), or [ title, url, target ];
// [ item, [ sub-items ] ] puts sub-items under an item (a column in the footer).
$test_menu = function ( $name, $location, $items ) {
	$menu = wp_get_nav_menu_object( $name );
	if ( $menu ) {
		wp_delete_nav_menu( $menu->term_id );
	}
	$menu_id = wp_create_nav_menu( $name );
	$add     = function ( $item, $parent_item = 0 ) use ( $menu_id ) {
		$fields = is_int( $item )
			? [ 'menu-item-object' => 'page', 'menu-item-object-id' => $item, 'menu-item-type' => 'post_type' ]
			: [ 'menu-item-title' => $item[0], 'menu-item-url' => $item[1], 'menu-item-target' => $item[2] ?? '', 'menu-item-type' => 'custom' ];
		return wp_update_nav_menu_item( $menu_id, 0, $fields + [ 'menu-item-status' => 'publish', 'menu-item-parent-id' => $parent_item ] );
	};
	foreach ( $items as $item ) {
		if ( is_array( $item ) && is_array( $item[1] ?? null ) ) {
			$parent_item = $add( $item[0] );
			foreach ( $item[1] as $sub ) {
				$add( $sub, $parent_item );
			}
		} else {
			$add( $item );
		}
	}
	set_theme_mod( 'nav_menu_locations', array_merge( (array) get_theme_mod( 'nav_menu_locations' ), [ $location => $menu_id ] ) );
};
$section_pages = array_values( array_diff_key( $component_pages, array_flip( $part_names ) ) );
// Two loose links (the first column, no heading), a column headed by a plain heading (#), one
// headed by a link (Parts), and one with a link to another website opening in a new tab.
$test_menu( 'Footer (test)', 'footer_navigation', [
	$id,
	$example_id,
	[ [ 'Sections', '#' ], $section_pages ],
	[ $parts_id, array_map( fn( $name ) => $component_pages[ $name ], $part_names ) ],
	[ $site_id, array_values( $site_pages ) ],
	[ [ 'Elsewhere', '#' ], [ [ 'Library on GitHub', 'https://github.com/rnnbrwn/rnnbrwn-components', '_blank' ], [ 'ronnie.fyi', 'https://ronnie.fyi/' ] ] ],
] );
$test_menu( 'Footer small print (test)', 'footer_small_print', [
	[ 'Placeholder', '/components/placeholder/' ],
	[ 'Example Site', '/components/example-site/' ],
] );

// Full by default; FOOTER_LAYOUT=line tests the Single line layout (see tests/README.md).
update_field( 'field_rs_footer_layout', getenv( 'FOOTER_LAYOUT' ) === 'line' ? 'line' : 'full', 'option' );
update_field( 'field_rs_footer_show_copyright', 1, 'option' );
update_field( 'field_rs_footer_logo', $logo_id, 'option' );
update_field( 'field_rs_footer_logo_dark', $logo_dark_id, 'option' );
update_field( 'field_rs_footer_text', 'Test content for the shared component library.', 'option' );
update_field( 'field_rs_footer_footer_buttons', [ $button( 'Get in touch', 'outline' ) ], 'option' );
update_field( 'field_rs_footer_footer_social', array_map( fn( $row ) => [ 'platform' => $row[0], 'url' => $row[1] ], [
	[ 'bluesky', 'https://bsky.app/profile/ronnie.fyi' ],
	[ 'mastodon', 'https://mastodon.social/@example' ],
	[ 'instagram', 'https://www.instagram.com/example/' ],
	[ 'linkedin', 'https://www.linkedin.com/in/example/' ],
	[ 'github', 'https://github.com/rnnbrwn' ],
	[ 'email', 'mailto:hello@example.com' ],
] ), 'option' );
update_field( 'field_rs_footer_copyright_name', 'RNNBRWN', 'option' );
update_field( 'field_rs_footer_copyright_from', 2024, 'option' );
update_field( 'field_rs_footer_small_print', 'Test pages, not indexed.', 'option' );
update_field( 'field_rs_footer_background', 'page', 'option' );
update_field( 'field_rs_footer_width', 'wide', 'option' );

// ---------- Hero ----------

// A deliberately difficult test photo (pure white, pure black and bright colour blocks), so the
// tint over it is tested against the worst case, not a friendly photo. Made once, then reused.
$photo_id = (int) get_option( 'rs_test_hero_photo_id' );
if ( ! $photo_id || ! get_post( $photo_id ) ) {
	$w     = 2000;
	$h     = 1125;
	$photo = imagecreatetruecolor( $w, $h );
	for ( $x = 0; $x < $w; $x++ ) {
		$v = (int) round( 255 * $x / ( $w - 1 ) );
		imageline( $photo, $x, 0, $x, $h, imagecolorallocate( $photo, $v, $v, $v ) );
	}
	$blocks = [ [ 255, 255, 255 ], [ 0, 0, 0 ], [ 229, 0, 83 ], [ 254, 206, 0 ], [ 59, 91, 219 ], [ 255, 255, 255 ] ];
	foreach ( $blocks as $i => $rgb ) {
		$x0 = (int) ( $i * $w / count( $blocks ) );
		imagefilledrectangle( $photo, $x0, (int) ( $h * 0.3 ), $x0 + (int) ( $w / count( $blocks ) ), (int) ( $h * 0.7 ), imagecolorallocate( $photo, ...$rgb ) );
	}
	imagefilledellipse( $photo, (int) ( $w * 0.8 ), (int) ( $h * 0.15 ), 300, 300, imagecolorallocate( $photo, 255, 255, 255 ) );
	$file = wp_tempnam( 'test-hero-photo.jpg' );
	imagejpeg( $photo, $file, 85 );
	$photo_id = media_handle_sideload( [ 'name' => 'test-hero-photo.jpg', 'tmp_name' => $file ], 0, 'Test hero photo' );
	update_post_meta( $photo_id, '_wp_attachment_image_alt', 'Test pattern of black, white and coloured stripes' );
	update_option( 'rs_test_hero_photo_id', $photo_id );
}

$hero = fn( $heading, $settings = [] ) => $section( 'hero', [
	'variant'           => 'centred',
	'eyebrow'           => 'Eyebrow label',
	'heading'           => $heading,
	'intro'             => 'An intro of a sentence or two, saying what the page is about and what to do next.',
	'hero_buttons'      => [
		$button( 'Main button', 'solid' ),
		$button( 'Second button', 'outline', '/components/placeholder/#backgrounds' ),
		$button( 'Text link', 'text', '/components/buttons/' ),
	],
	'height'            => 'standard',
	'image'             => '',
	'focus'             => 'center',
	'image_informative' => 0,
	'alignment'         => 'left',
], $settings );
// The photo Heroes use a real photo: the media-library image titled "eugene" when there is one
// (uploaded locally for testing), otherwise the test pattern. The last Hero always uses the
// pattern, to keep the worst case for text contrast on the page.
$real_photo = get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'title' => 'eugene', 'numberposts' => 1 ] );
$photo      = [ 'variant' => 'background_image', 'image' => $real_photo ? $real_photo[0]->ID : $photo_id, 'width' => 'full' ];
$pattern    = [ 'variant' => 'background_image', 'image' => $photo_id, 'width' => 'full' ];

$sections_hero = [
	$hero( 'Hero: centred', [ 'anchor' => 'hero' ] ),
	$hero( 'Hero: centred, tall, on Brand, full width', [ 'height' => 'tall', 'background' => 'brand', 'width' => 'full' ] ),
	$hero( 'Hero: centred on Black, as a panel', [ 'background' => 'black' ] ),
	$hero( 'Hero: centred on Accent, as a panel', [ 'background' => 'accent' ] ),
	$hero( 'Hero: heading only', [ 'eyebrow' => '', 'intro' => '', 'hero_buttons' => [] ] ),
	$hero( 'Hero: background image, left aligned', $photo ),
	$hero( 'Hero: background image, tall, centred, on Black', $photo + [ 'height' => 'tall', 'alignment' => 'centre', 'background' => 'black', 'focus' => 'top' ] ),
	$hero( 'Hero: background image on Brand, described photo', $photo + [ 'background' => 'brand', 'image_informative' => 1 ] ),
	$hero( 'Hero: background image, wide, on Surface', array_merge( $photo, [ 'width' => 'wide', 'background' => 'surface', 'hero_buttons' => [
		$button( 'Main button', 'solid' ),
		$button( 'Other site', 'outline', 'https://example.com', '_blank' ),
	] ] ) ),
	$hero( 'Hero: contrast test pattern (worst case)', $pattern ),
];

// ---------- Buttons ----------
// No headings in this component, so the button labels say what each row is testing.

$buttons = fn( $row, $settings = [] ) => $section( 'buttons', [
	'buttons_buttons' => $row,
	'alignment'       => 'left',
	'spacing'         => 's',
], $settings );
$every = fn( $where ) => [ $button( "Solid $where", 'solid' ), $button( "Outline $where", 'outline' ), $button( "Text link $where", 'text' ) ];

$sections_buttons = [
	$buttons( $every( 'on the page' ), [ 'anchor' => 'buttons' ] ),
	$buttons( $every( 'centred' ), [ 'alignment' => 'centre' ] ),
	$buttons( [
		$button( 'Other site, new tab', 'solid', 'https://example.com', '_blank' ),
		$button( 'Other site, same tab', 'outline', 'https://example.com' ),
		$button( 'Jump to a section', 'text', '#buttons' ),
	] ),
	$buttons( [ $button( 'One button on its own', 'solid' ) ] ),
	$buttons( $every( 'on Surface' ), [ 'background' => 'surface' ] ),
	$buttons( $every( 'on Brand' ), [ 'background' => 'brand' ] ),
	$buttons( $every( 'on Accent' ), [ 'background' => 'accent' ] ),
	$buttons( $every( 'on Black' ), [ 'background' => 'black' ] ),
	$buttons( $every( 'on Black, full width' ), [ 'background' => 'black', 'width' => 'full', 'alignment' => 'centre', 'spacing' => 'm' ] ),
	$buttons( [
		$button( 'A much longer button label, to see how it wraps on a phone', 'solid' ),
		$button( 'Another long label for the outline style', 'outline' ),
		$button( 'And a long text link that wraps as well', 'text' ),
	], [ 'width' => 'narrow' ] ),
];

// ---------- Rich Text ----------

$rich_text = fn( $heading, $body, $settings = [] ) => $section( 'rich_text', [
	'heading' => $heading,
	'body'    => $body,
], $settings );

// Written the way the Classic Editor saves text: paragraphs separated by blank lines.
$every_style = '<p>This is body text with <strong>bold</strong>, <em>italic</em>, a <a href="' . home_url( '/contact/' ) . '">link to one of the site\'s own pages</a> (entered as a CMS address, which the frontend turns into a site link) and an <a href="https://example.com">external link</a>. Lines stop at a comfortable reading length however wide the section is.</p>

<h3>A subheading</h3>
Paragraph text straight after a subheading sits close to it, so the two read as a pair.

<ul>
 	<li>A bulleted list item</li>
 	<li>Another item, long enough to wrap onto a second line so the spacing between lines inside an item can be checked against the spacing between items</li>
 	<li>A third item</li>
</ul>
<h4>A small subheading</h4>
<ol>
 	<li>A numbered list item</li>
 	<li>A second numbered item</li>
</ol>
<blockquote>A quote. Quotes stand out from the text around them, in any colour scheme.</blockquote>
A closing paragraph after the quote.';

$short = '<p>A short paragraph with a <a href="https://example.com">link</a>, to check how text and links look on this background.</p>';

$sections_rich_text = [
	$rich_text( 'Rich Text: every text style', $every_style, [ 'anchor' => 'rich-text' ] ),
	$rich_text( 'Rich Text on Surface, narrow', $short, [ 'width' => 'narrow', 'background' => 'surface' ] ),
	$rich_text( 'Rich Text on Brand, wide', $every_style, [ 'width' => 'wide', 'background' => 'brand' ] ),
	$rich_text( 'Rich Text on Accent', $short, [ 'background' => 'accent' ] ),
	$rich_text( 'Rich Text on Black, full width', $every_style, [ 'width' => 'full', 'background' => 'black' ] ),
	$rich_text( '', '<p>Rich Text with no heading: just the text. ' . str_repeat( 'Body text continues to show how a longer paragraph wraps within the reading length. ', 3 ) . '</p>' ),
];

// ---------- Card Grid ----------

// Three card images in different shapes (wide, tall, square), so the fixed 3:2 crop is tested.
// Made once, then reused.
$card_images = array_filter( (array) get_option( 'rs_test_card_images', [] ), fn( $image ) => get_post( $image ) );
if ( count( $card_images ) < 3 ) {
	$card_images = [];
	foreach ( [ [ 1200, 600, [ 59, 91, 219 ], 'wide' ], [ 600, 900, [ 229, 0, 83 ], 'tall' ], [ 800, 800, [ 254, 206, 0 ], 'square' ] ] as [ $w, $h, $rgb, $shape ] ) {
		$img = imagecreatetruecolor( $w, $h );
		imagefilledrectangle( $img, 0, 0, $w, $h, imagecolorallocate( $img, ...$rgb ) );
		imagefilledellipse( $img, (int) ( $w / 2 ), (int) ( $h / 2 ), (int) ( min( $w, $h ) * 0.6 ), (int) ( min( $w, $h ) * 0.6 ), imagecolorallocate( $img, 255, 255, 255 ) );
		$file = wp_tempnam( "test-card-{$shape}.jpg" );
		imagejpeg( $img, $file, 85 );
		$image = media_handle_sideload( [ 'name' => "test-card-{$shape}.jpg", 'tmp_name' => $file ], 0, "Test card image ({$shape})" );
		update_post_meta( $image, '_wp_attachment_image_alt', "A white circle on a coloured background ({$shape} original)" );
		$card_images[] = $image;
	}
	update_option( 'rs_test_card_images', $card_images );
}
$card_images = array_values( $card_images );

$card  = fn( $heading, $extra = [] ) => array_merge( [
	'image'   => '',
	'eyebrow' => '',
	'heading' => $heading,
	'text'    => 'A sentence or two about this card, long enough to wrap onto a few lines.',
	'link'    => '',
], $extra );
$cards = [
	$card( 'Linked, with link text', [ 'image' => $card_images[0], 'eyebrow' => 'Eyebrow', 'link' => $link( 'Read more' ) ] ),
	$card( 'Linked, arrow only', [ 'image' => $card_images[1], 'eyebrow' => 'Tall image', 'link' => $link( '', '/components/hero/' ) ] ),
	$card( 'Another website, new tab', [ 'image' => $card_images[2], 'eyebrow' => 'Square image', 'link' => $link( 'Visit example.com', 'https://example.com', '_blank' ) ] ),
	$card( 'No link', [ 'image' => $card_images[0], 'eyebrow' => 'Display only', 'text' => 'Not clickable: no hover, no arrow.' ] ),
	$card( 'No image, with a much longer heading that wraps', [ 'eyebrow' => 'Eyebrow', 'link' => $link( 'Read more' ) ] ),
	$card( 'No eyebrow', [ 'image' => $card_images[1], 'text' => 'Shorter text.', 'link' => $link( 'Read more', '#card-grid' ) ] ),
];
$text_cards = [
	$card( 'Text only', [ 'eyebrow' => 'One', 'link' => $link( 'Read more' ) ] ),
	$card( 'Text only, no eyebrow', [ 'link' => $link( 'Read more' ) ] ),
	$card( 'Text only, no link', [ 'eyebrow' => 'Three' ] ),
	$card( 'A fourth card, alone on its row', [ 'eyebrow' => 'Four', 'text' => 'The last row isn\'t stretched: the card keeps its column\'s width.', 'link' => $link( 'Read more' ) ] ),
];
$card_grid = fn( $heading, $settings = [] ) => $section( 'card_grid', [
	'eyebrow'           => 'Section eyebrow',
	'heading'           => $heading,
	'intro'             => 'An optional intro under the heading, saying what the cards are.',
	'card_grid_cards'   => $cards,
	'card_grid_buttons' => [ $button( 'See everything', 'outline' ) ],
	'columns'           => '3',
	'last_card'         => 'column',
	'card_style'        => 'panel',
], $settings );

$sections_card_grid = [
	$card_grid( 'Card Grid: 3 columns, Panel', [ 'anchor' => 'card-grid' ] ),
	$card_grid( 'Card Grid: 3 columns, Plain, no section eyebrow', [ 'card_style' => 'plain', 'eyebrow' => '' ] ),
	$card_grid( 'Card Grid: 2 columns, narrow, on Surface', [ 'columns' => '2', 'width' => 'narrow', 'background' => 'surface', 'card_grid_cards' => array_slice( $cards, 0, 4 ) ] ),
	$card_grid( 'Card Grid: 4 columns, wide, on Brand', [ 'columns' => '4', 'width' => 'wide', 'background' => 'brand' ] ),
	$card_grid( 'Card Grid: 4 columns, Plain, full width, on Black', [ 'columns' => '4', 'width' => 'full', 'background' => 'black', 'card_style' => 'plain', 'card_grid_buttons' => [ $button( 'Main button', 'solid' ), $button( 'Text link', 'text' ) ] ] ),
	$card_grid( 'Card Grid: 4 columns, Panel, on Black, content width', [ 'columns' => '4', 'background' => 'black', 'card_grid_buttons' => [] ] ),
	$card_grid( '', [ 'eyebrow' => '', 'intro' => '', 'card_grid_cards' => $text_cards, 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 4 cards in 3 columns', [ 'intro' => 'With Last card set to Fill the row, the fourth card spans the whole second row.', 'last_card' => 'fill', 'card_grid_cards' => array_merge( array_slice( $text_cards, 0, 3 ), [ array_merge( $text_cards[3], [ 'text' => 'Alone on its row, so it stretches across all three columns.' ] ) ] ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 5 cards in 3 columns, Plain', [ 'intro' => 'The fifth card spans the two columns left; its image stays the height of the others.', 'last_card' => 'fill', 'card_style' => 'plain', 'card_grid_cards' => array_slice( $cards, 0, 5 ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 6 cards in 4 columns, wide, on Surface', [ 'intro' => '', 'last_card' => 'fill', 'columns' => '4', 'width' => 'wide', 'background' => 'surface', 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, but the row is already full', [ 'intro' => 'Three cards in three columns: nothing to fill, so nothing stretches.', 'last_card' => 'fill', 'card_grid_cards' => array_slice( $cards, 0, 3 ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: full width on Surface, wide content', [ 'columns' => '4', 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface', 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: one card', [ 'intro' => '', 'card_grid_cards' => [ $cards[0] ], 'card_grid_buttons' => [] ] ),
];

// ---------- Media Text ----------
// The card images (wide 2:1, tall 2:3, square) test every shape's crop; the first row uses the
// real photo when there is one.
[ $wide_image, $tall_image, $square_image ] = $card_images;
$media_body = '<p>A paragraph or two beside the image, with <a href="' . home_url( '/contact/' ) . '">a link</a> in it.</p>

<ul>
 	<li>A short list</li>
 	<li>Of a few points</li>
</ul>';
$media_text = fn( $heading, $settings = [] ) => $section( 'media_text', [
	'image'              => $wide_image,
	'eyebrow'            => 'Section eyebrow',
	'heading'            => $heading,
	'body'               => $media_body,
	'media_text_buttons' => [ $button( 'Main button', 'solid' ), $button( 'Text link', 'text' ) ],
	'image_side'         => 'left',
	'image_shape'        => 'original',
	'focus'              => 'center',
	'split'              => 'half',
	'text_alignment'     => 'middle',
], $settings );
$long_body = $media_body . '

<h3>A subheading</h3>
<p>More text, so the text column is taller than the image and the Top / Middle / Bottom choice shows. It keeps going for a few lines to make the difference clear on wide screens, where the two sit side by side.</p>

<p>And one more paragraph for good measure.</p>';

$sections_media_text = [
	$media_text( 'Media Text: image left, half and half, original shape', [ 'anchor' => 'media-text', 'image' => $real_photo ? $real_photo[0]->ID : $wide_image ] ),
	$media_text( 'Media Text: image right, Landscape crop of a tall image, keep the top', [ 'image_side' => 'right', 'image' => $tall_image, 'image_shape' => 'landscape', 'focus' => 'top' ] ),
	$media_text( 'Media Text: Square, image wider, on Surface', [ 'image_shape' => 'square', 'split' => 'image_wider', 'background' => 'surface' ] ),
	$media_text( 'Media Text: Portrait, text wider, image right, on Brand', [ 'image_shape' => 'portrait', 'split' => 'text_wider', 'image_side' => 'right', 'background' => 'brand', 'focus' => 'left', 'image' => $square_image ] ),
	$media_text( 'Media Text: text lined up with the top, wide, on Black', [ 'text_alignment' => 'top', 'width' => 'wide', 'background' => 'black', 'body' => $long_body, 'image' => $square_image ] ),
	$media_text( 'Media Text: text lined up with the bottom, full width, on Black', [ 'text_alignment' => 'bottom', 'width' => 'full', 'background' => 'black', 'image_side' => 'right', 'image' => $tall_image, 'media_text_buttons' => [ $button( 'Outline', 'outline' ) ] ] ),
	$media_text( 'Media Text: full width on Surface, narrow content', [ 'width' => 'full', 'content_width' => 'narrow', 'background' => 'surface', 'image' => $square_image ] ),
	$media_text( 'Media Text: long text beside a short image, middle', [ 'body' => $long_body, 'split' => 'text_wider' ] ),
	$media_text( 'Media Text: narrow', [ 'width' => 'narrow', 'image' => $square_image, 'eyebrow' => '', 'media_text_buttons' => [] ] ),
	$media_text( '', [ 'eyebrow' => '', 'body' => '<p>No eyebrow, heading or buttons: just text beside the image.</p>', 'media_text_buttons' => [], 'image_side' => 'right' ] ),
];

// ---------- Accordion ----------
$accordion_item  = fn( $title, $body ) => [ 'title' => $title, 'body' => $body ];
$accordion_items = [
	$accordion_item( 'How long does a project take?', '<p>Usually two to four weeks from the first conversation. We\'ll give you a date before we start.</p>' ),
	$accordion_item( 'What does it cost?', '<p>It depends on the size of the job. After a short chat we send a fixed price, so there are no surprises.</p>

<ul>
 	<li>Small jobs: a single price</li>
 	<li>Bigger jobs: paid in stages</li>
</ul>' ),
	$accordion_item( 'A much longer question, to check that a title wraps neatly onto a second line beside the icon on narrow screens?', '<p>The answer can have <a href="' . home_url( '/contact/' ) . '">links</a>, <strong>bold text</strong> and lists, like any editor text.</p>

<h3>A subheading</h3>
<p>And more than one paragraph.</p>' ),
	$accordion_item( 'Do you work outside the area?', '<p>Sometimes. <a href="https://example.com" target="_blank" rel="noopener">Ask us</a> and we\'ll see what we can do.</p>' ),
];
$accordion = fn( $heading, $settings = [] ) => $section( 'accordion', [
	'eyebrow'           => 'Section eyebrow',
	'heading'           => $heading,
	'intro'             => 'An optional intro under the heading, saying what the items are.',
	'accordion_items'   => $accordion_items,
	'accordion_buttons' => [ $button( 'Ask a question', 'outline' ) ],
	'opening'           => 'several',
	'first_open'        => 0,
	'layout'            => 'stacked',
], $settings );

$sections_accordion = [
	$accordion( 'Accordion: several open at once', [ 'anchor' => 'accordion' ] ),
	$accordion( 'Accordion: one at a time, first item open', [ 'opening' => 'one', 'first_open' => 1, 'intro' => 'Opening an item closes the one that was open.' ] ),
	$accordion( 'Accordion: heading beside the items', [ 'layout' => 'beside', 'width' => 'wide', 'intro' => 'On wider screens the heading, intro and buttons sit in a column on the left.', 'accordion_buttons' => [ $button( 'Get in touch', 'solid' ), $button( 'All questions', 'text' ) ] ] ),
	$accordion( 'Accordion: narrow, on Surface', [ 'width' => 'narrow', 'background' => 'surface', 'first_open' => 1 ] ),
	$accordion( 'Accordion: on Brand, one at a time', [ 'background' => 'brand', 'opening' => 'one', 'first_open' => 1 ] ),
	$accordion( 'Accordion: on Accent', [ 'background' => 'accent', 'first_open' => 1, 'eyebrow' => '' ] ),
	$accordion( 'Accordion: beside, full width, on Black', [ 'layout' => 'beside', 'width' => 'full', 'background' => 'black', 'first_open' => 1, 'accordion_buttons' => [ $button( 'Main button', 'solid' ) ] ] ),
	$accordion( 'Accordion: beside, but in a narrow section', [ 'layout' => 'beside', 'width' => 'narrow', 'intro' => 'Too narrow for two columns, so it stays stacked.' ] ),
	$accordion( '', [ 'eyebrow' => '', 'intro' => '', 'accordion_buttons' => [], 'accordion_items' => array_slice( $accordion_items, 0, 2 ) ] ),
];

$stats_figure  = fn( $figure, $label, $text = '' ) => [ 'figure' => $figure, 'label' => $label, 'text' => $text ];
$stats_figures = [
	$stats_figure( '400+', 'Events covered', 'Festivals, fairs and shows across the region since 2009.' ),
	$stats_figure( '24/7', 'On-site support', 'Someone on call from set-up to the last van leaving.' ),
	$stats_figure( '98%', 'Clients who book again' ),
	$stats_figure( '£2.5m+', 'A long figure, to check it fits', 'Eight characters is the most a figure can be.' ),
];
$stats = fn( $heading, $settings = [] ) => $section( 'stats', [
	'eyebrow'       => 'In numbers',
	'heading'       => $heading,
	'intro'         => 'An optional intro under the heading, saying what the figures are.',
	'stats_figures' => $stats_figures,
	'stats_buttons' => [ $button( 'About us', 'outline' ) ],
	'figure_colour' => 'brand',
	'alignment'     => 'left',
], $settings );

$sections_stats = [
	$stats( 'Stats: four figures, left, Brand colour', [ 'anchor' => 'stats' ] ),
	$stats( 'Stats: three figures, centred', [ 'alignment' => 'centre', 'stats_figures' => array_slice( $stats_figures, 0, 3 ), 'stats_buttons' => [ $button( 'Get a quote', 'solid' ), $button( 'Our work', 'text' ) ] ] ),
	$stats( 'Stats: two figures, Text colour', [ 'figure_colour' => 'text', 'stats_figures' => array_slice( $stats_figures, 0, 2 ) ] ),
	$stats( 'Stats: one figure', [ 'stats_figures' => array_slice( $stats_figures, 1, 1 ), 'stats_buttons' => [] ] ),
	$stats( 'Stats: four in a narrow section (two by two)', [ 'width' => 'narrow', 'background' => 'surface' ] ),
	$stats( 'Stats: wide, on Brand, centred', [ 'width' => 'wide', 'background' => 'brand', 'alignment' => 'centre' ] ),
	$stats( 'Stats: on Accent, Text colour', [ 'background' => 'accent', 'figure_colour' => 'text', 'stats_figures' => array_slice( $stats_figures, 0, 3 ) ] ),
	$stats( 'Stats: full width on Black', [ 'width' => 'full', 'background' => 'black', 'stats_buttons' => [ $button( 'Main button', 'solid' ) ] ] ),
	$stats( 'Stats: full width on Surface, wide content, centred', [ 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface', 'alignment' => 'centre' ] ),
	$stats( '', [ 'eyebrow' => '', 'intro' => '', 'stats_buttons' => [], 'stats_figures' => array_map( fn( $f ) => array_merge( $f, [ 'text' => '' ] ), $stats_figures ) ] ),
];

// ---------- Testimonials ----------
// The photos are the card images (wide, tall, square), so the round crop is tested on every
// shape; one quote has no photo, one no role, and one is long, to check the names still line up.
$testimonial  = fn( $name, $extra = [] ) => array_merge( [
	'quote' => 'They had everything set up before we arrived and packed away before the last guests left. We didn\'t have to think about it once.',
	'name'  => $name,
	'role'  => 'Events manager, Hay Festival',
	'photo' => '',
], $extra );
$testimonials_quotes = [
	$testimonial( 'Sam Carter', [ 'photo' => $card_images[0] ] ),
	$testimonial( 'Priya Shah', [ 'photo' => $card_images[1], 'role' => 'Owner, The Walled Garden', 'quote' => 'Friendly, quick and exactly what we asked for.' ] ),
	$testimonial( 'Alex Morgan', [ 'photo' => $card_images[2], 'role' => 'Director, Brecon Jazz', 'quote' => "A longer quote, to check that the names still line up across a row when one quote runs on.\nIt has a second paragraph too: a line break in the Quote box starts a new one." ] ),
	$testimonial( 'Jo Evans', [ 'role' => '', 'quote' => 'No photo and no role: just the quote and a name.' ] ),
	$testimonial( 'Chris Lloyd', [ 'photo' => $card_images[0], 'role' => 'Site lead, Green Man', 'quote' => 'We\'ve booked them for five years running.' ] ),
];
$testimonials = fn( $heading, $settings = [] ) => $section( 'testimonials', [
	'eyebrow'             => 'What clients say',
	'heading'             => $heading,
	'intro'               => 'An optional intro under the heading, saying who the quotes are from.',
	'testimonials_quotes' => array_slice( $testimonials_quotes, 0, 3 ),
	'testimonials_buttons' => [ $button( 'Read more reviews', 'outline' ) ],
	'layout'              => 'grid',
	'columns'             => '3',
	'last_quote'          => 'column',
	'quote_style'         => 'panel',
	'alignment'           => 'left',
], $settings );

$sections_testimonials = [
	$testimonials( 'Testimonials: grid, 3 columns, Panel', [ 'anchor' => 'testimonials' ] ),
	$testimonials( 'Testimonials: grid, Plain, centred', [ 'quote_style' => 'plain', 'alignment' => 'centre', 'testimonials_buttons' => [ $button( 'Get a quote', 'solid' ), $button( 'Our work', 'text' ) ] ] ),
	$testimonials( 'Testimonials: 2 columns, narrow, on Surface', [ 'columns' => '2', 'width' => 'narrow', 'background' => 'surface', 'testimonials_quotes' => array_slice( $testimonials_quotes, 0, 4 ) ] ),
	$testimonials( 'Testimonials: large, one quote', [ 'layout' => 'large', 'eyebrow' => '', 'intro' => '', 'testimonials_quotes' => [ $testimonials_quotes[0] ], 'testimonials_buttons' => [] ] ),
	$testimonials( 'Testimonials: large, centred, on Brand', [ 'layout' => 'large', 'alignment' => 'centre', 'background' => 'brand', 'testimonials_quotes' => array_slice( $testimonials_quotes, 0, 2 ) ] ),
	$testimonials( 'Testimonials: large, Plain, wide, on Black', [ 'layout' => 'large', 'quote_style' => 'plain', 'width' => 'wide', 'background' => 'black', 'testimonials_quotes' => [ $testimonials_quotes[1] ] ] ),
	$testimonials( 'Testimonials: grid on Accent', [ 'background' => 'accent', 'testimonials_quotes' => array_slice( $testimonials_quotes, 1, 3 ) ] ),
	$testimonials( 'Testimonials: last quote fills the row, 4 quotes in 3 columns', [ 'intro' => 'With Last quote set to Fill the row, the fourth quote spans the whole second row.', 'last_quote' => 'fill', 'testimonials_quotes' => array_slice( $testimonials_quotes, 0, 4 ), 'testimonials_buttons' => [] ] ),
	$testimonials( 'Testimonials: last quote fills the row, 5 in 3 columns, Plain', [ 'intro' => 'The fifth quote spans the two columns left.', 'last_quote' => 'fill', 'quote_style' => 'plain', 'testimonials_quotes' => $testimonials_quotes, 'testimonials_buttons' => [] ] ),
	$testimonials( 'Testimonials: full width on Black, six quotes', [ 'width' => 'full', 'background' => 'black', 'testimonials_quotes' => array_merge( $testimonials_quotes, [ $testimonials_quotes[1] ] ), 'testimonials_buttons' => [ $button( 'Main button', 'solid' ) ] ] ),
	$testimonials( 'Testimonials: full width on Surface, wide content, centred', [ 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface', 'alignment' => 'centre' ] ),
	$testimonials( '', [ 'eyebrow' => '', 'intro' => '', 'testimonials_quotes' => array_slice( $testimonials_quotes, 0, 2 ), 'testimonials_buttons' => [] ] ),
];

// ---------- Logo Strip ----------
// Test logos in different shapes, drawn here as a mark plus bars standing in for the lettering:
// wide (4:1), square with a see-through hole, tall (2:3), very wide (8:1, capped at four times
// the height), two colours, and a worst case on a white box (a JPG, so no transparency: Single
// colour makes it a solid block). Made once, then reused.
$logo_images = array_filter( (array) get_option( 'rs_test_logo_images', [] ), fn( $image ) => get_post( $image ) );
if ( count( $logo_images ) < 6 ) {
	$logo_images = [];
	$logo_specs  = [
		[ 'wide', 800, 200, 'png' ],
		[ 'square', 400, 400, 'png' ],
		[ 'tall', 400, 600, 'png' ],
		[ 'very-wide', 1600, 200, 'png' ],
		[ 'two-colour', 600, 200, 'png' ],
		[ 'white-box', 600, 200, 'jpg' ],
	];
	foreach ( $logo_specs as [ $shape, $w, $h, $type ] ) {
		$img = imagecreatetruecolor( $w, $h );
		imagealphablending( $img, false );
		imagesavealpha( $img, true );
		imagefilledrectangle( $img, 0, 0, $w, $h, 'jpg' === $type ? imagecolorallocate( $img, 255, 255, 255 ) : imagecolorallocatealpha( $img, 0, 0, 0, 127 ) );
		imagealphablending( $img, true );
		$blue   = imagecolorallocate( $img, 59, 91, 219 );
		$red    = imagecolorallocate( $img, 229, 0, 83 );
		$yellow = imagecolorallocate( $img, 230, 170, 0 );
		$green  = imagecolorallocate( $img, 20, 140, 90 );
		$dark   = imagecolorallocate( $img, 30, 30, 40 );
		$clear  = imagecolorallocatealpha( $img, 0, 0, 0, 127 );
		// "Lettering": bars from $x to the right edge.
		$bars = function ( $x, $y, $bar_h, $colour ) use ( $img, $w ) {
			imagefilledrectangle( $img, $x, $y, $w - 20, $y + $bar_h, $colour );
			imagefilledrectangle( $img, $x, $y + (int) ( $bar_h * 1.6 ), $x + (int) ( ( $w - 20 - $x ) * 0.6 ), $y + (int) ( $bar_h * 2.3 ), $colour );
		};
		switch ( $shape ) {
			case 'wide':
				imagefilledellipse( $img, 100, 100, 160, 160, $blue );
				$bars( 210, 55, 40, $dark );
				break;
			case 'square':
				imagefilledrectangle( $img, 20, 20, 380, 380, $red );
				imagealphablending( $img, false );
				imagefilledellipse( $img, 200, 200, 180, 180, $clear );
				break;
			case 'tall':
				imagefilledpolygon( $img, [ 200, 20, 380, 380, 20, 380 ], $yellow );
				imagefilledrectangle( $img, 40, 430, 360, 480, $dark );
				imagefilledrectangle( $img, 90, 520, 310, 570, $dark );
				break;
			case 'very-wide':
				$bars( 20, 50, 45, $dark );
				break;
			case 'two-colour':
				imagefilledrectangle( $img, 20, 30, 160, 170, $green );
				imagefilledellipse( $img, 130, 70, 90, 90, $blue );
				$bars( 200, 55, 40, $green );
				break;
			case 'white-box':
				imagefilledellipse( $img, 100, 100, 150, 150, $red );
				$bars( 200, 55, 40, $dark );
				break;
		}
		$file = wp_tempnam( "test-logo-{$shape}.{$type}" );
		'jpg' === $type ? imagejpeg( $img, $file, 90 ) : imagepng( $img, $file );
		$logo_images[ $shape ] = media_handle_sideload( [ 'name' => "test-logo-{$shape}.{$type}", 'tmp_name' => $file ], 0, "Test logo ({$shape})" );
	}
	update_option( 'rs_test_logo_images', $logo_images );
}
$logo_images = array_values( $logo_images );

$logo  = fn( $i, $name, $link = '' ) => [ 'image' => $logo_images[ $i ], 'name' => $name, 'link' => $link ];
$logos = [
	$logo( 0, 'Wide logo (linked)', $link( '', '#logo-strip' ) ),
	$logo( 1, 'Square logo with a see-through hole' ),
	$logo( 2, 'Tall logo' ),
	$logo( 3, 'Very wide logo (capped at four times its height)' ),
	$logo( 4, 'Two-colour logo (another website, new tab)', $link( '', 'https://example.com', '_blank' ) ),
	$logo( 0, 'Wide logo again' ),
];
$logo_strip = fn( $heading, $settings = [] ) => $section( 'logo_strip', [
	'eyebrow'          => 'Trusted by',
	'heading'          => $heading,
	'intro'            => 'An optional intro under the heading, saying who these are.',
	'logo_strip_logos' => $logos,
	'logo_colour'      => 'original',
	'alignment'        => 'left',
], $settings );

$sections_logo_strip = [
	$logo_strip( 'Logo Strip: Original, left', [ 'anchor' => 'logo-strip' ] ),
	$logo_strip( 'Logo Strip: Single colour, centred', [ 'logo_colour' => 'single', 'alignment' => 'centre' ] ),
	$logo_strip( 'Logo Strip: Single colour on Brand', [ 'logo_colour' => 'single', 'background' => 'brand' ] ),
	$logo_strip( 'Logo Strip: Original on Black (dark logos fade: use Single colour)', [ 'background' => 'black' ] ),
	$logo_strip( 'Logo Strip: Single colour on Black, wide', [ 'logo_colour' => 'single', 'background' => 'black', 'width' => 'wide' ] ),
	$logo_strip( 'Logo Strip: Single colour on Accent, centred', [ 'logo_colour' => 'single', 'background' => 'accent', 'alignment' => 'centre' ] ),
	$logo_strip( 'Logo Strip: twelve logos, narrow, on Surface', [ 'width' => 'narrow', 'background' => 'surface', 'logo_strip_logos' => array_merge( $logos, $logos ) ] ),
	$logo_strip( 'Logo Strip: full width on Surface, wide content, centred', [ 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface', 'alignment' => 'centre', 'logo_colour' => 'single' ] ),
	$logo_strip( 'Logo Strip: three logos, centred', [ 'eyebrow' => '', 'intro' => '', 'alignment' => 'centre', 'logo_strip_logos' => array_slice( $logos, 0, 3 ) ] ),
	$logo_strip( 'Logo Strip: a logo on a white box, in Single colour (worst case)', [ 'intro' => 'A JPG has no transparent background, so Single colour turns it into a solid block. Use a PNG with transparency.', 'logo_colour' => 'single', 'logo_strip_logos' => [ $logos[0], $logo( 5, 'Logo on a white box' ), $logos[2] ] ] ),
	$logo_strip( '', [ 'eyebrow' => '', 'intro' => '', 'alignment' => 'centre', 'logo_colour' => 'single' ] ),
];

$contact_detail  = fn( $type, $value, $label = '', $map_link = 0 ) => [
	'type'     => $type,
	'label'    => $label,
	'email'    => 'email' === $type ? $value : '',
	'phone'    => 'phone' === $type ? $value : '',
	'text'     => in_array( $type, [ 'address', 'other' ], true ) ? $value : '',
	'map_link' => $map_link,
];
$contact_details = [
	$contact_detail( 'email', 'hello@example.com' ),
	$contact_detail( 'phone', '+44 (0)141 555 0123' ),
	$contact_detail( 'address', "12 Example Street\nGlasgow\nG1 1AA", '', 1 ),
	$contact_detail( 'other', "Mon–Fri, 9am–5pm\nSat, 10am–2pm", 'Opening hours' ),
];
$contact_bar = fn( $heading, $settings = [] ) => $section( 'contact_bar', [
	'eyebrow'             => 'Get in touch',
	'heading'             => $heading,
	'intro'               => 'An optional intro under the heading, e.g. how quickly you reply.',
	'contact_bar_details' => $contact_details,
	'contact_bar_buttons' => [ $button( 'Send a message', 'outline' ) ],
	'layout'              => 'row',
	'alignment'           => 'left',
], $settings );

$sections_contact_bar = [
	$contact_bar( 'Contact Bar: every type, in a row', [ 'anchor' => 'contact-bar' ] ),
	$contact_bar( 'Contact Bar: centred', [ 'alignment' => 'centre', 'contact_bar_details' => array_slice( $contact_details, 0, 3 ), 'contact_bar_buttons' => [ $button( 'Send a message', 'solid' ), $button( 'Find us', 'text' ) ] ] ),
	$contact_bar( 'Contact Bar: heading beside the details', [ 'layout' => 'beside', 'width' => 'wide', 'intro' => 'On wider screens the heading, intro and buttons sit in a column on the left.', 'contact_bar_buttons' => [ $button( 'Book a call', 'solid' ), $button( 'Find us', 'text' ) ] ] ),
	$contact_bar( 'Contact Bar: own labels, two numbers, no map link', [ 'contact_bar_details' => [
		$contact_detail( 'phone', '0141 555 0123', 'Office' ),
		$contact_detail( 'phone', '+44 7700 900123', 'Out of hours' ),
		$contact_detail( 'email', 'a.very.long.email.address.to.check.it.wraps@example-company.co.uk', 'Sales' ),
		$contact_detail( 'address', "Unit 4, Example Industrial Estate\nPaisley PA1 2BB" ),
	], 'contact_bar_buttons' => [] ] ),
	$contact_bar( 'Contact Bar: narrow, on Surface', [ 'width' => 'narrow', 'background' => 'surface' ] ),
	$contact_bar( 'Contact Bar: on Brand', [ 'background' => 'brand', 'contact_bar_buttons' => [ $button( 'Main button', 'solid' ) ] ] ),
	$contact_bar( 'Contact Bar: on Accent', [ 'background' => 'accent', 'eyebrow' => '' ] ),
	$contact_bar( 'Contact Bar: full width on Surface, centred', [ 'width' => 'full', 'background' => 'surface', 'alignment' => 'centre' ] ),
	$contact_bar( 'Contact Bar: beside, full width, on Black', [ 'layout' => 'beside', 'width' => 'full', 'background' => 'black', 'contact_bar_buttons' => [ $button( 'Main button', 'solid' ) ] ] ),
	$contact_bar( 'Contact Bar: beside, but in a narrow section', [ 'layout' => 'beside', 'width' => 'narrow', 'intro' => 'Too narrow for two columns, so it stays stacked.' ] ),
	$contact_bar( '', [ 'eyebrow' => '', 'intro' => '', 'contact_bar_buttons' => [], 'contact_bar_details' => array_slice( $contact_details, 0, 2 ) ] ),
];

// ---------- CTA Banner: both layouts, one to three buttons, every background and width ----------
$cta_banner = fn( $heading, $settings = [] ) => $section( 'cta_banner', [
	'eyebrow'            => 'Ready to start?',
	'heading'            => $heading,
	'intro'              => 'An optional short text under the heading: a sentence or two about what happens next.',
	'cta_banner_buttons' => [ $button( 'Get a quote', 'solid' ), $button( 'Our work', 'outline' ) ],
	'layout'             => 'beside',
], $settings );

$sections_cta_banner = [
	$cta_banner( 'CTA Banner: buttons beside the text', [ 'anchor' => 'cta-banner' ] ),
	$cta_banner( 'CTA Banner: centred', [ 'layout' => 'centre' ] ),
	$cta_banner( 'CTA Banner: one button, on Brand', [ 'background' => 'brand', 'cta_banner_buttons' => [ $button( 'Book a free consultation', 'solid' ) ] ] ),
	$cta_banner( 'CTA Banner: three buttons, on Surface', [ 'background' => 'surface', 'cta_banner_buttons' => [ $button( 'Get a quote', 'solid' ), $button( 'Call us', 'outline' ), $button( 'See our work', 'text' ) ] ] ),
	$cta_banner( 'CTA Banner: centred, on Accent', [ 'layout' => 'centre', 'background' => 'accent' ] ),
	$cta_banner( 'CTA Banner: narrow, so the buttons go under the text', [ 'width' => 'narrow' ] ),
	$cta_banner( 'CTA Banner: wide, on Black', [ 'width' => 'wide', 'background' => 'black' ] ),
	$cta_banner( 'CTA Banner: full width on Brand, small spacing', [ 'width' => 'full', 'background' => 'brand', 'spacing' => 's' ] ),
	$cta_banner( 'CTA Banner: full width on Surface, wide content, centred', [ 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface', 'layout' => 'centre' ] ),
	$cta_banner( 'CTA Banner: a much longer heading, to check how it wraps beside the buttons', [ 'eyebrow' => '', 'intro' => 'And a longer short text too, to see the two columns side by side when the text runs to several lines on a wide screen.' ] ),
	$cta_banner( 'Heading and a button only', [ 'eyebrow' => '', 'intro' => '', 'cta_banner_buttons' => [ $button( 'Contact us', 'solid' ) ] ] ),
];

$sections_placeholder = [
	$placeholder( 'Width: narrow', [ 'width' => 'narrow' ] ),
	$placeholder( 'Width: content', [ 'width' => 'content' ], 'The default width.' ),
	$placeholder( 'Width: wide', [ 'width' => 'wide' ] ),
	$placeholder( 'Width: full', [ 'width' => 'full' ], 'The background runs edge to edge; the content stays in the content lane.' ),
	$placeholder( 'Background: same as the page', [ 'anchor' => 'backgrounds' ], 'The default: always matches the page, whatever its background.' ),
	$placeholder( 'Background: white', [ 'background' => 'white' ], 'Blends in on a white page; a panel on any other page background.' ),
	$placeholder( 'Background: surface', [ 'background' => 'surface' ] ),
	$placeholder( 'Background: brand', [ 'background' => 'brand' ] ),
	$placeholder( 'Background: accent', [ 'background' => 'accent' ] ),
	$placeholder( 'Background: black', [ 'background' => 'black' ] ),
	$placeholder( 'Full width, surface background', [ 'width' => 'full', 'background' => 'surface' ] ),
	$placeholder( 'Full width, brand background', [ 'width' => 'full', 'background' => 'brand', 'spacing' => 'l' ] ),
	$placeholder( 'Full width, accent background', [ 'width' => 'full', 'background' => 'accent' ] ),
	$placeholder( 'Full width, black background', [ 'width' => 'full', 'background' => 'black' ] ),
	$placeholder( 'Full width, narrow content', [ 'width' => 'full', 'content_width' => 'narrow', 'background' => 'surface' ], 'The background runs edge to edge; the content lines up with the Narrow lane.' ),
	$placeholder( 'Full width, wide content', [ 'width' => 'full', 'content_width' => 'wide', 'background' => 'surface' ], 'The content lines up with the Wide lane.' ),
	$placeholder( 'Spacing: none', [ 'spacing' => 'none', 'background' => 'surface' ] ),
	$placeholder( 'Spacing: small', [ 'spacing' => 's', 'background' => 'surface' ] ),
	$placeholder( 'Spacing: large', [ 'spacing' => 'l', 'background' => 'surface' ] ),
	$placeholder( 'Anchor ID', [ 'anchor' => 'anchor-test' ], 'Reachable at /components/placeholder/#anchor-test.' ),
];

// ---------- Fill the pages ----------

// The overview and Parts have no sections of their own: the site lists the pages there.
update_field( 'field_rs_sections', [], $id );
update_field( 'field_rs_sections', [], $parts_id );
update_field( 'field_rs_sections', [], $sections_id );
$rows = [
	'hero'        => $sections_hero,
	'rich_text'   => $sections_rich_text,
	'card_grid'   => $sections_card_grid,
	'media_text'  => $sections_media_text,
	'accordion'   => $sections_accordion,
	'stats'       => $sections_stats,
	'testimonials' => $sections_testimonials,
	'logo_strip'  => $sections_logo_strip,
	'contact_bar' => $sections_contact_bar,
	'cta_banner'  => $sections_cta_banner,
	'buttons'     => $sections_buttons,
	'placeholder' => $sections_placeholder,
];
// The site components' pages: a little text for them to sit around (enough to scroll behind
// Navigation's full-screen menu on phones).
$site_text = '<p>Edited on its own page in wp-admin, not added as a section: it appears on every page of a real site. Switch it on in the site\'s <code>rnnbrwn_sections</code> filter.</p>

<p>This page shows it around a little text, the way a real page would.</p>';
$site_rows = [
	'navigation' => [
		$rich_text( 'Navigation', $site_text ),
		$rich_text( 'On phones', '<p>Below the md breakpoint the links are behind a menu button that opens them full screen. The page behind is hidden, out of reach and doesn\'t scroll.</p>', [ 'background' => 'surface', 'anchor' => 'on-phones' ] ),
	],
	'footer'     => [
		$rich_text( 'Footer', $site_text ),
	],
];
foreach ( $site_rows as $name => $sections_for_page ) {
	update_field( 'field_rs_sections', $sections_for_page, $site_pages[ $name ] );
}

foreach ( $rows as $name => $sections_for_page ) {
	update_field( 'field_rs_sections', $sections_for_page, $component_pages[ $name ] );
	WP_CLI::log( sprintf( '%s (page %d): %d sections', get_the_title( $component_pages[ $name ] ), $component_pages[ $name ], count( $sections_for_page ) ) );
}

// The Example Site's starter content: only while the page has no sections, so what's added in
// WordPress is never overwritten. To start it again, remove all its sections and re-run the seed.
if ( ! get_field( 'field_rs_sections', $example_id ) ) {
	$contact = home_url( '/contact/' );
	update_field( 'field_rs_sections', [
		$hero( 'Good work, made close to home', $photo + [
			'eyebrow'      => 'Example Site',
			'intro'        => 'A made-up small business, to see the components working together on one page as they would on a real site.',
			'height'       => 'tall',
			'background'   => 'black',
			'hero_buttons' => [ $button( 'Get in touch', 'solid' ), $button( 'See what we do', 'text', '#services' ) ],
		] ),
		$rich_text( 'What we do', '<p>We design and make things for people nearby: small, careful work, done properly and delivered on time.</p>

<h3>How it works</h3>
<ol>
 	<li>Tell us what you need.</li>
 	<li>We send a plan and a price within a week.</li>
 	<li>We make it, and keep you posted along the way.</li>
</ol>', [ 'anchor' => 'services' ] ),
		$buttons( [ $button( 'Ask for a price', 'solid' ), $button( 'Read about us', 'outline', '#about' ) ] ),
		$rich_text( 'About us', '<p>Started in a spare room, now a small team. We still answer every message ourselves.</p>

<blockquote>They listened, then made exactly what we had in mind, only better.</blockquote>', [ 'anchor' => 'about', 'background' => 'surface' ] ),
		$hero( 'Ready to start?', [
			'eyebrow'      => '',
			'intro'        => 'Say hello and tell us about your project.',
			'background'   => 'brand',
			'width'        => 'full',
			'hero_buttons' => [ $button( 'Get in touch', 'solid' ), $button( 'Email us', 'outline', 'mailto:hello@example.com' ) ],
		] ),
	], $example_id );
	WP_CLI::log( 'Example Site (page ' . $example_id . '): starter content added' );
} else {
	WP_CLI::log( 'Example Site (page ' . $example_id . '): left as it is (' . count( get_field( 'field_rs_sections', $example_id ) ) . ' sections)' );
}
WP_CLI::success( 'Component test pages and the test menu are ready.' );
