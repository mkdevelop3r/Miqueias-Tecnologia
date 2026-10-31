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

// ===== Métricas (Google Analytics 4) =====
// Cliques em contatos viram "contact_click"; botões que levam ao formulário viram "cta_click".
function track(event, params) {
  if (typeof window.gtag === "function") window.gtag("event", event, params);
}

document.querySelectorAll("[data-track]").forEach((el) => {
  el.addEventListener("click", () => {
    const name = el.dataset.track;
    if (name.startsWith("cta-")) track("cta_click", { location: name.slice(4) });
    else track("contact_click", { method: name });
  });
});

// ===== Formulário de contato =====
// Envia para o Netlify Forms (painel + notificação por e-mail) e oferece continuar a conversa no WhatsApp.
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("formSubmit");
const whatsappBtn = document.getElementById("formWhatsapp");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
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

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";
  status.textContent = "";
  status.className = "form__status";

  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    track("generate_lead", { method: "formulario" });

    form.querySelectorAll(".field").forEach((field) => { field.hidden = true; });
    submitBtn.hidden = true;
    status.textContent = "Mensagem recebida! Vou analisar seu desafio e retorno em breve. Se preferir, continue a conversa pelo WhatsApp.";
    status.className = "form__status is-success";
    whatsappBtn.href = whatsappUrl;
    whatsappBtn.hidden = false;
  } catch {
    // Falhou o envio: o WhatsApp vira o caminho principal para não perder o contato
    status.textContent = "Não foi possível enviar agora. Você pode mandar a mesma mensagem pelo WhatsApp:";
    status.className = "form__status is-error";
    whatsappBtn.href = whatsappUrl;
    whatsappBtn.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar mensagem";
  }
});

form.querySelectorAll("input, textarea").forEach((el) =>
  el.addEventListener("input", () => el.closest(".field").classList.remove("has-error"))
);

document.getElementById("year").textContent = new Date().getFullYear();
