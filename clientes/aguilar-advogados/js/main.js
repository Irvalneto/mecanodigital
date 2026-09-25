(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");

  /* ---------- Header: fundo sólido após sair do topo ---------- */
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const mqDesktop = window.matchMedia("(min-width: 1080px)");

  const setMenu = (open) => {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Fechar menu" : "Abrir menu";
    root.classList.toggle("menu-locked", open);
    menu.inert = !open;
  };

  if (toggle && menu) {
    menu.inert = true;
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    mqDesktop.addEventListener("change", (e) => {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Acordeões (casos e dúvidas) ---------- */
  document.querySelectorAll("[data-accordion]").forEach((group) => {
    const triggers = group.querySelectorAll("[aria-controls]");

    const setItem = (trigger, open) => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
      panel.firstElementChild.inert = !open;
    };

    triggers.forEach((trigger) => {
      setItem(trigger, trigger.getAttribute("aria-expanded") === "true");
      trigger.addEventListener("click", () => {
        const willOpen = trigger.getAttribute("aria-expanded") !== "true";
        // Um item aberto por vez mantém a lista fácil de escanear.
        if (willOpen) triggers.forEach((t) => t !== trigger && setItem(t, false));
        setItem(trigger, willOpen);
      });
    });
  });

  /* ---------- Revelação ao rolar ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- WhatsApp flutuante ----------
     Aparece depois que o CTA do topo sai da tela e some na seção de contato,
     para nunca competir com um botão já visível. */
  const float = document.querySelector("[data-wa-float]");
  const heroCta = document.querySelector("[data-hero-cta]");
  const contact = document.querySelector("[data-contact]");

  if (float && heroCta && contact && "IntersectionObserver" in window) {
    let pastHero = false;
    let atContact = false;
    const update = () => {
      const visible = pastHero && !atContact;
      float.classList.toggle("is-visible", visible);
      // Fora da tela, não deve receber foco pelo teclado.
      float.inert = !visible;
    };
    update();

    new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    }).observe(heroCta);

    new IntersectionObserver(([entry]) => {
      atContact = entry.isIntersecting;
      update();
    }, { threshold: 0.15 }).observe(contact);
  } else if (float) {
    float.classList.add("is-visible");
  }

  /* ---------- Navegação: destaca a seção atual ---------- */
  const navLinks = document.querySelectorAll(".nav a[href^='#']");
  const sections = [...navLinks].map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            const active = a.getAttribute("href") === `#${entry.target.id}`;
            if (active) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Ano no rodapé ---------- */
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
