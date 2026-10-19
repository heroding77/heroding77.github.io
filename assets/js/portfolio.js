(() => {
  "use strict";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const listenMedia = (query, listener) => {
    if (query.addEventListener) query.addEventListener("change", listener);
    else query.addListener(listener);
  };

  // Theme preference is optional; a blocked storage API must never break the page.
  const themeButton = $(".theme-toggle");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let chosenTheme;
  try {
    chosenTheme = localStorage.getItem("zd-theme");
  } catch (_) {}
  if (chosenTheme !== "light" && chosenTheme !== "dark") chosenTheme = null;
  root.dataset.theme = chosenTheme || (systemTheme.matches ? "dark" : "light");
  const syncTheme = () => {
    const dark = root.dataset.theme === "dark";
    themeButton.setAttribute(
      "aria-label",
      `Switch to ${dark ? "light" : "dark"} theme`,
    );
    $('meta[name="theme-color"]').content = dark ? "#151b18" : "#f7f7f2";
  };
  syncTheme();
  themeButton.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    chosenTheme = root.dataset.theme;
    try {
      localStorage.setItem("zd-theme", root.dataset.theme);
    } catch (_) {
      /* storage is optional */
    }
    syncTheme();
  });
  listenMedia(systemTheme, (event) => {
    if (!chosenTheme) {
      root.dataset.theme = event.matches ? "dark" : "light";
      syncTheme();
    }
  });

  const menuButton = $(".menu-toggle");
  const mobileNav = $(".mobile-nav");
  const closeMenu = () => {
    mobileNav.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    $("use", menuButton).setAttribute("href", "#i-menu");
  };
  menuButton.addEventListener("click", () => {
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute(
      "aria-label",
      opening ? "Close navigation" : "Open navigation",
    );
    $("use", menuButton).setAttribute("href", opening ? "#i-close" : "#i-menu");
  });
  $$("a", mobileNav).forEach((link) =>
    link.addEventListener("click", closeMenu),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileNav.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });
  listenMedia(window.matchMedia("(min-width: 641px)"), (event) => {
    if (event.matches) closeMenu();
  });

  // The hero is an illustrative state machine, not a recording of a live agent.
  const visual = $(".agent-visual");
  const loopSteps = $$(".loop-step");
  const playButton = $(".loop-play");
  const stages = [
    {
      method: "observe",
      argument: "environment",
      output: "Reading the screen & available tools…",
    },
    {
      method: "reason",
      argument: "goal, context",
      output: "Choosing a path from intent to action…",
    },
    {
      method: "act",
      argument: "next_step",
      output: "Using the interface. Checking the result.",
    },
  ];
  let stage = 0;
  let paused = reducedMotion.matches;
  let demoVisible = true;
  let timer;
  const setStage = (index) => {
    stage = index;
    visual.dataset.stage = String(index);
    $("#demo-method").textContent = stages[index].method;
    $("#demo-argument").textContent = stages[index].argument;
    $("#demo-output").textContent = stages[index].output;
    loopSteps.forEach((button, i) => {
      button.classList.toggle("active", i === index);
      button.setAttribute("aria-pressed", String(i === index));
    });
  };
  const scheduleDemo = () => {
    clearInterval(timer);
    if (!paused && demoVisible && !document.hidden)
      timer = setInterval(() => setStage((stage + 1) % 3), 4000);
  };
  const syncPlayButton = () => {
    playButton.textContent = paused ? "▷" : "Ⅱ";
    playButton.setAttribute(
      "aria-label",
      paused ? "Play animation" : "Pause animation",
    );
    playButton.title = paused ? "Play animation" : "Pause animation";
    scheduleDemo();
  };
  loopSteps.forEach((button) =>
    button.addEventListener("click", () => {
      setStage(Number(button.dataset.step));
      paused = true;
      syncPlayButton();
    }),
  );
  playButton.addEventListener("click", () => {
    paused = !paused;
    syncPlayButton();
  });
  document.addEventListener("visibilitychange", scheduleDemo);
  listenMedia(reducedMotion, (event) => {
    if (event.matches) {
      paused = true;
      syncPlayButton();
    }
  });
  syncPlayButton();

  // One filter state drives tabs, search, sorting, topic links, and pagination.
  const papers = $$(".paper-card");
  const paperList = $(".paper-list");
  const search = $("#paper-search");
  const sort = $("#paper-sort");
  const moreButton = $(".load-papers");
  let collection = "selected";
  let topic = "all";
  let limit = 6;
  const searchIndex = new Map(
    papers.map((paper) => [
      paper,
      [
        $("h3", paper).textContent,
        $(".full-authors", paper).textContent,
        $(".venue", paper).textContent,
        $(".paper-category", paper).textContent,
        paper.dataset.year,
      ]
        .join(" ")
        .toLocaleLowerCase(),
    ]),
  );
  const filterPapers = () => {
    const query = search.value.trim().toLocaleLowerCase();
    // Searching the page searches the complete bibliography, including non-selected work.
    const searching = Boolean(query);
    const matches = papers.filter(
      (paper) =>
        (searching ||
          collection === "all" ||
          paper.dataset.selected === "true") &&
        (topic === "all" || paper.dataset.category === topic) &&
        (!query ||
          query
            .split(/\s+/)
            .every((word) => searchIndex.get(paper).includes(word))),
    );
    matches.sort((a, b) => {
      const delta = Number(b.dataset.year) - Number(a.dataset.year);
      return sort.value === "newest"
        ? delta || Number(a.dataset.order) - Number(b.dataset.order)
        : sort.value === "oldest"
          ? -delta || Number(a.dataset.order) - Number(b.dataset.order)
          : Number(a.dataset.order) - Number(b.dataset.order);
    });
    papers.forEach((paper) => {
      paper.hidden = true;
    });
    matches.forEach((paper, index) => {
      paperList.append(paper);
      paper.hidden = index >= limit;
    });
    $$(".paper-tab").forEach((button) => {
      const active =
        button.dataset.collection === (searching ? "all" : collection);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$(".topic-chip").forEach((button) => {
      const active = button.dataset.topic === topic;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const shown = Math.min(limit, matches.length);
    $(".result-count").textContent =
      `${shown} / ${matches.length} ${matches.length === 1 ? "paper" : "papers"}`;
    $(".empty-state").hidden = matches.length > 0;
    moreButton.hidden = shown >= matches.length;
    moreButton.innerHTML = `Show ${Math.min(6, matches.length - shown)} more publications <span>↓</span>`;
  };
  $$("[data-selected-link]").forEach(link => link.addEventListener("click", () => {
    collection = "selected";
    topic = "all";
    search.value = "";
    sort.value = "curated";
    limit = 6;
    filterPapers();
  }));
  $$(".paper-tab").forEach((button) =>
    button.addEventListener("click", () => {
      collection = button.dataset.collection;
      search.value = "";
      limit = 6;
      filterPapers();
    }),
  );
  $$(".topic-chip").forEach((button) =>
    button.addEventListener("click", () => {
      topic = button.dataset.topic;
      // A topic filter should show all matching work, including non-selected publications.
      if (topic !== "all") collection = "all";
      limit = 6;
      filterPapers();
    }),
  );
  $$("[data-research]").forEach((link) =>
    link.addEventListener("click", () => {
      topic = link.dataset.research;
      collection = "all";
      search.value = "";
      limit = 6;
      filterPapers();
    }),
  );
  search.addEventListener("input", () => {
    limit = 6;
    filterPapers();
  });
  sort.addEventListener("change", () => {
    limit = 6;
    filterPapers();
  });
  moreButton.addEventListener("click", () => {
    const previouslyVisible = papers.filter((paper) => !paper.hidden);
    limit += 6;
    filterPapers();
    const firstNew = $$(".paper-card", paperList).find(
      (paper) => !paper.hidden && !previouslyVisible.includes(paper),
    );
    // Pointer users should keep their viewport at the newly revealed work.
    if (firstNew) {
      const link = $("h3 a", firstNew);
      link.focus({ preventScroll: true });
      firstNew.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start",
      });
    }
  });
  $(".reset-filters").addEventListener("click", () => {
    collection = "all";
    topic = "all";
    limit = 6;
    search.value = "";
    sort.value = "curated";
    filterPapers();
    search.focus({ preventScroll: true });
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "/" ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.target.isContentEditable ||
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
    )
      return;
    event.preventDefault();
    $("#publications").scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
    search.focus({ preventScroll: true });
  });
  filterPapers();
  const revealLinkedPaper = () => {
    const paper = papers.find((paper) => `#${paper.id}` === location.hash);
    if (!paper) return;
    collection = "all";
    topic = "all";
    search.value = "";
    limit = papers.length;
    filterPapers();
    paper.scrollIntoView({ behavior: "auto", block: "start" });
  };
  window.addEventListener("hashchange", revealLinkedPaper);
  revealLinkedPaper();

  const newsToggle = $(".news-toggle");
  newsToggle.addEventListener("click", () => {
    const opening = newsToggle.getAttribute("aria-expanded") !== "true";
    newsToggle.setAttribute("aria-expanded", String(opening));
    $$("[data-older-news]").forEach((item) => {
      item.hidden = !opening;
    });
    newsToggle.innerHTML = opening
      ? "Close the archive <span>−</span>"
      : `View the archive <span>+ ${$$("[data-older-news]").length} updates</span>`;
    if (!opening)
      $("#news").scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
  });

  let toastTimer;
  const toast = (message) => {
    const element = $(".toast");
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("visible"), 3000);
  };
  const copy = async (text, success) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(success);
    } catch (_) {
      // Some embedded or non-secure previews block the modern clipboard API.
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.cssText = "position:fixed;left:-9999px;top:0;";
      document.body.append(input);
      const focused = document.activeElement;
      input.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (_) {
        // A blocked legacy clipboard API must also degrade without throwing.
      } finally {
        input.remove();
        focused?.focus({ preventScroll: true });
      }
      toast(
        copied
          ? success
          : "Copy unavailable here. Please select and copy the text.",
      );
    }
  };
  $$(".copy-citation").forEach((button) =>
    button.addEventListener("click", () =>
      copy(button.dataset.citation, "Reference copied to clipboard."),
    ),
  );
  $(".email-copy").addEventListener("click", (event) =>
    copy(event.currentTarget.dataset.email, "Email address copied."),
  );

  const progress = $(".reading-progress");
  const sections = $$("main > section[id]");
  const navLinks = $$(".desktop-nav a");
  let scrollPending = false;
  const updateProgress = () => {
    const height = root.scrollHeight - window.innerHeight;
    const activeSection = sections
      .filter(
        (section) =>
          section.getBoundingClientRect().top <= window.innerHeight * 0.35,
      )
      .pop();
    navLinks.forEach((link) => {
      const active = link.hash === `#${activeSection?.id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    progress.style.width = `${height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0}%`;
    scrollPending = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", updateProgress);
  if ("ResizeObserver" in window)
    new ResizeObserver(updateProgress).observe(document.body);
  updateProgress();

  if ("IntersectionObserver" in window) {
    const demoObserver = new IntersectionObserver((entries) => {
      demoVisible = entries[0].isIntersecting;
      scheduleDemo();
    });
    demoObserver.observe(visual);
    if (!reducedMotion.matches) {
      const revealObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          }),
        { threshold: 0 },
      );
      $$(
        ".section-heading, .research-grid, .news-intro, .about-grid, .recognition-grid, .contact-inner",
      ).filter(element => !element.closest("#about")).forEach((element) => {
        element.classList.add("reveal-ready");
        revealObserver.observe(element);
      });
    }
  }

  // Keep the original Scholar crawler endpoints. A verified build-time snapshot
  // stays readable when a CDN, GitHub, or the visitor's network is unavailable.
  const scholar = $(".scholar-summary");
  const citationTotal = $("#total_cit");
  const updatedTime = $("#scholar-updated");
  const formatCitations = (value) =>
    new Intl.NumberFormat("en-US").format(value);
  if (scholar && citationTotal && updatedTime) {
    scholar.dataset.scholarState = "snapshot";
    const displayCitationCount = count => {
      citationTotal.textContent = formatCitations(count);
      $$("[data-citation-total]").forEach(element => { element.textContent = formatCitations(count); });
    };
    displayCitationCount(Number(citationTotal.textContent));
    const refreshScholar = async () => {
      for (const url of new Set([
        scholar.dataset.scholarPrimary,
        scholar.dataset.scholarFallback,
      ])) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) continue;
          const data = await response.json();
          // Never treat a missing count as zero or display another author's data.
          const count =
            typeof data.citedby === "number"
              ? data.citedby
              : typeof data.citedby === "string" && /^\d+$/.test(data.citedby)
                ? Number(data.citedby)
                : NaN;
          const date =
            typeof data.updated === "string" ? data.updated.slice(0, 10) : "";
          if (
            data.scholar_id !== scholar.dataset.scholarId ||
            !Number.isSafeInteger(count) ||
            count < 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Date.parse(date)) ||
            new Date(date).toISOString().slice(0, 10) !== date ||
            date < updatedTime.dateTime
          )
            continue;
          scholar.dataset.scholarState = "refreshed";
          displayCitationCount(count);
          updatedTime.textContent = date;
          updatedTime.dateTime = date;
          $$("[data-scholar-date]").forEach(element => { element.textContent = date; element.dateTime = date; });
          $$(".show_paper_citations").forEach((element) => {
            const count =
              data.publications?.[element.getAttribute("data")]?.num_citations;
            if (Number.isSafeInteger(count) && count >= 0)
              element.textContent = `| Citations: ${formatCitations(count)}`;
          });
          return;
        } catch (_) {
          // The dated snapshot remains visible; other features need no network.
        } finally {
          clearTimeout(timeout);
        }
      }
    };
    refreshScholar();
  }
  // Every figure remains a normal image link when dialogs are unavailable.
  const figureDialog = $(".figure-dialog");
  if (figureDialog && typeof figureDialog.showModal === "function") {
    let figureTrigger;
    $$(".paper-image").forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      figureTrigger = link;
      $("#figure-dialog-title").textContent = link.dataset.figureTitle;
      const preview = $(".figure-full", figureDialog);
      preview.src = link.href;
      preview.alt = $("img", link).alt;
      $(".figure-paper-link", figureDialog).href = link.dataset.paperUrl;
      figureDialog.showModal();
    }));
    $(".figure-close", figureDialog).addEventListener("click", () => figureDialog.close());
    figureDialog.addEventListener("click", event => {
      if (event.target !== figureDialog) return;
      const bounds = figureDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) figureDialog.close();
    });
    figureDialog.addEventListener("close", () => figureTrigger?.focus({preventScroll:true}));
  }
})();
