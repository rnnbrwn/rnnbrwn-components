<?php
// Accordion: an optional eyebrow, heading and intro, a list of items that open and close (each a
// title and editor text), then up to three buttons (rs_buttons). Good for FAQs. The editor picks
// whether several items can be open at once or only one, whether the first starts open, and
// whether the heading sits above the items or beside them on wider screens.
// Astro half: rnnbrwn-components/src/components/Accordion.astro

return rs_layout( 'accordion', 'Accordion', [
	rs_eyebrow( 'accordion', 'Optional. A short label above the heading, e.g. "FAQs".' ),
	rs_field( 'accordion', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above (or beside) the items.',
	] ),
	rs_textarea( 'accordion', 'intro', 'Intro', 2 ),
	rs_field( 'accordion', 'repeater', 'accordion_items', 'Items', [
		'min'          => 1,
		'layout'       => 'block',
		'button_label' => 'Add item',
		'collapsed'    => 'field_rs_accordion_items_title',
		'sub_fields'   => [
			rs_field( 'accordion_items', 'text', 'title', 'Title', [
				'required'     => 1,
				'instructions' => 'What people click to open it, e.g. a question.',
			] ),
			rs_editor( 'accordion_items', 'body', 'Text', [
				'required'     => 1,
				'instructions' => 'Shown when the item is open, e.g. the answer.',
			] ),
		],
	] ),
	rs_buttons( 'accordion' ),
	rs_select( 'accordion', 'opening', 'Opening', [
		'several' => 'Several at once: each item opens and closes on its own',
		'one'     => 'One at a time: opening an item closes the others',
	], 'several' ),
	rs_field( 'accordion', 'true_false', 'first_open', 'First item starts open', [
		'ui'            => 1,
		'default_value' => 0,
	] ),
	rs_select( 'accordion', 'layout', 'Layout', [
		'stacked' => 'Heading above the items',
		'beside'  => 'Heading beside the items (on wider screens)',
	], 'stacked', [
		'instructions' => 'Beside: the eyebrow, heading, intro and buttons sit in a column on the left, the items on the right. On phones they\'re always stacked.',
	] ),
] );
