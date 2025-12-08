export function SidebarScript() {
	// This script runs BEFORE React hydration
	const script = `
		(function() {
			try {
				var stored = localStorage.getItem('sidebar-state');
				if (stored) {
					var state = JSON.parse(stored);
					// Set CSS variables for each sidebar
					Object.keys(state.sidebars || {}).forEach(function(id) {
						var sidebar = state.sidebars[id];
						var width = sidebar.open ? '16rem' : '3.5rem';
						document.documentElement.style.setProperty('--sidebar-' + id + '-width', width);
					});
				}
			} catch (e) {
				// Fail silently
			}
		})();
	`;

	return (
		<script
			dangerouslySetInnerHTML={{ __html: script }}
			// Blocking script - runs immediately
		/>
	);
}
