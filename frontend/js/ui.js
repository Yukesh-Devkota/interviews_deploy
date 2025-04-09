console.log('ui.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const sidebarIcon = document.getElementById('sidebarIcon');
  const sidebarToggle = document.getElementById('sidebarToggle');

  if (sidebar && sidebarIcon && sidebarToggle) {
    sidebarIcon.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      sidebarIcon.style.display = 'none';
    });

    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      sidebarIcon.style.display = 'block';
    });
  }
});