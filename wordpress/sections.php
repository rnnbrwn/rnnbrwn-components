<?php
// Shared page sections: the WordPress half of the rnnbrwn-components library.
// Each component is one file in components/, named to match its Astro file:
//   components/card-grid.php  ->  ACF layout "card_grid"  ->  CardGrid.astro
//
// Nothing happens until a child theme switches it on and picks its components:
//
//   add_filter( 'rnnbrwn_sections', fn() => [
//       'components' => [ 'hero', 'card_grid' ],
//       'pages'      => 'all',       // 'all' pages, or 'template': only pages using the "Sections" template
//       'background' => 'white',     // the site's usual page background; each page can change it
//       'navigation' => true,        // the site header (wp-admin → Navigation); see site/navigation.php
//       'footer'     => true,        // the site footer (wp-admin → Footer); see site/footer.php
//   ] );
//
// In GraphQL the sections are Page.pageSections.sections, one type per component
// (e.g. PageSectionsSectionsCardGridLayout), and the page's own settings are
// Page.pageSettings (background: the class the frontend puts on <body>).

require_once __DIR__ . '/version.php';

const RNNBRWN_SECTIONS_TEMPLATE = 'template-sections.php';

function rnnbrwn_sections_config() {
	return wp_parse_args( apply_filters( 'rnnbrwn_sections', [] ), [
		'components' => [],
		'pages'      => 'all',
		'background' => 'white',
		'navigation' => false,
		'footer'     => false,
	] );
}

// The five backgrounds (colour schemes) every site has. Each site sets its own colours for them
// (its palette, in the frontend); the choices never change, so every component works on every
// site. Values match the bg-* classes in the library's scss/base/_backgrounds.scss.
const RNNBRWN_SECTIONS_BACKGROUNDS = [
	'white'   => 'White',
	'surface' => 'Surface',
	'brand'   => 'Brand',
	'accent'  => 'Accent',
	'black'   => 'Black',
];

// The width lanes of the page grid. Values match data-width in the library's layout/_page.scss.
const RNNBRWN_SECTIONS_LANES = [
	'narrow'  => 'Narrow',
	'content' => 'Content',
	'wide'    => 'Wide',
];

// ---------- Field helpers ----------
// Keys must be unique across the whole site, so each one is "rs_" + layout + field name.

function rs_field( $layout, $type, $name, $label, $extra = [] ) {
	return array_merge( [
		'key'   => "field_rs_{$layout}_{$name}",
		'label' => $label,
		'name'  => $name,
		'type'  => $type,
	], $extra );
}

function rs_select( $layout, $name, $label, $choices, $default, $extra = [] ) {
	return rs_field( $layout, 'select', $name, $label, array_merge( [
		'choices'       => $choices,
		'default_value' => $default,
		'return_format' => 'value',
	], $extra ) );
}

// Conditional logic: show a field only when another field of the same layout has a value,
// e.g. 'conditional_logic' => rs_when( 'hero', 'variant', 'background_image' ).
function rs_when( $layout, $field, $value, $operator = '==' ) {
	return [ [ [ 'field' => "field_rs_{$layout}_{$field}", 'operator' => $operator, 'value' => $value ] ] ];
}

// An image from the Media Library (GraphQL: fetch it with the library's IMAGE_FIELDS).
function rs_image( $layout, $name, $label, $extra = [] ) {
	return rs_field( $layout, 'image', $name, $label, array_merge( [
		'return_format' => 'id',
		'preview_size'  => 'medium',
	], $extra ) );
}

// Plain text over a few lines, with no <p> or <br> added (the frontend lays it out).
function rs_textarea( $layout, $name, $label, $rows, $extra = [] ) {
	return rs_field( $layout, 'textarea', $name, $label, array_merge( [
		'rows'      => $rows,
		'new_lines' => '',
	], $extra ) );
}

// Eyebrow: a short label above a component's heading (the library's .eyebrow style).
function rs_eyebrow( $layout, $instructions ) {
	return rs_field( $layout, 'text', 'eyebrow', 'Eyebrow', [ 'instructions' => $instructions ] );
}

// Background: the same as the page (the default, so it follows the page when its background
// changes), or one of the five backgrounds. Used by every section's Settings tab, Navigation and Footer.
function rs_background( $layout, $extra = [] ) {
	return rs_select( $layout, 'background', 'Background', [ 'page' => 'Same as the page' ] + RNNBRWN_SECTIONS_BACKGROUNDS, 'page', $extra );
}

