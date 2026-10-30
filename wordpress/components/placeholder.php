<?php
// Placeholder: a labelled box that shows its own settings. For testing the shared
// settings on test pages only; don't switch it on for a real site.
return rs_layout( 'placeholder', 'Placeholder (testing only)', [
	rs_field( 'placeholder', 'text', 'heading', 'Heading' ),
	rs_textarea( 'placeholder', 'note', 'Note', 2 ),
] );
