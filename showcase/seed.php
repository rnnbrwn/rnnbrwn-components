<?php
// Creates (or refreshes) the component test pages shown at rnnbrwn.xyz/components/:
// a "Components" overview page, one child page per component (/components/hero/ ...) on the
// Sections template holding test versions of that component, a "Parts" page listing the parts
// (see $part_names), and the test Navigation menu linking them. Safe to re-run: it updates the pages instead of duplicating them.
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
	// Page settings: a light page (the test pages' preview switch can show the others).
	update_field( 'field_rs_page_surface', 'light', $id );
	return $id;
};

$id              = $test_page( 'components', 'Components' );
$component_pages = [
	'hero'        => $test_page( 'hero', 'Hero', $id, 1 ),
	'rich_text'   => $test_page( 'rich-text', 'Rich Text', $id, 2 ),
	'card_grid'   => $test_page( 'card-grid', 'Card Grid', $id, 3 ),
	'buttons'     => $test_page( 'buttons', 'Buttons', $id, 4 ),
	'placeholder' => $test_page( 'placeholder', 'Placeholder', $id, 5 ),
];
// Sections are what an editor adds to a page; parts are shared pieces that sections are built
// from (Buttons is both: its own section, and the buttons inside Hero). In the test menu the
// parts sit under "Parts", a page of its own (/components/parts/) that lists them.
$part_names = [ 'buttons', 'placeholder' ];
$parts_id   = $test_page( 'parts', 'Parts', $id, 6 );

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
	update_field( 'field_rs_page_surface', 'light', $example_id );
}

// ---------- Placeholder: every width, background and spacing option of the shared settings ----------
$placeholder = fn( $heading, $settings, $note = '' ) => array_merge( [
	'acf_fc_layout' => 'placeholder',
	'heading'       => $heading,
	'note'          => $note,
	'width'         => 'content',
	'spacing'       => 'm',
	'background'    => 'page',
	'anchor'        => '',
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
// The overview, the Example Site, one link per section's page, then Parts with the parts'
// pages as its sub-links (a dropdown on wider screens).
$add_page( $id );
$add_page( $example_id );
foreach ( $component_pages as $name => $page_id ) {
	if ( ! in_array( $name, $part_names, true ) ) {
		$add_page( $page_id );
	}
}
$parts_item = $add_page( $parts_id );
foreach ( $part_names as $name ) {
	$add_page( $component_pages[ $name ], $parts_item );
}
set_theme_mod( 'nav_menu_locations', array_merge( (array) get_theme_mod( 'nav_menu_locations' ), [ 'main_navigation' => $menu_id ] ) );

update_field( 'field_rs_navigation_source', 'menu', 'option' );
// The one-page alternative, ready to try by switching Links to "Sections on the site".
update_field( 'field_rs_navigation_navigation_sections', [
	[ 'target' => '/components/hero/#hero', 'label' => 'Hero' ],
	[ 'target' => '/components/rich-text/#rich-text', 'label' => 'Rich Text' ],
	[ 'target' => '/components/placeholder/#surfaces', 'label' => 'Surfaces' ],
], 'option' );
update_field( 'field_rs_navigation_background', 'page', 'option' );
update_field( 'field_rs_navigation_width', 'wide', 'option' );

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

$hero = fn( $heading, $settings = [] ) => array_merge( [
	'acf_fc_layout'     => 'hero',
	'variant'           => 'centred',
	'eyebrow'           => 'Eyebrow label',
	'heading'           => $heading,
	'intro'             => 'An intro of a sentence or two, saying what the page is about and what to do next.',
	'hero_buttons'      => [
		[ 'link' => [ 'title' => 'Main button', 'url' => home_url( '/contact/' ), 'target' => '' ], 'style' => 'solid' ],
		[ 'link' => [ 'title' => 'Second button', 'url' => home_url( '/components/placeholder/#surfaces' ), 'target' => '' ], 'style' => 'outline' ],
		[ 'link' => [ 'title' => 'Text link', 'url' => home_url( '/components/buttons/' ), 'target' => '' ], 'style' => 'text' ],
	],
	'height'            => 'standard',
	'image'             => '',
	'focus'             => 'center',
	'image_informative' => 0,
	'alignment'         => 'left',
	'width'             => 'content',
	'spacing'           => 'm',
	'background'        => 'page',
	'anchor'            => '',
], $settings );
// The photo Heroes use a real photo: the media-library image titled "eugene" when there is one
// (uploaded locally for testing), otherwise the test pattern. The last Hero always uses the
// pattern, to keep the worst case for text contrast on the page.
$real_photo = get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'title' => 'eugene', 'numberposts' => 1 ] );
$photo      = [ 'variant' => 'background_image', 'image' => $real_photo ? $real_photo[0]->ID : $photo_id, 'width' => 'full' ];
$pattern    = [ 'variant' => 'background_image', 'image' => $photo_id, 'width' => 'full' ];

