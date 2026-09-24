// Mecano Soluções Digitais — comportamento do site (vanilla JS, sem dependências)
// Todo movimento é CSS; o JS só liga classes de estado. Sem JS, o site
// continua completo: o CSS só esconde elementos animáveis sob `.js`.

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initHeaderState();
  initYear();
  initReveal();
  initHighlightText();
  initServiceIndex();
  initContactForm();
});

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --- Menu mobile --- */
function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-mobile");
  if (!toggle || !nav) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  const close = ({ returnFocus = false } = {}) => {
    if (!isOpen()) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    nav.classList.remove("is-open");
    nav.inert = true; // links escondidos não recebem foco pelo teclado
    document.body.style.overflow = "";
    if (returnFocus) toggle.focus();
  };
  const open = () => {
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    nav.inert = false;
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
    nav.querySelector("a")?.focus({ preventScroll: true });
  };

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => close()));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close({ returnFocus: true });
  });

  // fecha o menu se a viewport crescer para desktop
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) close();
  });
}

/* --- Header: borda sutil depois que a página rola --- */
function initHeaderState() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* --- Ano no rodapé (copyright sempre atual) --- */
function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/* --- Reveal on scroll ---
   Elementos que entram juntos na tela ganham um atraso escalonado curto.
   Depois da entrada, o atributo sai: o elemento volta a usar as próprias
   transições (hover etc.) sem herdar a duração longa da entrada. */
function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  const reveal = (el) => el.classList.add("is-visible");

  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    items.forEach(reveal);
    return;
  }

  const cleanup = (el) => {
    if (el.dataset.reveal === "group") return;
    const onEnd = (e) => {
      if (e.target !== el || e.propertyName !== "opacity") return;
      el.removeEventListener("transitionend", onEnd);
      el.removeAttribute("data-reveal");
      el.classList.remove("is-visible");
      el.style.removeProperty("--reveal-delay");
    };
    el.addEventListener("transitionend", onEnd);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, i) => {
          const el = entry.target;
          el.style.setProperty("--reveal-delay", `${Math.min(i, 5) * 70}ms`);
          cleanup(el);
          reveal(el);
          obs.unobserve(el);
        });
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* --- Highlighted text: a barra cresce atrás da frase ao entrar na tela.
   Sem JS/IO ou com motion reduzido, o destaque já aparece completo. */
function initHighlightText() {
  const marks = document.querySelectorAll("mark.hl");
  if (!marks.length) return;

  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    marks.forEach((m) => m.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // espera o bloco em volta terminar de entrar antes de riscar
        setTimeout(() => entry.target.classList.add("is-visible"), 250);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 1 }
  );
  marks.forEach((m) => observer.observe(m));
}

/* --- Índice da página Serviços (inspirado no hook sidebar da rareui):
   marca a seção ativa conforme o scroll e desliza um marcador até ela. */
function initServiceIndex() {
  const index = document.querySelector("#service-index");
  if (!index) return;

  const list = index.querySelector("ul");
  const links = Array.from(index.querySelectorAll("a[href^='#']"));
  const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if (!sections.length) return;

  const marker = document.createElement("span");
  marker.className = "service-index-marker";
  marker.setAttribute("aria-hidden", "true");
  list.prepend(marker);

  let active = null;

  const moveMarker = () => {
    if (!active) {
      marker.style.setProperty("--o", "0");
      return;
    }
    const li = active.parentElement;
    marker.style.setProperty("--x", `${li.offsetLeft}px`);
    marker.style.setProperty("--y", `${li.offsetTop}px`);
    marker.style.setProperty("--w", `${active.offsetWidth}px`);
    marker.style.setProperty("--h", `${active.offsetHeight}px`);
    marker.style.setProperty("--o", "1");
  };

  const setActive = (id) => {
    const next = links.find((link) => link.getAttribute("href") === `#${id}`);
    if (!next || next === active) return;
    links.forEach((link) => {
      const on = link === next;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    active = next;
    moveMarker();

    // na faixa horizontal (mobile), mantém o item ativo visível
    if (index.scrollWidth > index.clientWidth) {
      const left = active.parentElement.offsetLeft - index.clientWidth / 2 + active.offsetWidth / 2;
      index.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  // seção ativa = a última cujo topo já passou de 40% da altura da tela.
  // Calculado por posição (e não por IntersectionObserver) para não perder
  // o estado em rolagens rápidas ou saltos de âncora.
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.4;
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= line) current = section;
    });
    setActive(current.id);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true }
  );
  update();
  window.addEventListener("resize", moveMarker, { passive: true });
  document.fonts?.ready.then(moveMarker);
}

/* --- Formulário de contato: validação inline + loading + sucesso/erro --- */
// Relay do Twenty CRM (twenty/lead-relay.mjs). [INSERIR: URL pública do relay em produção]
const FORM_ENDPOINT = location.hostname === "localhost" ? "http://localhost:3021" : "";

function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  // pré-seleciona o serviço vindo de servicos.html (?servico=site)
  const preset = new URLSearchParams(location.search).get("servico");
  if (preset) {
    const option = form.querySelector(`input[name="service"][value="${CSS.escape(preset)}"]`);
    if (option) option.checked = true;
  }

  const validators = {
    name: (v) => v.trim().length >= 2 || "Informe seu nome completo.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Informe um e-mail válido.",
    service: (v) => v !== "" || "Selecione o tipo de serviço.",
    message: (v) => v.trim().length >= 10 || "Conte um pouco mais sobre o projeto (mín. 10 caracteres).",
  };

  const valueOf = (name) => {
    const el = form.elements[name];
    if (!el) return "";
    // RadioNodeList expõe o valor marcado em .value
    return el.value ?? "";
  };

  function validateField(name) {
    const rule = validators[name];
    if (!rule) return true;
    const result = rule(valueOf(name));
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return result === true;
    const errorEl = field.querySelector(".field-error");
    const controls = field.querySelectorAll("input, select, textarea");

    if (result === true) {
      field.removeAttribute("data-invalid");
      controls.forEach((c) => c.removeAttribute("aria-invalid"));
      if (errorEl) errorEl.textContent = "";
      return true;
    }
    field.setAttribute("data-invalid", "true");
    controls.forEach((c) => c.setAttribute("aria-invalid", "true"));
    if (errorEl) errorEl.textContent = result;
    return false;
  }

  Object.keys(validators).forEach((name) => {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    // valida ao sair do campo; depois do primeiro erro, revalida enquanto digita
    field.addEventListener("focusout", (e) => {
      if (field.contains(e.relatedTarget)) return;
      validateField(name);
    });
    field.addEventListener("input", () => {
      if (field.hasAttribute("data-invalid")) validateField(name);
    });
    field.addEventListener("change", () => {
      if (field.hasAttribute("data-invalid")) validateField(name);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.removeAttribute("data-state");
    status.textContent = "";

    const names = Object.keys(validators);
    const allValid = names.map(validateField).every(Boolean);
    if (!allValid) {
      const firstInvalid = form.querySelector('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select');
      firstInvalid?.focus();
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
