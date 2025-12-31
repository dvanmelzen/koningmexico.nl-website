// Navigation Loader - Include this script on all pages
// This will load the nav.html component and inject it into the page

(function() {
    // Load navigation on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavigation);
    } else {
        loadNavigation();
    }

    function loadNavigation() {
        // Check if nav is already loaded
        if (document.getElementById('main-header')) {
            return;
        }

        // Fetch and inject navigation
        fetch('nav.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load navigation');
                }
                return response.text();
            })
            .then(html => {
                // Create a temporary container
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                // Insert navigation at the top of body
                const nav = tempDiv.firstElementChild;
                if (document.body.firstChild) {
                    document.body.insertBefore(nav, document.body.firstChild);
                } else {
                    document.body.appendChild(nav);
                }

                // Execute inline scripts
                const scripts = tempDiv.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.body.appendChild(newScript);
                });

                // Execute inline styles
                const styles = tempDiv.querySelectorAll('style');
                styles.forEach(style => {
                    const newStyle = document.createElement('style');
                    newStyle.textContent = style.textContent;
                    document.head.appendChild(newStyle);
                });

                console.log('✅ Navigation loaded successfully');
            })
            .catch(error => {
                console.error('❌ Failed to load navigation:', error);
            });
    }
})();