$sections_hero = [
	$hero( 'Hero: centred', [ 'anchor' => 'hero' ] ),
	$hero( 'Hero: centred, tall, on Accent, full width', [ 'height' => 'tall', 'background' => 'accent', 'width' => 'full' ] ),
	$hero( 'Hero: centred on Dark, as a panel', [ 'background' => 'dark' ] ),
	$hero( 'Hero: heading only', [ 'eyebrow' => '', 'intro' => '', 'hero_buttons' => [] ] ),
	$hero( 'Hero: background image, left aligned', $photo ),
	$hero( 'Hero: background image, tall, centred, on Dark', $photo + [ 'height' => 'tall', 'alignment' => 'centre', 'background' => 'dark', 'focus' => 'top' ] ),
	$hero( 'Hero: background image on Accent, described photo', $photo + [ 'background' => 'accent', 'image_informative' => 1 ] ),
	$hero( 'Hero: background image, wide, on Subtle', array_merge( $photo, [ 'width' => 'wide', 'background' => 'subtle', 'hero_buttons' => [
		[ 'link' => [ 'title' => 'Main button', 'url' => home_url( '/contact/' ), 'target' => '' ], 'style' => 'solid' ],
		[ 'link' => [ 'title' => 'Other site', 'url' => 'https://example.com', 'target' => '_blank' ], 'style' => 'outline' ],
	] ] ) ),
	$hero( 'Hero: contrast test pattern (worst case)', $pattern ),
];

// ---------- Buttons ----------
// No headings in this component, so the button labels say what each row is testing.

