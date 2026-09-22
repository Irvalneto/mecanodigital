// Mecano Soluções Digitais — comportamento do site (vanilla JS, sem dependências)

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initYear();
  initReveal();
  initContactForm();
  initFolderCards();
  initHighlightText();
  initHookSidebar();
  initHeroMeta();
});

/* --- Menu mobile --- */
function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-mobile");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  const open = () => {
    toggle.setAttribute("aria-expanded", "true");
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    isOpen ? close() : open();
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // fecha o menu se a viewport crescer para desktop
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) close();
  });
}

/* --- Ano no rodapé (copyright sempre atual) --- */
function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/* --- Reveal on scroll (progressivo, desliga sozinho sem reduced-motion) --- */
function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((el) => observer.observe(el));
}

/* --- Folder cards (home): entrada com stagger via anime.js.
   Sem anime.js/IO/motion reduzido, o CSS já entrega os cards visíveis. */
function initFolderCards() {
  const cards = document.querySelectorAll(".folder-card");
  if (!cards.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof anime === "undefined" || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      const targets = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      if (!targets.length) return;
      anime({
        targets,
        opacity: [0, 1],
        translateY: [24, 0],
        rotate: [-2, 0],
        duration: 520,
        delay: anime.stagger(90),
        easing: "easeOutQuad",
      });
      targets.forEach((el) => obs.unobserve(el));
    },
    { threshold: 0.2 }
  );
  cards.forEach((card) => observer.observe(card));
}

/* --- Painel "Entrega/Código/Comunicação" do hero: entrada com stagger. */
function initHeroMeta() {
  const items = document.querySelectorAll(".hero-meta-item");
  if (!items.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof anime === "undefined") {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  anime({
    targets: items,
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 480,
    delay: anime.stagger(120, { start: 300 }),
    easing: "easeOutQuad",
  });
}

/* --- Highlighted text: barra desliza atrás da frase via anime.js.
   Fica visível estático por padrão; só "prepara" a animação quando
   anime.js + IntersectionObserver + motion normal estão disponíveis. */
function initHighlightText() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const bars = document.querySelectorAll(".hl-bg");
  if (!bars.length || typeof anime === "undefined" || !("IntersectionObserver" in window)) return;

  bars.forEach((bar) => { bar.style.transform = "scaleX(0)"; });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        anime({ targets: entry.target, scaleX: [0, 1], duration: 600, easing: "easeOutExpo" });
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.8 }
  );
  bars.forEach((bar) => observer.observe(bar));
}

/* --- Hook sidebar (página Serviços): colapsa/expande em CSS puro
   (uma única propriedade — não precisa de JS para animar) e marca
   a seção ativa conforme o scroll. */
function initHookSidebar() {
  const sidebar = document.querySelector("#hook-sidebar");
  const toggle = document.querySelector("#hook-sidebar-toggle");
  if (!sidebar || !toggle) return;

  toggle.addEventListener("click", () => {
    const expanded = sidebar.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", String(expanded));
  });

  const links = Array.from(sidebar.querySelectorAll("a[href^='#']"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const setActive = (id) => {
    links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );
  sections.forEach((section) => observer.observe(section));
}

/* --- Formulário de contato: validação inline + loading + sucesso/erro --- */
// [INSERIR: endpoint real do formulário — ex. Formspree, n8n webhook ou backend próprio]
const FORM_ENDPOINT = "";

function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  const validators = {
    name: (v) => v.trim().length >= 2 || "Informe seu nome completo.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Informe um e-mail válido.",
    service: (v) => v !== "" || "Selecione o tipo de serviço.",
    message: (v) => v.trim().length >= 10 || "Conte um pouco mais sobre o projeto (mín. 10 caracteres).",
  };

  function validateField(input) {
    const rule = validators[input.name];
    if (!rule) return true;
    const result = rule(input.value);
    const field = input.closest(".field");
    const errorEl = field.querySelector(".field-error");
    if (result === true) {
      field.removeAttribute("data-invalid");
      return true;
    }
    field.setAttribute("data-invalid", "true");
    if (errorEl) errorEl.textContent = result;
    return false;
  }

  form.querySelectorAll("input, select, textarea").forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.removeAttribute("data-state");

    const fields = Array.from(form.querySelectorAll("input[name], select[name], textarea[name]"));
    const allValid = fields.map(validateField).every(Boolean);
    if (!allValid) {
      fields.find((f) => f.closest(".field").hasAttribute("data-invalid"))?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.dataset.loading = "true";

    try {
      if (!FORM_ENDPOINT) throw new Error("endpoint-not-configured");

      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error("request-failed");

      status.dataset.state = "success";
      status.textContent = "Mensagem enviada. Retornamos em até 1 dia útil.";
      form.reset();
    } catch (err) {
      status.dataset.state = "error";
      status.textContent =
        "Não foi possível enviar pelo formulário agora. Escreva direto para [INSERIR: e-mail de contato] com os mesmos detalhes — respondemos em até 1 dia útil.";
    } finally {
      submitBtn.disabled = false;
      delete submitBtn.dataset.loading;
    }
  });
}
