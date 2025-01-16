// Mobile Navigation
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    const navList = document.querySelector('.nav-list');

    // Set active state for current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item a').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // Toggle menu
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        navList.classList.toggle('active');
        nav.classList.toggle('menu-open');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = navList.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && navList.classList.contains('active')) {
            hamburger.classList.remove('active');
            navList.classList.remove('active');
            nav.classList.remove('menu-open');
            document.body.style.overflow = '';
        }
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-item a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navList.classList.remove('active');
            nav.classList.remove('menu-open');
            document.body.style.overflow = '';
        });
    });

    // Prevent menu close when clicking inside menu
    navList.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('active')) {
            hamburger.classList.remove('active');
            navList.classList.remove('active');
            nav.classList.remove('menu-open');
            document.body.style.overflow = '';
        }
    });
}); 