$button  = fn( $title, $style, $url = '/contact/', $target = '' ) => [
	'link'  => [ 'title' => $title, 'url' => str_starts_with( $url, '/' ) ? home_url( $url ) : $url, 'target' => $target ],
	'style' => $style,
];
$buttons = fn( $row, $settings = [] ) => array_merge( [
	'acf_fc_layout'   => 'buttons',
	'buttons_buttons' => $row,
	'alignment'       => 'left',
	'width'           => 'content',
	'spacing'         => 's',
	'background'      => 'page',
	'anchor'          => '',
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
	$buttons( $every( 'on Subtle' ), [ 'background' => 'subtle' ] ),
	$buttons( $every( 'on Accent' ), [ 'background' => 'accent' ] ),
	$buttons( $every( 'on Dark' ), [ 'background' => 'dark' ] ),
	$buttons( $every( 'on Dark, full width' ), [ 'background' => 'dark', 'width' => 'full', 'alignment' => 'centre', 'spacing' => 'm' ] ),
	$buttons( [
		$button( 'A much longer button label, to see how it wraps on a phone', 'solid' ),
		$button( 'Another long label for the outline style', 'outline' ),
		$button( 'And a long text link that wraps as well', 'text' ),
	], [ 'width' => 'narrow' ] ),
];

// ---------- Rich Text ----------

$rich_text = fn( $heading, $body, $settings = [] ) => array_merge( [
	'acf_fc_layout' => 'rich_text',
	'heading'       => $heading,
	'body'          => $body,
	'width'         => 'content',
	'spacing'       => 'm',
	'background'    => 'page',
	'anchor'        => '',
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
	$rich_text( 'Rich Text on Subtle, narrow', $short, [ 'width' => 'narrow', 'background' => 'subtle' ] ),
	$rich_text( 'Rich Text on Accent, wide', $every_style, [ 'width' => 'wide', 'background' => 'accent' ] ),
	$rich_text( 'Rich Text on Dark, full width', $every_style, [ 'width' => 'full', 'background' => 'dark' ] ),
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
$link  = fn( $title, $url = '/contact/', $target = '' ) => [ 'title' => $title, 'url' => str_starts_with( $url, '/' ) ? home_url( $url ) : $url, 'target' => $target ];
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
$card_grid = fn( $heading, $settings = [] ) => array_merge( [
	'acf_fc_layout'     => 'card_grid',
	'eyebrow'           => 'Section eyebrow',
	'heading'           => $heading,
	'intro'             => 'An optional intro under the heading, saying what the cards are.',
	'card_grid_cards'   => $cards,
	'card_grid_buttons' => [ $button( 'See everything', 'outline' ) ],
	'columns'           => '3',
	'last_card'         => 'column',
	'card_style'        => 'panel',
	'width'             => 'content',
	'spacing'           => 'm',
	'background'        => 'page',
	'anchor'            => '',
], $settings );

$sections_card_grid = [
	$card_grid( 'Card Grid: 3 columns, Panel', [ 'anchor' => 'card-grid' ] ),
	$card_grid( 'Card Grid: 3 columns, Plain, no section eyebrow', [ 'card_style' => 'plain', 'eyebrow' => '' ] ),
	$card_grid( 'Card Grid: 2 columns, narrow, on Subtle', [ 'columns' => '2', 'width' => 'narrow', 'background' => 'subtle', 'card_grid_cards' => array_slice( $cards, 0, 4 ) ] ),
	$card_grid( 'Card Grid: 4 columns, wide, on Accent', [ 'columns' => '4', 'width' => 'wide', 'background' => 'accent' ] ),
	$card_grid( 'Card Grid: 4 columns, Plain, full width, on Dark', [ 'columns' => '4', 'width' => 'full', 'background' => 'dark', 'card_style' => 'plain', 'card_grid_buttons' => [ $button( 'Main button', 'solid' ), $button( 'Text link', 'text' ) ] ] ),
	$card_grid( 'Card Grid: 4 columns, Panel, on Dark, content width', [ 'columns' => '4', 'background' => 'dark', 'card_grid_buttons' => [] ] ),
	$card_grid( '', [ 'eyebrow' => '', 'intro' => '', 'card_grid_cards' => $text_cards, 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 4 cards in 3 columns', [ 'intro' => 'With Last card set to Fill the row, the fourth card spans the whole second row.', 'last_card' => 'fill', 'card_grid_cards' => array_merge( array_slice( $text_cards, 0, 3 ), [ array_merge( $text_cards[3], [ 'text' => 'Alone on its row, so it stretches across all three columns.' ] ) ] ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 5 cards in 3 columns, Plain', [ 'intro' => 'The fifth card spans the two columns left; its image stays the height of the others.', 'last_card' => 'fill', 'card_style' => 'plain', 'card_grid_cards' => array_slice( $cards, 0, 5 ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, 6 cards in 4 columns, wide, on Subtle', [ 'intro' => '', 'last_card' => 'fill', 'columns' => '4', 'width' => 'wide', 'background' => 'subtle', 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: last card fills the row, but the row is already full', [ 'intro' => 'Three cards in three columns: nothing to fill, so nothing stretches.', 'last_card' => 'fill', 'card_grid_cards' => array_slice( $cards, 0, 3 ), 'card_grid_buttons' => [] ] ),
	$card_grid( 'Card Grid: one card', [ 'intro' => '', 'card_grid_cards' => [ $cards[0] ], 'card_grid_buttons' => [] ] ),
];

$sections = [
	$placeholder( 'Width: narrow', [ 'width' => 'narrow' ] ),
	$placeholder( 'Width: content', [ 'width' => 'content' ], 'The default width.' ),
	$placeholder( 'Width: wide', [ 'width' => 'wide' ] ),
	$placeholder( 'Width: full', [ 'width' => 'full' ], 'The background runs edge to edge; the content stays in the content lane.' ),
	$placeholder( 'Background: same as the page', [ 'anchor' => 'surfaces' ], 'The default: always matches the page, whatever its surface.' ),
	$placeholder( 'Background: light', [ 'background' => 'light' ], 'Blends in on a light page; a panel on any other page surface.' ),
	$placeholder( 'Background: subtle', [ 'background' => 'subtle' ] ),
	$placeholder( 'Background: accent', [ 'background' => 'accent' ] ),
	$placeholder( 'Background: dark', [ 'background' => 'dark' ] ),
	$placeholder( 'Full width, subtle background', [ 'width' => 'full', 'background' => 'subtle' ] ),
	$placeholder( 'Full width, accent background', [ 'width' => 'full', 'background' => 'accent', 'spacing' => 'l' ] ),
	$placeholder( 'Full width, dark background', [ 'width' => 'full', 'background' => 'dark' ] ),
	$placeholder( 'Spacing: none', [ 'spacing' => 'none', 'background' => 'subtle' ] ),
	$placeholder( 'Spacing: small', [ 'spacing' => 's', 'background' => 'subtle' ] ),
	$placeholder( 'Spacing: large', [ 'spacing' => 'l', 'background' => 'subtle' ] ),
	$placeholder( 'Anchor ID', [ 'anchor' => 'anchor-test' ], 'Reachable at /components/placeholder/#anchor-test.' ),
];

// ---------- Fill the pages ----------

// The overview and Parts have no sections of their own: the site lists the pages there.
update_field( 'field_rs_sections', [], $id );
update_field( 'field_rs_sections', [], $parts_id );
$rows = [
	'hero'        => $sections_hero,
	'rich_text'   => $sections_rich_text,
	'card_grid'   => $sections_card_grid,
	'buttons'     => $sections_buttons,
	'placeholder' => $sections,
];
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
			'background'   => 'dark',
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

<blockquote>They listened, then made exactly what we had in mind, only better.</blockquote>', [ 'anchor' => 'about', 'background' => 'subtle' ] ),
		$hero( 'Ready to start?', [
			'eyebrow'      => '',
			'intro'        => 'Say hello and tell us about your project.',
			'background'   => 'accent',
			'width'        => 'full',
			'hero_buttons' => [ $button( 'Get in touch', 'solid' ), $button( 'Email us', 'outline', 'mailto:hello@example.com' ) ],
		] ),
	], $example_id );
	WP_CLI::log( 'Example Site (page ' . $example_id . '): starter content added' );
} else {
	WP_CLI::log( 'Example Site (page ' . $example_id . '): left as it is (' . count( get_field( 'field_rs_sections', $example_id ) ) . ' sections)' );
}
WP_CLI::success( 'Component test pages and the test menu are ready.' );
