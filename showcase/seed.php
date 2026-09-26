<?php
// Creates (or refreshes) the "components" test page shown at rnnbrwn.xyz/components:
// a page on the Sections template holding test versions of every component.
// Safe to re-run: it replaces the page's sections instead of making a new page.
// When a component is added to the library, add its test rows below.
//
// Run from platform/rnnbrwn-cms:
//   export SITE=rnnbrwn-xyz DB_NAME=cms_rnnbrwn_xyz
//   docker compose --env-file .env.local run --rm -T wpcli eval "$(sed 1d ../rnnbrwn-components/showcase/seed.php)"

$page = get_page_by_path( 'components' );
$id   = $page ? $page->ID : wp_insert_post( [
	'post_type'   => 'page',
	'post_status' => 'publish',
	'post_title'  => 'Components',
	'post_name'   => 'components',
] );
update_post_meta( $id, '_wp_page_template', 'template-sections.php' );

// Page settings: a light page (the test page's preview switch can show the others).
update_field( 'field_rs_page_surface', 'light', $id );

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
update_field( 'field_rs_navigation_logo_dark', $logo_dark_id, 'option' );

// A WordPress menu (Appearance → Menus) in the "Main navigation" location, rebuilt each time.
$menu = wp_get_nav_menu_object( 'Main navigation (test)' );
if ( $menu ) {
	wp_delete_nav_menu( $menu->term_id );
}
$menu_id = wp_create_nav_menu( 'Main navigation (test)' );
$add_page = fn( $slug ) => wp_update_nav_menu_item( $menu_id, 0, [
	'menu-item-object'    => 'page',
	'menu-item-object-id' => get_page_by_path( $slug )->ID,
	'menu-item-type'      => 'post_type',
	'menu-item-status'    => 'publish',
] );
$add_link = fn( $title, $url, $target = '' ) => wp_update_nav_menu_item( $menu_id, 0, [
	'menu-item-title'  => $title,
	'menu-item-url'    => $url,
	'menu-item-target' => $target,
	'menu-item-type'   => 'custom',
	'menu-item-status' => 'publish',
] );
$add_page( 'home' );
$add_page( 'components' );
$add_link( 'Anchor test', '/components/#anchor-test' );
$add_page( 'contact' );
$add_link( 'Example site', 'https://example.com', '_blank' );
set_theme_mod( 'nav_menu_locations', array_merge( (array) get_theme_mod( 'nav_menu_locations' ), [ 'main_navigation' => $menu_id ] ) );

update_field( 'field_rs_navigation_source', 'menu', 'option' );
// The one-page alternative, ready to try by switching Links to "Sections on the site".
update_field( 'field_rs_navigation_navigation_sections', [
	[ 'target' => '/components/#rich-text', 'label' => 'Rich Text' ],
	[ 'target' => '/components/#surfaces', 'label' => 'Surfaces' ],
	[ 'target' => '/components/#anchor-test', 'label' => 'Anchor test' ],
], 'option' );
update_field( 'field_rs_navigation_background', 'page', 'option' );
update_field( 'field_rs_navigation_width', 'wide', 'option' );

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
	$placeholder( 'Anchor ID', [ 'anchor' => 'anchor-test' ], 'Reachable at /components/#anchor-test.' ),
];

update_field( 'field_rs_sections', array_merge( $sections_rich_text, $sections ), $id );

WP_CLI::success( sprintf( 'Components page %d has %d sections.', $id, count( $sections_rich_text ) + count( $sections ) ) );
