<?php
// Contact Bar: an optional eyebrow, heading and intro, a list of contact details (each an email
// address, a phone number, an address or some other text, e.g. opening hours), then up to three
// buttons (rs_buttons). Links are made from the type (mailto:, tel:, a map search), so editors
// never type them. The editor picks whether the heading sits above the details (in a row) or
// beside them on wider screens, and (above only) whether it's all left-aligned or centred.
// Astro half: rnnbrwn-components/src/components/ContactBar.astro

return rs_layout( 'contact_bar', 'Contact Bar', [
	rs_eyebrow( 'contact_bar', 'Optional. A short label above the heading, e.g. "Get in touch".' ),
	rs_field( 'contact_bar', 'text', 'heading', 'Heading', [
		'instructions' => 'Optional. A heading above (or beside) the details.',
	] ),
	rs_textarea( 'contact_bar', 'intro', 'Intro', 2 ),
	rs_field( 'contact_bar', 'repeater', 'contact_bar_details', 'Details', [
		'min'          => 1,
		'max'          => 6,
		'layout'       => 'block',
		'button_label' => 'Add detail',
		'collapsed'    => 'field_rs_contact_bar_details_label',
		'sub_fields'   => [
			rs_select( 'contact_bar_details', 'type', 'Type', [
				'email'   => 'Email',
				'phone'   => 'Telephone',
				'address' => 'Address',
				'other'   => 'Other (e.g. opening hours)',
			], 'email', [
				'instructions' => 'Sets the icon and the link: email opens a new message, telephone calls the number on a phone.',
			] ),
			rs_field( 'contact_bar_details', 'text', 'label', 'Label', [
				'instructions' => 'Optional. Shown above it, e.g. "Sales" or "Office". Left empty, email, telephone and address are labelled "Email", "Telephone" and "Address".',
			] ),
			rs_field( 'contact_bar_details', 'email', 'email', 'Email address', [
				'required'          => 1,
				'placeholder'       => 'hello@example.com',
				'conditional_logic' => rs_when( 'contact_bar_details', 'type', 'email' ),
			] ),
			rs_field( 'contact_bar_details', 'text', 'phone', 'Phone number', [
				'required'          => 1,
				'placeholder'       => '+44 141 555 0123',
				'instructions'      => 'As it should be shown. Spaces and brackets are fine; start with the country code (+44) for callers from abroad.',
				'conditional_logic' => rs_when( 'contact_bar_details', 'type', 'phone' ),
			] ),
			rs_textarea( 'contact_bar_details', 'text', 'Text', 3, [
				'required'          => 1,
				'instructions'      => 'An address: one part per line (street, town, postcode). Other: a line or two, e.g. "Mon–Fri, 9am–5pm".',
				'conditional_logic' => [
					[ [ 'field' => 'field_rs_contact_bar_details_type', 'operator' => '==', 'value' => 'address' ] ],
					[ [ 'field' => 'field_rs_contact_bar_details_type', 'operator' => '==', 'value' => 'other' ] ],
				],
			] ),
			rs_field( 'contact_bar_details', 'true_false', 'map_link', 'Link to a map', [
				'ui'                => 1,
				'default_value'     => 0,
				'instructions'      => 'Opens the address in Google Maps, in a new tab.',
				'conditional_logic' => rs_when( 'contact_bar_details', 'type', 'address' ),
			] ),
		],
	] ),
	rs_buttons( 'contact_bar' ),
	rs_select( 'contact_bar', 'layout', 'Layout', [
		'row'    => 'Heading above the details, in a row',
		'beside' => 'Heading beside the details (on wider screens)',
	], 'row', [
		'instructions' => 'Beside: the eyebrow, heading, intro and buttons sit in a column on the left, the details listed on the right. On phones the details are always one under another.',
	] ),
	rs_select( 'contact_bar', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left', [
		'instructions'      => 'Centred: the heading, the details (as a group; each keeps its icon beside it) and the buttons.',
		'conditional_logic' => rs_when( 'contact_bar', 'layout', 'row' ),
	] ),
] );
