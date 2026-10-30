<?php
// The library version this WordPress half belongs to. It must equal "version" in package.json
// (tests/version.mjs checks that). The library's Astro integration reads it from GraphQL at build
// time and stops the build if the site's copy of the library is a different version.

const RNNBRWN_COMPONENTS_VERSION = '0.4.0';

add_action( 'graphql_register_types', function () {
	register_graphql_object_type( 'RnnbrwnComponents', [
		'description' => 'The rnnbrwn-components library installed on this CMS.',
		'fields'      => [
			'version' => [
				'type'        => 'String',
				'description' => 'Library version, e.g. 0.4.0.',
			],
		],
	] );

	register_graphql_field( 'RootQuery', 'rnnbrwnComponents', [
		'type'        => 'RnnbrwnComponents',
		'description' => 'The rnnbrwn-components library installed on this CMS.',
		'resolve'     => fn() => [ 'version' => RNNBRWN_COMPONENTS_VERSION ],
	] );
} );
