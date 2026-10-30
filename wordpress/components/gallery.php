<?php
// Gallery: an optional eyebrow, heading and intro, a grid of images from the Media Library (all
// cropped to one shape), then up to three buttons (rs_buttons). Clicking an image opens it large
// in a lightbox, with its caption. The editor picks the image shape, the most columns (2, 3 or 4;
// two on phones) and the alignment of the header and buttons.
// Captions and alt text come from each image's Media Library details.
// Astro half: rnnbrwn-components/src/components/Gallery.astro

return rs_layout( 'gallery', 'Gallery', [
	rs_eyebrow( 'gallery', 'Optional. A short label above the heading, e.g. "Recent work".' ),
	rs_field( 'gallery', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above the images.',
	] ),
	rs_textarea( 'gallery', 'intro', 'Intro', 2 ),
	rs_field( 'gallery', 'gallery', 'gallery_images', 'Images', [
		'required'      => 1,
		'min'           => 1,
		'return_format' => 'id',
		'preview_size'  => 'thumbnail',
		'insert'        => 'append',
		'library'       => 'all',
		'instructions'  => 'Pick several at once, and drag to reorder. Each image\'s Caption (shown when it\'s opened) and Alternative Text (what it shows, for screen readers) come from its Media Library details.',
	] ),
	rs_buttons( 'gallery' ),
	rs_select( 'gallery', 'image_shape', 'Image shape', [
		'landscape' => 'Landscape 3:2',
		'square'    => 'Square',
		'portrait'  => 'Portrait 4:5',
	], 'landscape', [
		'instructions' => 'Every image is cropped to this shape in the grid, from the middle. Opened, it shows whole.',
	] ),
	rs_select( 'gallery', 'columns', 'Columns', [
		'2' => '2',
		'3' => '3',
		'4' => '4',
	], '3', [
		'instructions' => 'The most images side by side. There are fewer when the space is narrower, down to two on phones.',
	] ),
	rs_select( 'gallery', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left', [
		'instructions' => 'The heading, intro and buttons.',
	] ),
] );
