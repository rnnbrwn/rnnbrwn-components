<?php
// CTA Banner: a compact call to action. An optional eyebrow, a heading (smaller than a section
// heading), an optional short text, then one to three buttons (rs_buttons). The editor picks the
// layout: the buttons beside the text on wider screens (the default), or everything centred.
// Astro half: rnnbrwn-components/src/components/CtaBanner.astro

return rs_layout( 'cta_banner', 'CTA Banner', [
	rs_eyebrow( 'cta_banner', 'Optional. A short label above the heading, e.g. "Ready to start?".' ),
	rs_field( 'cta_banner', 'text', 'heading', 'Heading', [
		'required'     => 1,
		'instructions' => 'One short line, e.g. "Book a free consultation".',
	] ),
	rs_textarea( 'cta_banner', 'intro', 'Short text', 2, [
		'instructions' => 'Optional. A sentence or two under the heading.',
	] ),
	rs_buttons( 'cta_banner', [
		'instructions' => 'One to three. Usually one Solid button for the main action, then Outline or Text link.',
		'min'          => 1,
	] ),
	rs_select( 'cta_banner', 'layout', 'Layout', [
		'beside' => 'Buttons beside the text (on wider screens)',
		'centre' => 'Centred',
	], 'beside', [
		'instructions' => 'Beside: the text on the left and the buttons on the right; on phones the buttons go under the text. Centred: the text and buttons centred, one under the other.',
	] ),
] );