// Link fields are plain text (not ACF's URL type) so they accept "#contact", "/about/",
// "mailto:..." and "tel:..." as well as full web addresses.
function rs_link( $layout, $name, $label ) {
	return rs_field( $layout, 'text', $name, $label, [
		'instructions' => 'A web address, a page path like /about/, an anchor like #contact, or mailto:/tel: links.',
	] );
}

// Editor text (the Classic Editor box) with the trimmed "Sections" toolbar below:
// no media button, and no Text/HTML tab, so what editors write always fits the design.
function rs_editor( $layout, $name, $label, $extra = [] ) {
	return rs_field( $layout, 'wysiwyg', $name, $label, array_merge( [
		'toolbar'      => 'sections',
		'media_upload' => 0,
		'tabs'         => 'visual',
		'delay'        => 0,
	], $extra ) );
}

// NOTE: a repeater inside a layout needs a name unique across ALL components
// (WPGraphQL names its type after the field only), e.g. card_grid_items, not items.

// Buttons: the one way any component offers buttons (the Button component). Up to three,
// each a link (pick a page or type an address; the link text is the label) and a style.
// Named "<layout>_buttons" (hero_buttons → GraphQL heroButtons); render it with the
// library's ButtonRow.astro. Arrows are added automatically, so there's no icon choice.
function rs_buttons( $layout, $extra = [] ) {
	return rs_field( $layout, 'repeater', "{$layout}_buttons", 'Buttons', array_merge( [
		'instructions' => 'Optional, up to three. Usually one Solid button for the main action, then Outline or Text link.',
		'layout'       => 'table',
		'max'          => 3,
		'button_label' => 'Add button',
		'sub_fields'   => [
			rs_field( "{$layout}_buttons", 'link', 'link', 'Link', [
				'return_format' => 'array',
				'required'      => 1,
			] ),
			rs_select( "{$layout}_buttons", 'style', 'Style', [
				'solid'   => 'Solid',
				'outline' => 'Outline',
				'text'    => 'Text link',
			], 'solid' ),
		],
	], $extra ) );
}

// The settings every component shares, on their own tab. Values match the data-
// attributes and classes the library's CSS reads: data-width, data-space, bg-*.
function rs_settings( $layout, $defaults = [] ) {
	$d = wp_parse_args( $defaults, [ 'width' => 'content', 'spacing' => 'm' ] );
	return [
		rs_field( $layout, 'tab', 'settings_tab', 'Settings' ),
		rs_select( $layout, 'width', 'Width', RNNBRWN_SECTIONS_LANES + [ 'full' => 'Full width' ], $d['width'] ),
		// Full width: the background runs edge to edge; this is the lane the content lines up with.
		rs_select( $layout, 'content_width', 'Content width', RNNBRWN_SECTIONS_LANES, 'content', [
			'instructions'      => 'The background stays full width; this sets how wide the content inside it is.',
			'conditional_logic' => rs_when( $layout, 'width', 'full' ),
		] ),
		rs_select( $layout, 'spacing', 'Spacing above and below', [
			'none' => 'None',
			's'    => 'Small',
			'm'    => 'Medium',
			'l'    => 'Large',
		], $d['spacing'] ),
		// A background that isn't the page's makes the section a panel, unless it's full width.
		rs_background( $layout, [
			'instructions' => 'Pick a colour to make this section stand out as a panel (full-width sections fill the whole width instead).',
		] ),
		rs_field( $layout, 'text', 'anchor', 'Anchor ID', [
			'instructions' => 'Optional. Lets links jump to this section, e.g. "contact" for /#contact. Letters, numbers and dashes only.',
		] ),
	];
}

// One component: its own fields on a Content tab, then the shared Settings tab.
function rs_layout( $name, $label, $fields, $settings_defaults = [] ) {
	return [
		'key'        => "layout_rs_{$name}",
		'name'       => $name,
		'label'      => $label,
		'display'    => 'block',
		'sub_fields' => array_merge(
			[ rs_field( $name, 'tab', 'content_tab', 'Content' ) ],
			$fields,
			rs_settings( $name, $settings_defaults )
		),
	];
}

// Anchor IDs are tidied as they're saved ("Our Services" → "our-services"), so links to
// them (e.g. from Navigation) always match what the frontend puts on the section.
add_filter( 'acf/update_value/name=anchor', fn( $value ) => sanitize_title( (string) $value ) );

// ---------- Editor toolbar for section text ----------
// Only what the design styles (the library's .prose styles): subheadings, bold, italic,
// lists, quotes and links. No colours, fonts, alignment or underline.

