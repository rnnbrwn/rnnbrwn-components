<?php
// Rich Text: an optional heading and a block of editor text (paragraphs, subheadings,
// lists, quotes, links). Astro half: rnnbrwn-components/src/components/RichText.astro
return rs_layout( 'rich_text', 'Rich Text', [
	rs_field( 'rich_text', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. The section\'s main heading; use Subheading in the text below for smaller ones.',
	] ),
	rs_editor( 'rich_text', 'body', 'Text' ),
] );
