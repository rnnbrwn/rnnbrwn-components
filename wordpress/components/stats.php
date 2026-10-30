<?php
// Stats: an optional eyebrow, heading and intro, a row of up to four big figures (each a figure,
// a label and an optional short text, e.g. "400+" / "Events covered"), then up to three buttons
// (rs_buttons). The editor picks the figures' colour (Brand or Text) and the alignment.
// Astro half: rnnbrwn-components/src/components/Stats.astro

return rs_layout( 'stats', 'Stats', [
	rs_eyebrow( 'stats', 'Optional. A short label above the heading, e.g. "In numbers".' ),
	rs_field( 'stats', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above the figures.',
	] ),
	rs_textarea( 'stats', 'intro', 'Intro', 2 ),
	rs_field( 'stats', 'repeater', 'stats_figures', 'Figures', [
		'min'          => 1,
		'max'          => 4,
		'layout'       => 'block',
		'button_label' => 'Add figure',
		'collapsed'    => 'field_rs_stats_figures_figure',
		'sub_fields'   => [
			rs_field( 'stats_figures', 'text', 'figure', 'Figure', [
				'required'     => 1,
				'maxlength'    => 8,
				'instructions' => 'Short, so it can be shown big, e.g. 400+, 24/7, 98%, £2m.',
			] ),
			rs_field( 'stats_figures', 'text', 'label', 'Label', [
				'required'     => 1,
				'instructions' => 'What the figure counts, e.g. "Events covered".',
			] ),
			rs_textarea( 'stats_figures', 'text', 'Short text', 2, [
				'instructions' => 'Optional. A sentence of detail under the label.',
			] ),
		],
	] ),
	rs_buttons( 'stats' ),
	rs_select( 'stats', 'figure_colour', 'Figure colour', [
		'brand' => 'Brand: the site\'s main colour',
		'text'  => 'Text: the same colour as the words',
	], 'brand' ),
	rs_select( 'stats', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left' ),
] );
