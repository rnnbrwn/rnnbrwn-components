<?php
// Hero: the big opening section of a page: an eyebrow, the heading, an intro and up to three
// buttons (rs_buttons), either centred on the section's colour or over a background photo.
// Astro half: rnnbrwn-components/src/components/Hero.astro

$when_photo = rs_when( 'hero', 'variant', 'background_image' );

return rs_layout( 'hero', 'Hero', [
	rs_select( 'hero', 'variant', 'Layout', [
		'centred'          => 'Centred: text only',
		'background_image' => 'Background image: text over a photo',
	], 'centred' ),
	rs_eyebrow( 'hero', 'Optional. A short label above the heading, e.g. "Glasgow · since 2004".' ),
	rs_field( 'hero', 'text', 'heading', 'Heading', [
		'required'     => 1,
		'instructions' => 'When the Hero is the first section, this is the page\'s main heading.',
	] ),
	rs_textarea( 'hero', 'intro', 'Intro', 3 ),
	rs_buttons( 'hero' ),
	rs_select( 'hero', 'height', 'Height', [
		'standard' => 'Standard: fits the content',
		'tall'     => 'Tall: generous space around the content',
	], 'standard' ),

	// Background image only.
	rs_image( 'hero', 'image', 'Photo', [
		'instructions'      => 'A wide photo, at least 1600px across. It\'s tinted with the section\'s Background colour so the text stays readable.',
		'conditional_logic' => $when_photo,
	] ),
	rs_select( 'hero', 'focus', 'Keep in view', [
		'center' => 'The middle of the photo',
		'top'    => 'The top of the photo',
		'bottom' => 'The bottom of the photo',
	], 'center', [
		'instructions'      => 'Which part of the photo to keep when it\'s cropped to fit a screen.',
		'conditional_logic' => $when_photo,
	] ),
	rs_field( 'hero', 'true_false', 'image_informative', 'Describe the photo to screen readers', [
		'ui'                => 1,
		'default_value'     => 0,
		'instructions'      => 'Off: the photo is decoration and screen readers skip it. On: they read its alt text (set in the Media Library), for photos that show something the heading doesn\'t say.',
		'conditional_logic' => $when_photo,
	] ),
	rs_select( 'hero', 'alignment', 'Text alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left', [ 'conditional_logic' => $when_photo ] ),
] );
