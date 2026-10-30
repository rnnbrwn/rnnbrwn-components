<?php
// Card Grid: an optional eyebrow, heading and intro, a grid of cards (each an optional image, eyebrow,
// heading, short text and one optional link, which makes the whole card clickable), then up to
// three buttons (rs_buttons). The editor picks the most columns (2, 3 or 4), whether the last
// card fills the rest of its row, and the card look.
// Astro half: rnnbrwn-components/src/components/CardGrid.astro

return rs_layout( 'card_grid', 'Card Grid', [
	rs_eyebrow( 'card_grid', 'Optional. A short label above the heading, e.g. "What we do".' ),
	rs_field( 'card_grid', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above the cards.',
	] ),
	rs_textarea( 'card_grid', 'intro', 'Intro', 2 ),
	rs_field( 'card_grid', 'repeater', 'card_grid_cards', 'Cards', [
		'min'          => 1,
		'layout'       => 'block',
		'button_label' => 'Add card',
		'collapsed'    => 'field_rs_card_grid_cards_heading',
		'sub_fields'   => [
			rs_image( 'card_grid_cards', 'image', 'Image', [
				'preview_size' => 'thumbnail',
				'instructions' => 'Optional. Cropped to the same shape on every card (3:2), from the middle.',
			] ),
			rs_eyebrow( 'card_grid_cards', 'Optional. A short label above the heading, e.g. a category or a date.' ),
			rs_field( 'card_grid_cards', 'text', 'heading', 'Heading', [
				'required' => 1,
			] ),
			rs_textarea( 'card_grid_cards', 'text', 'Text', 3 ),
			rs_field( 'card_grid_cards', 'link', 'link', 'Link', [
				'return_format' => 'array',
				'instructions'  => 'Optional. Makes the whole card clickable. The link text (e.g. "Read more") shows at the bottom of the card; leave it empty for just an arrow.',
			] ),
		],
	] ),
	rs_buttons( 'card_grid' ),
	rs_select( 'card_grid', 'columns', 'Columns', [
		'2' => '2',
		'3' => '3',
		'4' => '4',
	], '3', [
		'instructions' => 'The most cards side by side. There are fewer when the space is narrower, down to one on phones.',
	] ),
	rs_select( 'card_grid', 'last_card', 'Last card', [
		'column' => 'Column width: every card the same width',
		'fill'   => 'Fill the row: the last card stretches across the space left in its row',
	], 'column', [
		'instructions' => 'When the last row isn\'t full. With Fill the row, its image stays the same height as the others.',
	] ),
	rs_select( 'card_grid', 'card_style', 'Card look', [
		'panel' => 'Panel: each card on a filled, rounded background',
		'plain' => 'Plain: no fill, just the content',
	], 'panel' ),
] );
