<?php
// Media Text: an image beside a block of text (an optional eyebrow, heading, editor text and up
// to three buttons). The editor picks which side the image is on, its shape (with a "keep in
// view" point for cropped shapes), how the width is split and how the text lines up beside it.
// On phones the image always sits above the text.
// Astro half: rnnbrwn-components/src/components/MediaText.astro

$when_cropped = rs_when( 'media_text', 'image_shape', 'original', '!=' );

return rs_layout( 'media_text', 'Media Text', [
	rs_image( 'media_text', 'image', 'Image', [
		'required'     => 1,
		'instructions' => 'Its alt text (set in the Media Library) is read to screen readers; leave that empty for a purely decorative image.',
	] ),
	rs_eyebrow( 'media_text', 'Optional. A short label above the heading, e.g. "About us".' ),
	rs_field( 'media_text', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. Use Subheading in the text below for smaller ones.',
	] ),
	rs_editor( 'media_text', 'body', 'Text' ),
	rs_buttons( 'media_text' ),
	rs_select( 'media_text', 'image_side', 'Image side', [
		'left'  => 'Left',
		'right' => 'Right',
	], 'left', [
		'instructions' => 'On phones the image is always above the text. For a zig-zag, alternate the sides of sections that follow each other.',
	] ),
	rs_select( 'media_text', 'image_shape', 'Image shape', [
		'original'  => 'Original: never cropped',
		'landscape' => 'Landscape (3:2)',
		'square'    => 'Square',
		'portrait'  => 'Portrait (4:5)',
	], 'original' ),
	rs_select( 'media_text', 'focus', 'Keep in view', [
		'center' => 'The middle of the image',
		'top'    => 'The top',
		'bottom' => 'The bottom',
		'left'   => 'The left side',
		'right'  => 'The right side',
	], 'center', [
		'instructions'      => 'Which part of the image to keep when it\'s cropped to the shape.',
		'conditional_logic' => $when_cropped,
	] ),
	rs_select( 'media_text', 'split', 'Split', [
		'half'        => 'Half and half',
		'image_wider' => 'Image wider (about 60/40)',
		'text_wider'  => 'Text wider (about 60/40)',
	], 'half' ),
	rs_select( 'media_text', 'text_alignment', 'Text lines up with the image\'s', [
		'top'    => 'Top',
		'middle' => 'Middle',
		'bottom' => 'Bottom',
	], 'middle' ),
] );
