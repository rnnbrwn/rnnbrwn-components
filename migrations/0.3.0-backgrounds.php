<?php
// v0.3.0: four surfaces became five backgrounds. Moves a site's saved Background choices to the
// new names, and the page's "Page surface" setting to "Page background":
//   light → white, subtle → surface, accent → brand, dark → black
//
// Run it once per site, after the site's theme has the v0.3.0 rnnbrwn-base:
//   local:       wp eval "$(sed 1d migrations/0.3.0-backgrounds.php)"   (in the wpcli container)
//   production:  copy it to the server and run `wp eval-file`, as in the /prod-wp skill
// To see what it would change first, set DRY_RUN=1: `docker compose ... run --rm -T -e DRY_RUN=1 wpcli ...`
// locally, `DRY_RUN=1 wp eval-file ...` on the server.
//
// It refuses to run twice: "accent" is a background again after it, and a second run would turn
// every new Accent into Brand.

global $wpdb;

$dry_run = (bool) getenv( 'DRY_RUN' );
$done    = 'rnnbrwn_migrated_backgrounds_0_3_0';
if ( get_option( $done ) ) {
	WP_CLI::error( "Already migrated (option {$done} is set)." );
}

$map  = [ 'light' => 'white', 'subtle' => 'surface', 'accent' => 'brand', 'dark' => 'black' ];
$seen = 0;

// Every section's Background (sections_<n>_background), on pages and their revisions.
$rows = $wpdb->get_results(
	"SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta}
	 WHERE meta_key REGEXP '^sections_[0-9]+_background$'"
);
foreach ( $rows as $row ) {
	if ( isset( $map[ $row->meta_value ] ) ) {
		WP_CLI::log( "post {$row->post_id} {$row->meta_key}: {$row->meta_value} → {$map[ $row->meta_value ]}" );
		$dry_run || $wpdb->update( $wpdb->postmeta, [ 'meta_value' => $map[ $row->meta_value ] ], [ 'meta_id' => $row->meta_id ] );
		$seen++;
	}
}

// Each page's "Page surface" (meta key surface) becomes "Page background" (meta key background).
// Only where ACF says it's this library's field, so another plugin's "surface" is left alone.
$rows = $wpdb->get_results(
	"SELECT m.meta_id, m.post_id, m.meta_value FROM {$wpdb->postmeta} m
	 JOIN {$wpdb->postmeta} r ON r.post_id = m.post_id AND r.meta_key = '_surface' AND r.meta_value = 'field_rs_page_surface'
	 WHERE m.meta_key = 'surface'"
);
foreach ( $rows as $row ) {
	$value = $map[ $row->meta_value ] ?? 'white';
	WP_CLI::log( "post {$row->post_id} Page surface {$row->meta_value} → Page background {$value}" );
	if ( ! $dry_run ) {
		$wpdb->update( $wpdb->postmeta, [ 'meta_key' => 'background', 'meta_value' => $value ], [ 'meta_id' => $row->meta_id ] );
		$wpdb->update( $wpdb->postmeta, [ 'meta_key' => '_background', 'meta_value' => 'field_rs_page_background' ], [ 'post_id' => $row->post_id, 'meta_key' => '_surface' ] );
	}
	$seen++;
}

// Navigation and Footer (options pages). Both save their Background as options_background.
$value = get_option( 'options_background' );
if ( isset( $map[ $value ] ) ) {
	WP_CLI::log( "options_background (Navigation and Footer): {$value} → {$map[ $value ]}" );
	$dry_run || update_option( 'options_background', $map[ $value ] );
	$seen++;
}

if ( $dry_run ) {
	WP_CLI::success( "Dry run: {$seen} values would change. Nothing was saved." );
} else {
	update_option( $done, gmdate( 'c' ), false );
	wp_cache_flush();
	WP_CLI::success( "{$seen} values moved to the new background names." );
}
