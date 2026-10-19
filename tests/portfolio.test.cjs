const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = resolve(__dirname, "..");
const site = resolve(process.env.PORTFOLIO_SITE_DIR || resolve(root, "_site"));
const html = readFileSync(resolve(site, "index.html"), "utf8");
const script = readFileSync(resolve(root, "assets/js/portfolio.js"), "utf8");
const data = JSON.parse(readFileSync(resolve(root, "_data/publications.json")));
const snapshot = JSON.parse(readFileSync(resolve(root, "_data/scholar.json")));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(t, options = {}) {
  const errors = [];
  const dom = new JSDOM(html, {
    url: `https://heroding77.github.io/${options.hash || ""}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window,
    d = w.document;
  const media = new Map(),
    intervals = new Map(),
    requests = [],
    scrolls = [];
  let sequence = 0;
  w.addEventListener("error", (event) => errors.push(event.error));
  w.matchMedia = (query) => {
    if (!media.has(query)) {
      const listeners = [];
      const item = {
        matches: query.includes("reduced-motion")
          ? !!options.reduced
          : query.includes("color-scheme")
            ? !!options.dark
            : false,
        addListener: (fn) => listeners.push(fn),
        emit(matches) {
          this.matches = matches;
          listeners.forEach((fn) => fn({ matches }));
        },
      };
      if (!options.legacyMedia)
        item.addEventListener = (_, fn) => listeners.push(fn);
      media.set(query, item);
    }
    return media.get(query);
  };
  w.Element.prototype.scrollIntoView = function (args) {
    scrolls.push({ id: this.id, args });
  };
  w.requestAnimationFrame = (fn) => {
    fn();
    return 1;
  };
  w.setInterval = (fn) => {
    intervals.set(++sequence, fn);
    return sequence;
  };
  w.clearInterval = (id) => intervals.delete(id);
  if (!options.noObserver)
    w.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  let resize;
  w.ResizeObserver = class {
    constructor(fn) {
      resize = fn;
    }
    observe() {}
  };
  if (options.storageDenied)
    Object.defineProperty(w, "localStorage", {
      get() {
        throw new Error("Storage denied");
      },
    });
  else if (options.theme) w.localStorage.setItem("zd-theme", options.theme);
  Object.defineProperty(w.navigator, "clipboard", {
    value: {
      writeText: async (value) => {
        if (options.clipboardDenied) throw new Error("Clipboard denied");
        w.copied = value;
      },
    },
  });
  d.execCommand = () => {
    if (options.legacyClipboardThrows)
      throw new Error("Legacy clipboard denied");
    return !options.legacyClipboardFails;
  };
  if (options.fastTimeout) {
    const schedule = w.setTimeout.bind(w);
    w.setTimeout = (fn, delay, ...args) =>
      schedule(fn, delay === 5000 ? 1 : delay, ...args);
  }
  w.fetch = async (url, init) => {
    requests.push(url);
    if (options.fetch) return options.fetch(url, init, requests.length);
    throw new Error("Offline");
  };
  [...d.querySelectorAll("main > section[id]")].forEach((section, i) => {
    section.getBoundingClientRect = () => ({ top: i * 1000 - w.scrollY });
  });
  if (options.dialogs) {
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event("close")); };
  }
  w.eval(script);
  t.after(() => {
    assert.deepEqual(errors, [], "No uncaught UI error");
    dom.window.close();
  });
  const $ = (selector) => d.querySelector(selector);
  const click = (selector) => {
    const element = $(selector);
    assert.ok(element, selector);
    element.click();
  };
  const search = (value) => {
    $("#paper-search").value = value;
    $("#paper-search").dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const sort = (value) => {
    $("#paper-sort").value = value;
    $("#paper-sort").dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  const ids = () =>
    [...d.querySelectorAll(".paper-card:not([hidden])")].map(
      (paper) => paper.id,
    );
  const loadAll = () => {
    while (!$(".load-papers").hidden) click(".load-papers");
  };
  return {
    w,
    d,
    $,
    click,
    search,
    sort,
    ids,
    loadAll,
    media,
    intervals,
    requests,
    scrolls,
    resize: () => resize(),
  };
}

test("build: IDs, asset paths, links, safe markup, redirects and metadata", (t) => {
  const { d, $ } = setup(t);
  const ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(d.querySelectorAll(".paper-card").length, data.length);
  assert.equal(d.querySelectorAll(".paper-authors strong").length, data.length);
  assert.ok(!html.includes("{{") && !html.includes("{%"));
  assert.equal($("main").tabIndex, -1);
  assert.equal(
    $('script[src*="googletagmanager"]'),
    null,
    "Unconfigured analytics must not send a request",
  );
  for (const el of d.querySelectorAll('a[href^="#"]'))
    assert.ok(d.getElementById(el.hash.slice(1)), el.hash);
  for (const el of d.querySelectorAll("[aria-controls]"))
    assert.ok(d.getElementById(el.getAttribute("aria-controls")));
  for (const el of d.querySelectorAll(
    'img[src],script[src],link[rel="stylesheet"]',
  )) {
    const url = el.getAttribute("src") || el.getAttribute("href");
    if (url.startsWith("/"))
      assert.ok(existsSync(resolve(site, new URL(url, "https://heroding77.github.io").pathname.slice(1))), url);
  }
  for (const link of d.querySelectorAll('a[target="_blank"]'))
    assert.ok(link.rel.includes("noopener"), link.href);
  assert.ok(
    [...d.querySelectorAll("a")].every(
      (a) => !a.href.startsWith("javascript:"),
    ),
  );
  assert.ok(existsSync(resolve(site, "about/index.html")));
  assert.ok(existsSync(resolve(site, "about.html")));
  const internvl = data.find((p) => p.title.startsWith("InternVL3.5:"));
  assert.equal(internvl.url, "https://arxiv.org/abs/2508.18265");
});

test("search by year includes preprints and ignores interface labels", (t) => {
  const s = setup(t);
  s.search("2026");
  s.loadAll();
  assert.ok(s.ids().includes("paper-1"), "OS-Helix is a 2026 preprint");
  assert.deepEqual(
    new Set(s.ids()),
    new Set(data.filter((p) => p.year === 2026).map((p) => p.id)),
  );
  s.search("copy reference");
  assert.equal(s.ids().length, 0);
  assert.equal(s.$(".empty-state").hidden, false);
});

test("180 combinations of collection, topic, query and sort agree with publication metadata", (t) => {
  const s = setup(t);
  const names = {
    gui: "Computer use",
    science: "RSI",
    language: "Learning & reasoning",
    multimodal: "Multimodal",
  };
  for (const collection of ["selected", "all"])
    for (const topic of ["all", ...Object.keys(names)])
      for (const query of [
        "",
        "2026",
        "Zichen Ding",
        "OS-Helix",
        "COLM",
        "never-match",
      ])
        for (const sort of ["curated", "newest", "oldest"]) {
          s.click(".reset-filters");
          s.click(`[data-collection="${collection}"]`);
          s.click(`[data-topic="${topic}"]`);
          s.search(query);
          s.sort(sort);
          s.loadAll();
          const all = collection === "all" || topic !== "all" || !!query;
          const expected = data.filter(
            (p) =>
              (all || p.selected) &&
              (topic === "all" || p.category === topic) &&
              query
                .toLowerCase()
                .split(/\s+/)
                .every((word) =>
                  [p.title, p.authors, p.venue, p.year, names[p.category]]
                    .join(" ")
                    .toLowerCase()
                    .includes(word),
                ),
          );
          if (sort !== "curated")
            expected.sort((a, b) =>
              sort === "newest" ? b.year - a.year : a.year - b.year,
            );
          assert.deepEqual(
            s.ids(),
            expected.map((p) => p.id),
            `${collection}/${topic}/${query}/${sort}`,
          );
          assert.equal(s.$(".empty-state").hidden, !!expected.length);
        }
});

test("searching selected work broadens temporarily; clearing it restores selection", (t) => {
  const s = setup(t);
  s.search("ScienceBoard");
  assert.deepEqual(s.ids(), ["paper-22"]);
  assert.equal(
    s.$('[data-collection="all"]').getAttribute("aria-pressed"),
    "true",
  );
  s.search("");
  s.loadAll();
  assert.deepEqual(
    s.ids(),
    data.filter((p) => p.selected).map((p) => p.id),
  );
});

test("pagination reaches every paper once, and reset clears all filter state", (t) => {
  const s = setup(t);
  s.click('[data-collection="all"]');
  assert.equal(s.ids().length, 6);
  s.click(".load-papers");
  assert.equal(s.ids().length, 12);
  assert.equal(s.d.activeElement.closest(".paper-card").id, "paper-7");
  assert.equal(s.scrolls.at(-1).id, "paper-7");
  s.loadAll();
  assert.equal(new Set(s.ids()).size, data.length);
  s.search("absent-paper");
  s.click(".reset-filters");
  assert.equal(s.$("#paper-search").value, "");
  assert.equal(s.ids().length, 6);
});

test("research cards and direct publication links reveal work outside the selected collection", (t) => {
  const s = setup(t);
  s.search("absent-paper");
  s.click('[data-research="science"]');
  assert.deepEqual(s.ids(), ["paper-9", "paper-22", "paper-24"]);
  const deep = setup(t, { hash: "#paper-27" });
  assert.equal(deep.$("#paper-27").hidden, false);
  assert.equal(deep.scrolls.at(-1).id, "paper-27");
});

test("news archive toggles all entries and restores its collapsed state", (t) => {
  const s = setup(t);
  assert.equal(s.d.querySelectorAll(".news-item:not([hidden])").length, 5);
  s.click(".news-toggle");
  assert.equal(s.d.querySelectorAll(".news-item:not([hidden])").length, 22);
  s.click(".news-toggle");
  assert.equal(s.d.querySelectorAll(".news-item:not([hidden])").length, 5);
  assert.equal(s.$(".news-toggle").getAttribute("aria-expanded"), "false");
});

test("mobile menu, Escape, desktop resize and search shortcut preserve keyboard access", (t) => {
  const s = setup(t);
  s.click(".menu-toggle");
  assert.equal(s.$("#mobile-nav").hidden, false);
  s.d.dispatchEvent(
    new s.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(s.$("#mobile-nav").hidden, true);
  assert.equal(s.d.activeElement, s.$(".menu-toggle"));
  s.click(".menu-toggle");
  s.media.get("(min-width: 641px)").emit(true);
  assert.equal(s.$("#mobile-nav").hidden, true);
  s.d.body.dispatchEvent(
    new s.w.KeyboardEvent("keydown", { key: "/", bubbles: true }),
  );
  assert.equal(s.d.activeElement, s.$("#paper-search"));
  s.search("OS-Helix");
  s.$("#paper-search").dispatchEvent(
    new s.w.KeyboardEvent("keydown", {
      key: "/",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(s.$("#paper-search").value, "OS-Helix");
});

test("theme follows the OS until manually chosen, including denied or invalid storage", (t) => {
  for (const options of [
    {},
    { theme: "invalid" },
    { storageDenied: true },
    { legacyMedia: true },
  ]) {
    const s = setup(t, options),
      mq = s.media.get("(prefers-color-scheme: dark)");
    mq.emit(true);
    assert.equal(s.d.documentElement.dataset.theme, "dark");
    s.click(".theme-toggle");
    assert.equal(s.d.documentElement.dataset.theme, "light");
    mq.emit(true);
    assert.equal(s.d.documentElement.dataset.theme, "light");
  }
  const saved = setup(t, { theme: "dark" });
  assert.equal(saved.d.documentElement.dataset.theme, "dark");
});

test("reduced motion and unavailable observers do not disable filtering or hide content", (t) => {
  const s = setup(t, { reduced: true, noObserver: true });
  assert.equal(s.intervals.size, 0);
  assert.equal(s.d.querySelectorAll(".reveal-ready").length, 0);
  s.click('[data-step="2"]');
  assert.equal(s.$("#demo-method").textContent, "act");
  assert.equal(s.$(".loop-play").getAttribute("aria-label"), "Play animation");
  s.search("ScienceBoard");
  assert.deepEqual(s.ids(), ["paper-22"]);
});

test("agent autoplay advances, pauses on selection, and honors a new reduced-motion preference", (t) => {
  const s = setup(t);
  assert.equal(s.intervals.size, 1);
  [...s.intervals.values()][0]();
  assert.equal(s.$("#demo-method").textContent, "reason");
  s.click('[data-step="0"]');
  assert.equal(s.intervals.size, 0);
  s.click(".loop-play");
  assert.equal(s.intervals.size, 1);
  s.media.get("(prefers-reduced-motion: reduce)").emit(true);
  assert.equal(s.intervals.size, 0);
});

test("copy reference uses the correct paper; clipboard failures clean up and report failure", async (t) => {
  const s = setup(t);
  s.click("#paper-1 .copy-citation");
  await flush();
  assert.ok(s.w.copied.includes("OS-Helix:"));
  assert.ok(s.w.copied.includes("Preprint, 2026."));
  for (const options of [
    { clipboardDenied: true },
    { clipboardDenied: true, legacyClipboardFails: true },
    { clipboardDenied: true, legacyClipboardThrows: true },
  ]) {
    const f = setup(t, options);
    f.click(".email-copy");
    await flush();
    assert.equal(f.d.querySelectorAll("textarea").length, 0);
    assert.match(
      f.$(".toast").textContent,
      options.legacyClipboardFails || options.legacyClipboardThrows
        ? /unavailable/
        : /copied/,
    );
  }
});

test("navigation highlighting follows source order, and progress reacts to document resizing", (t) => {
  const s = setup(t);
  Object.defineProperty(s.w, "scrollY", { value: 3000, writable: true });
  s.w.dispatchEvent(new s.w.Event("scroll"));
  assert.equal(s.$(".desktop-nav [aria-current]").hash, "#news");
  s.w.scrollY = 4000;
  s.w.dispatchEvent(new s.w.Event("scroll"));
  assert.equal(s.$(".desktop-nav [aria-current]").hash, "#about");
  Object.defineProperty(s.d.documentElement, "scrollHeight", {
    value: 7000,
    configurable: true,
  });
  s.resize();
  const before = parseFloat(s.$(".reading-progress").style.width);
  Object.defineProperty(s.d.documentElement, "scrollHeight", {
    value: 9000,
    configurable: true,
  });
  s.resize();
  assert.ok(parseFloat(s.$(".reading-progress").style.width) < before);
});

test("Scholar keeps the dated snapshot offline and falls back from CDN to the original raw endpoint", async (t) => {
  const offline = setup(t);
  await flush();
  assert.equal(
    offline.$("#total_cit").textContent,
    Number(snapshot.citedby).toLocaleString("en-US"),
  );
  const s = setup(t, {
    fetch: async (url, init, n) =>
      n === 1
        ? { ok: false }
        : {
            ok: true,
            json: async () => ({
              scholar_id: snapshot.scholar_id,
              citedby: 3000,
              updated: "2026-10-20 12:00:00",
            }),
          },
  });
  await flush();
  assert.equal(s.$("#total_cit").textContent, "3,000");
  assert.equal(s.$("[data-citation-total]").textContent, "3,000");
  assert.equal(s.$("[data-scholar-date]").dateTime, "2026-10-20");
  assert.equal(s.$("#scholar-updated").dateTime, "2026-10-20");
  assert.match(s.requests[0], /cdn\.jsdelivr\.net/);
  assert.match(s.requests[1], /raw\.githubusercontent\.com/);
});

test("Scholar rejects mismatched identity, stale data, invalid numbers and invalid payloads", async (t) => {
  for (const patch of [
    { scholar_id: "someone-else" },
    { citedby: null },
    { citedby: -1 },
    { citedby: "oops" },
    { updated: "2020-01-01" },
    { updated: "not-a-date" },
    { updated: "2026-11-31" },
  ]) {
    const s = setup(t, {
      fetch: async () => ({
        ok: true,
        json: async () => ({
          scholar_id: snapshot.scholar_id,
          citedby: 3000,
          updated: "2026-10-20",
          ...patch,
        }),
      }),
    });
    await flush();
    assert.equal(
      s.$("#total_cit").textContent,
      Number(snapshot.citedby).toLocaleString("en-US"),
    );
  }
  const zero = setup(t, {
    fetch: async () => ({
      ok: true,
      json: async () => ({
        scholar_id: snapshot.scholar_id,
        citedby: 0,
        updated: "2026-10-20",
      }),
    }),
  });
  await flush();
  assert.equal(zero.$("#total_cit").textContent, "0");
});

test("a timed out Scholar request is aborted before trying the fallback endpoint", async (t) => {
  let finish;
  const completed = new Promise((resolve) => {
    finish = resolve;
  });
  const s = setup(t, {
    fastTimeout: true,
    fetch: async (url, init, n) => {
      if (n === 1)
        return new Promise((resolve, reject) =>
          init.signal.addEventListener("abort", () =>
            reject(new Error("Timeout")),
          ),
        );
      return {
        ok: true,
        json: async () => {
          finish();
          return {
            scholar_id: snapshot.scholar_id,
            citedby: 3001,
            updated: "2026-10-20",
          };
        },
      };
    },
  });
  await completed;
  await flush();
  assert.equal(s.requests.length, 2);
  assert.equal(s.$("#total_cit").textContent, "3,001");
  assert.equal(s.$(".scholar-summary").dataset.scholarState, "refreshed");
});

test("brand geometry, favicon sizes and manifest resolve consistently", () => {
  const page = new JSDOM(html).window.document;
  const brand = JSON.parse(readFileSync(resolve(root, "_data/brand.json")));
  const marks = [...page.querySelectorAll(".wordmark .brand-mark path")];
  assert.equal(marks.length, 2);
  marks.forEach(mark => assert.equal(mark.getAttribute("d"), brand.path));
  for (const link of page.querySelectorAll('link[rel*="icon"],link[rel="manifest"]')) {
    assert.ok(existsSync(resolve(site, link.getAttribute("href").split("?")[0].replace(/^\//, ""))));
  }
  const manifest = JSON.parse(readFileSync(resolve(site, "images/site.webmanifest")));
  assert.equal(manifest.short_name, "heroding77");
  for (const icon of manifest.icons) {
    const png = readFileSync(resolve(site, "images", icon.src));
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  const ico = readFileSync(resolve(site, "favicon.ico"));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  assert.deepEqual([0, 1, 2, 3].map(i => ico[6 + i * 16]), [16, 32, 48, 64]);
  assert.deepEqual(ico, readFileSync(resolve(site, "images/favicon.ico")));
});

test("all papers have figures, venue tiers reflect tracks, and contribution marks stay inside the name highlight", t => {
  const s = setup(t);
  assert.equal(s.d.querySelectorAll('.paper-card .paper-image img').length, data.length);
  for (const p of data) {
    const card = s.$('#' + p.id);
    const ownName = card.querySelector('.paper-authors strong').textContent;
    const mark = p.authors.includes('Zichen Ding*') ? '*' : p.authors.includes('Zichen Ding✉') ? '✉' : '';
    assert.equal(ownName, 'Zichen Ding' + mark);
    assert.equal(!!card.querySelector('.ccf-badge'), !!p.ccf);
    if (p.ccf) assert.equal(p.track, 'conference');
    if (p.track === 'findings' || p.track === 'workshop') assert.equal(p.ccf, undefined);
  }
  const longPaper = s.$('#paper-28 .paper-authors');
  assert.match(longPaper.textContent, /…/);
  assert.ok(longPaper.textContent.length < 400);
  assert.equal(longPaper.querySelector('strong').textContent, 'Zichen Ding');
  s.search('Intern-S1-Pro');
  assert.deepEqual(s.ids(), ['paper-28']);
});

test("figure preview opens the matching image, preserves the paper link, closes and restores focus", t => {
  const s = setup(t, { dialogs: true });
  const figure = s.$('#paper-4 .paper-image');
  figure.focus(); figure.click();
  const dialog = s.$('.figure-dialog');
  assert.equal(dialog.open, true);
  assert.equal(s.$('.figure-full').src, figure.href);
  assert.equal(s.$('.figure-paper-link').href, figure.dataset.paperUrl);
  assert.equal(s.$('#figure-dialog-title').textContent, figure.dataset.figureTitle);
  s.click('.figure-close');
  assert.equal(dialog.open, false);
  assert.equal(s.d.activeElement, figure);
});


test("the resume overview reflects source contributions and restores selected work from any filter", t => {
  const s = setup(t);
  const selected = data.filter(p => p.selected);
  assert.equal(selected.filter(p => p.contribution === 'Co-first author').length, 6);
  assert.equal(selected.filter(p => p.contribution === 'Corresponding author').length, 3);
  assert.equal(s.$('[data-selected-link] strong')?.textContent || s.$('.hero-evidence strong').textContent, '9');
  s.search('not-a-paper');
  s.click('.hero-buttons [data-selected-link]');
  assert.equal(s.$('#paper-search').value, '');
  assert.deepEqual(s.ids(), selected.slice(0, 6).map(p => p.id));
  assert.equal(s.$('.paper-tab.active').dataset.collection, 'selected');
});

test("repeated filtering does not multiply the selected-work click handler", t => {
  const s = setup(t);
  for (let index = 0; index < 30; index++) s.search(index % 2 ? '2026' : 'agent');
  const list = s.$('.paper-list');
  const append = list.append;
  let appended = 0;
  list.append = function (...nodes) { appended += nodes.length; return append.apply(this, nodes); };
  s.click('.hero-buttons [data-selected-link]');
  assert.equal(appended, data.filter(p => p.selected).length, 'One click performs one bibliography render');
});

test("RSI research blog filters and searches independently of the academic bibliography", t => {
  const s = setup(t, { dialogs: true });
  const blog = s.$('.research-blog');
  assert.ok(blog.hidden, 'Selected papers retain their contribution-based scope');
  assert.equal(s.d.querySelectorAll('.paper-card').length, data.length);
  s.click('[data-research="science"]');
  assert.equal(blog.hidden, false);
  assert.match(blog.textContent, /Naive-N0.5-Flash/);
  assert.match(blog.textContent, /NaiveAI Team/);
  assert.equal(blog.querySelector('time').dateTime, '2026-09-27');
  s.click('[data-topic="gui"]');
  assert.equal(blog.hidden, true);
  s.click('[data-topic="all"]');
  s.search('Naive-N0.5-Flash');
  assert.equal(blog.hidden, false);
  assert.deepEqual(s.ids(), []);
  assert.equal(s.$('.empty-state').hidden, true);
  assert.equal(s.$('.result-count').textContent, '1 research blog');
  assert.equal(s.$('.load-papers').hidden, true);
  blog.querySelector('.paper-image').click();
  assert.equal(s.$('.figure-paper-link').href, 'https://naive.ai/en/research/');
  assert.equal(s.$('.figure-paper-link').textContent, 'Read the blog ↗');
  s.click('.figure-close');
  s.click('.hero-buttons [data-selected-link]');
  assert.equal(blog.hidden, true);
  s.$('#paper-5 .paper-image').click();
  assert.equal(s.$('.figure-paper-link').textContent, 'Read the paper ↗');
});
