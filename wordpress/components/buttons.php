<?php
// Buttons: a row of up to three buttons on its own, e.g. after a block of text. Other
// components include the same fields with rs_buttons() (see sections.php).
// Astro half: rnnbrwn-components/src/components/Buttons.astro

return rs_layout( 'buttons', 'Buttons', [
	rs_buttons( 'buttons', [ 'min' => 1 ] ),
	rs_select( 'buttons', 'alignment', 'Alignment', [
		'left'   => 'Left',
		'centre' => 'Centred',
	], 'left' ),
], [ 'spacing' => 's' ] );
