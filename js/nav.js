// Mobile Navigation
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');
    const navOverlay = document.querySelector('.nav-overlay');
    const dropdowns = document.querySelectorAll('.dropdown');
    const navItems = document.querySelectorAll('.nav-item');

    // Add animation delay to nav items
    navItems.forEach((item, index) => {
        item.style.setProperty('--item-index', index);
    });

    // Toggle mobile menu
    function toggleMenu() {
        hamburger.classList.toggle('active');
        navList.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = navList.classList.contains('active') ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggleMenu);
    navOverlay.addEventListener('click', toggleMenu);

    // Handle dropdowns
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        
        // Mobile dropdown toggle
        if (window.innerWidth <= 768) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('active');
                const menu = dropdown.querySelector('.dropdown-menu');
                menu.style.maxHeight = dropdown.classList.contains('active') ? `${menu.scrollHeight}px` : '0';
            });
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navList.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            navList.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('active')) {
            toggleMenu();
        }
    });

    // Close menu on resize if mobile menu is open
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navList.classList.contains('active')) {
            toggleMenu();
        }
    });

    // Set active state based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const activeLink = navList.querySelector(`a[href="${currentPage}"]`);
    if (activeLink) {
        activeLink.setAttribute('aria-current', 'page');
        // If in dropdown, highlight parent
        const parentDropdown = activeLink.closest('.dropdown');
        if (parentDropdown) {
            parentDropdown.querySelector('> a').classList.add('active');
        }
    }
}); 