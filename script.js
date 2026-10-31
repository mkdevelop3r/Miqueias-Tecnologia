// Número de WhatsApp que recebe as mensagens do formulário (formato: 55 + DDD + número)
const WHATSAPP_NUMBER = "5571981705860";

// ===== Menu mobile =====
const nav = document.getElementById("nav");
const menu = document.getElementById("menu");
const toggle = document.getElementById("menuToggle");

function setMenu(open) {
  menu.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
}

toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

// ===== Nav clara fora das seções escuras =====
const darkSections = [document.getElementById("inicio"), document.getElementById("contato")];

function updateNavTheme() {
  const y = nav.offsetHeight;
  const overDark = darkSections.some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= y && rect.bottom >= y;
  });
  nav.classList.toggle("is-light", !overDark);
}

// ===== Link ativo no menu =====
const sectionLinks = [...menu.querySelectorAll('a[href^="#"]:not(.btn)')];

function updateActiveLink() {
  let current = "inicio";
  sectionLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section && section.getBoundingClientRect().top <= nav.offsetHeight + 80) current = section.id;
  });
  sectionLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`));
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateNavTheme();
    updateActiveLink();
    ticking = false;
  });
}, { passive: true });
updateNavTheme();
updateActiveLink();

// ===== Animação de entrada =====
const revealTargets = document.querySelectorAll(".section__head, .problem, .card, .project, .about, .step, .contact__grid > *");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((el) => { el.classList.add("reveal"); observer.observe(el); });
}

// ===== Formulário de contato =====
// Por enquanto envia a mensagem pelo WhatsApp; pode ser trocado por um serviço de formulários na publicação.
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  let valid = true;

  ["nome", "contato", "desafio"].forEach((name) => {
    const field = form.elements[name].closest(".field");
    const empty = !data[name] || !data[name].trim();
    field.classList.toggle("has-error", empty);
    if (empty) valid = false;
  });

  if (!valid) {
    status.textContent = "Preencha nome, contato e a descrição do desafio.";
    status.className = "form__status is-error";
    return;
  }

  const message = [
    `Olá, Miquéias! Meu nome é ${data.nome.trim()}.`,
    data.empresa.trim() ? `Empresa: ${data.empresa.trim()}` : "",
    `Contato: ${data.contato.trim()}`,
    "",
    `Desafio: ${data.desafio.trim()}`,
  ].filter((line, i, arr) => line !== "" || arr[i - 1] !== "").join("\n");

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  status.textContent = "Abrimos o WhatsApp com sua mensagem. É só enviar!";
  status.className = "form__status is-success";
  form.reset();
});

form.querySelectorAll("input, textarea").forEach((el) =>
  el.addEventListener("input", () => el.closest(".field").classList.remove("has-error"))
);

document.getElementById("year").textContent = new Date().getFullYear();
