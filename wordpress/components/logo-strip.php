<?php
// Logo Strip: an optional eyebrow, heading and intro, then up to twelve logos (each an image, the
// company's name for screen readers and an optional link). The editor picks the logos' colour
// (Original, or Single colour: every logo in the text colour) and the alignment.
// Astro half: rnnbrwn-components/src/components/LogoStrip.astro

return rs_layout( 'logo_strip', 'Logo Strip', [
	rs_eyebrow( 'logo_strip', 'Optional. A short label above the heading, e.g. "Trusted by".' ),
	rs_field( 'logo_strip', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above the logos.',
	] ),
	rs_textarea( 'logo_strip', 'intro', 'Intro', 2 ),
	rs_field( 'logo_strip', 'repeater', 'logo_strip_logos', 'Logos', [
		'min'          => 1,
		'max'          => 12,
		'layout'       => 'block',
		'button_label' => 'Add logo',
		'collapsed'    => 'field_rs_logo_strip_logos_name',
		'sub_fields'   => [
			rs_image( 'logo_strip_logos', 'image', 'Logo', [
				'required'     => 1,
				'preview_size' => 'thumbnail',
				'instructions' => 'A PNG with a transparent background works best (needed for Single colour). Shown at the same height as the others.',
			] ),
			rs_field( 'logo_strip_logos', 'text', 'name', 'Name', [
				'required'     => 1,
				'instructions' => 'The company\'s name, e.g. "Hay Festival". Not shown: screen readers read it out.',
			] ),
			rs_field( 'logo_strip_logos', 'link', 'link', 'Link', [
				'return_format' => 'array',
				'instructions'  => 'Optional, e.g. their website. The link text isn\'t used: the logo is the link.',
			] ),
		],
	] ),
	rs_select( 'logo_strip', 'logo_colour', 'Logo colour', [
		'original' => 'Original: each logo in its own colours',
		'single'   => 'Single colour: every logo in the text colour, so they match',
	], 'original', [
		'instructions' => 'Single colour needs logos with transparent backgrounds: a logo on a white box becomes a solid block.',
	] ),
	rs_select( 'logo_strip', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left' ),
] );
