function toggleMenu() {
  const menu = document.querySelector("#menu");
  menu.classList.toggle("open");
  return menu.classList.contains("open");
}