add_filter( 'acf/fields/wysiwyg/toolbars', function ( $toolbars ) {
	$toolbars['Sections'] = [
		1 => [ 'formatselect', 'bold', 'italic', 'bullist', 'numlist', 'blockquote', 'link', 'unlink', 'removeformat', 'undo', 'redo' ],
	];
	return $toolbars;
} );

// The format menu offers only paragraphs and two subheading levels (the section's own
// heading is the h2), and pasted text arrives as plain text, so copying from Word or a
// web page doesn't bring its own fonts and colours along.
add_filter( 'tiny_mce_before_init', function ( $init ) {
	if ( rnnbrwn_sections_config()['components'] ) {
		$init['block_formats'] = 'Paragraph=p;Subheading=h3;Small subheading=h4';
		$init['paste_as_text'] = true;
	}
	return $init;
} );

// ---------- Registration ----------

// Priority 20: after the theme's own fields, so its wp-admin pages stay first in the menu.
add_action( 'acf/init', function () {
	$config  = rnnbrwn_sections_config();
	$layouts = [];

	// Site-wide components (not page sections).
	if ( $config['navigation'] ) {
		require __DIR__ . '/site/navigation.php';
	}
	if ( $config['footer'] ) {
		require __DIR__ . '/site/footer.php';
	}

	foreach ( $config['components'] as $name ) {
		$file = __DIR__ . '/components/' . str_replace( '_', '-', $name ) . '.php';
		if ( ! file_exists( $file ) ) {
			trigger_error( "rnnbrwn sections: no component called '{$name}'", E_USER_WARNING );
			continue;
		}
		$layouts[ "layout_rs_{$name}" ] = require $file;
	}

	// A flexible field with no layouts would give GraphQL an empty type and break the whole schema.
	if ( ! $layouts ) {
		return;
	}

	$location = 'template' === $config['pages']
		? [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => RNNBRWN_SECTIONS_TEMPLATE ] ] ]
		: [ [ [ 'param' => 'post_type', 'operator' => '==', 'value' => 'page' ] ] ];

	// Both field groups go on those pages, and always on the Page type in GraphQL, whichever
	// location rule is used.
	$add_to_pages = fn( $group ) => acf_add_local_field_group( $group + [
		'location'                              => $location,
		'show_in_graphql'                       => 1,
		'map_graphql_types_from_location_rules' => 0,
		'graphql_types'                         => [ 'Page' ],
	] );

	$add_to_pages( [
		'key'    => 'group_rs_page_sections',
		'title'  => 'Sections',
		'fields' => [
			[
				'key'          => 'field_rs_sections',
				'label'        => 'Sections',
				'name'         => 'sections',
				'type'         => 'flexible_content',
				'button_label' => 'Add section',
				'layouts'      => $layouts,
			],
		],
		'graphql_field_name' => 'pageSections',
	] );

	// Settings for the whole page, in a box in the edit screen's sidebar.
	$site_background = $config['background'];
	$add_to_pages( [
		'key'    => 'group_rs_page_settings',
		'title'  => 'Page settings',
		'fields' => [
			rs_select( 'page', 'background', 'Page background', RNNBRWN_SECTIONS_BACKGROUNDS, isset( RNNBRWN_SECTIONS_BACKGROUNDS[ $site_background ] ) ? $site_background : 'white', [
				'instructions' => 'The colour of the whole page. Sections set to "Same as the page" follow it.',
			] ),
		],
		'position'           => 'side',
		'graphql_field_name' => 'pageSettings',
	] );
}, 20 );

// ---------- "Sections" page template (only when 'pages' => 'template') ----------
// Headless, so no template file is needed: it only has to appear in the Template dropdown.

add_filter( 'theme_page_templates', function ( $templates ) {
	if ( 'template' === rnnbrwn_sections_config()['pages'] ) {
		$templates[ RNNBRWN_SECTIONS_TEMPLATE ] = 'Sections';
	}
	return $templates;
} );

// Pages on the Sections template are built only from sections, so hide the default text editor on them.
add_action( 'admin_init', function () {
	if ( 'template' !== rnnbrwn_sections_config()['pages'] ) {
		return;
	}
	$post_id = (int) ( $_GET['post'] ?? 0 );
	if ( $post_id && RNNBRWN_SECTIONS_TEMPLATE === get_page_template_slug( $post_id ) ) {
		remove_post_type_support( 'page', 'editor' );
	}
} );
