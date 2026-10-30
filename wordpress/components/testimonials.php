<?php
// Testimonials: an optional eyebrow, heading and intro, up to six quotes (each the quote, the
// person's name, their role or company and an optional photo), then up to three buttons
// (rs_buttons). The editor picks the layout (Large or Grid), for a grid the most columns (2 or 3)
// and whether the last quote fills the rest of its row, the quote look and the alignment.
// Astro half: rnnbrwn-components/src/components/Testimonials.astro

$when_grid = rs_when( 'testimonials', 'layout', 'grid' );

return rs_layout( 'testimonials', 'Testimonials', [
	rs_eyebrow( 'testimonials', 'Optional. A short label above the heading, e.g. "What clients say".' ),
	rs_field( 'testimonials', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above the quotes.',
	] ),
	rs_textarea( 'testimonials', 'intro', 'Intro', 2 ),
	rs_field( 'testimonials', 'repeater', 'testimonials_quotes', 'Quotes', [
		'min'          => 1,
		'max'          => 6,
		'layout'       => 'block',
		'button_label' => 'Add quote',
		'collapsed'    => 'field_rs_testimonials_quotes_name',
		'sub_fields'   => [
			rs_textarea( 'testimonials_quotes', 'quote', 'Quote', 4, [
				'required'     => 1,
				'instructions' => 'What they said, without quote marks: those are added.',
			] ),
			rs_field( 'testimonials_quotes', 'text', 'name', 'Name', [
				'required' => 1,
			] ),
			rs_field( 'testimonials_quotes', 'text', 'role', 'Role or company', [
				'instructions' => 'Optional, e.g. "Events manager, Hay Festival".',
			] ),
			rs_image( 'testimonials_quotes', 'photo', 'Photo', [
				'preview_size' => 'thumbnail',
				'instructions' => 'Optional. A small round photo beside their name, cropped from the middle.',
			] ),
		],
	] ),
	rs_buttons( 'testimonials' ),
	rs_select( 'testimonials', 'layout', 'Layout', [
		'grid'  => 'Grid: quotes side by side',
		'large' => 'Large: each quote big, one under another (best for one quote)',
	], 'grid' ),
	rs_select( 'testimonials', 'columns', 'Columns', [
		'2' => '2',
		'3' => '3',
	], '3', [
		'instructions'      => 'The most quotes side by side. There are fewer when the space is narrower, down to one on phones.',
		'conditional_logic' => $when_grid,
	] ),
	rs_select( 'testimonials', 'last_quote', 'Last quote', [
		'column' => 'Column width: every quote the same width',
		'fill'   => 'Fill the row: the last quote stretches across the space left in its row',
	], 'column', [
		'instructions'      => 'When the last row isn\'t full.',
		'conditional_logic' => $when_grid,
	] ),
	rs_select( 'testimonials', 'quote_style', 'Quote look', [
		'panel' => 'Panel: each quote on a filled, rounded background',
		'plain' => 'Plain: no fill, just the content',
	], 'panel' ),
	rs_select( 'testimonials', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left' ),
] );
