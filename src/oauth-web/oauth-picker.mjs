(() => {
  const { categories, modules, requiredScopes = [] } = window.CF_SCOPE_MODEL;
  const required = new Set(requiredScopes);
  const selected = new Set(requiredScopes);
  const enabledModules = new Set();
  let synchronizeModules = true;
  const boxes = [];
  const owners = new Map();
  modules.forEach((module) =>
    module.scopes.forEach((scope) => {
      if (!owners.has(scope)) owners.set(scope, []);
      owners.get(scope).push(module.id);
    }),
  );
  const byId = new Map(modules.map((module) => [module.id, module]));
  const moduleGroups = document.querySelector("#module-groups");
  const scopeGroups = document.querySelector("#scope-groups");
  const moduleCount = document.querySelector("#module-count");
  const quickSetup = document.querySelector(".quick-setup");
  if (window.matchMedia("(max-width: 600px)").matches) quickSetup.open = false;
  const render = () => {
    if (synchronizeModules) {
      modules.forEach((module) => {
        const satisfied = module.scopes.every((scope) => selected.has(scope));
        if (satisfied) enabledModules.add(module.id);
        else enabledModules.delete(module.id);
      });
    }
    boxes.forEach((box) => {
      box.checked = selected.has(box.value);
      box.disabled = required.has(box.value);
    });
    document.querySelector("#scope-count").textContent = selected.size;
    document.querySelectorAll(".login").forEach((button) => {
      button.disabled = selected.size === 0;
      button.setAttribute("aria-disabled", String(selected.size === 0));
    });
    document.querySelectorAll(".login-hint").forEach((hint) => {
      hint.hidden = selected.size > 0;
    });
    document
      .querySelectorAll("[data-module]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          enabledModules.has(button.dataset.module),
        ),
      );
    document.querySelectorAll("[data-module]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(enabledModules.has(button.dataset.module)),
      );
    });
    document.querySelectorAll("[data-category-count]").forEach((counter) => {
      const values = categories[counter.dataset.categoryCount].flatMap(
        (feature) => feature.scopes.map((scope) => scope.scope),
      );
      counter.textContent = `${values.filter((scope) => selected.has(scope)).length}/${values.length}`;
    });
    moduleCount.textContent = `${enabledModules.size}/${modules.length} modules enabled`;
  };
  const enableModule = (id) => {
    const module = byId.get(id);
    if (!module) return;
    enabledModules.add(id);
    module.scopes.forEach((scope) => selected.add(scope));
  };
  const disableModule = (id) => {
    const module = byId.get(id);
    if (!module) return;
    enabledModules.delete(id);
    module.scopes.forEach((scope) => {
      if (!(owners.get(scope) || []).some((owner) => enabledModules.has(owner)))
        if (!required.has(scope)) selected.delete(scope);
    });
  };
  const moduleTier = (tier, enable) =>
    modules
      .filter((module) => module.tier === tier)
      .forEach((module) =>
        enable ? enableModule(module.id) : disableModule(module.id),
      );
  for (const [tier, title] of [
    ["basic", "Basic modules"],
    ["advanced", "Advanced modules"],
  ]) {
    const group = document.createElement("div");
    group.className = "module-tier";
    group.innerHTML = `<div class="module-tier-heading"><h3>${title}</h3><div class="module-actions"><button type="button" data-tier-enable="${tier}">Enable all</button><button type="button" data-tier-disable="${tier}">Disable all</button></div></div><div class="module-list">${modules
      .filter((module) => module.tier === tier)
      .map(
        (module) =>
          `<button type="button" class="module" data-module="${module.id}"><strong>${module.name}</strong><small>${module.description}</small></button>`,
      )
      .join("")}</div>`;
    moduleGroups.append(group);
  }
  Object.entries(categories).forEach(([name, features]) => {
    const category = document.createElement("details");
    category.className = "category";
    category.innerHTML = `<summary>${name}<b data-category-count="${name}">0/${features.reduce((sum, feature) => sum + feature.scopes.length, 0)}</b></summary><div class="category-actions"><button type="button" data-category-enable="${name}">Enable all</button><button type="button" data-category-disable="${name}">Disable all</button></div>${features.map((feature) => `<div class="feature"><span class="feature-name">${feature.name}</span><span class="variants">${feature.scopes.map((scope) => `<label><input type="checkbox" data-scope name="scope" value="${scope.scope}">${scope.label}</label>`).join("")}</span></div>`).join("")}`;
    scopeGroups.append(category);
    boxes.push(...category.querySelectorAll("[data-scope]"));
  });
  boxes.forEach((box) =>
    box.addEventListener("change", () => {
      if (box.checked) selected.add(box.value);
      else selected.delete(box.value);
      if (!box.checked)
        (owners.get(box.value) || []).forEach((id) =>
          enabledModules.delete(id),
        );
      render();
    }),
  );
  document.querySelectorAll("[data-module]").forEach((button) =>
    button.addEventListener("click", () => {
      if (enabledModules.has(button.dataset.module))
        disableModule(button.dataset.module);
      else enableModule(button.dataset.module);
      render();
    }),
  );
  document.querySelectorAll("[data-tier-enable]").forEach((button) =>
    button.addEventListener("click", () => {
      moduleTier(button.dataset.tierEnable, true);
      render();
    }),
  );
  document.querySelectorAll("[data-tier-disable]").forEach((button) =>
    button.addEventListener("click", () => {
      moduleTier(button.dataset.tierDisable, false);
      render();
    }),
  );
  document.querySelectorAll("[data-category-enable]").forEach((button) =>
    button.addEventListener("click", () => {
      categories[button.dataset.categoryEnable].forEach((feature) =>
        feature.scopes.forEach((scope) => selected.add(scope.scope)),
      );
      render();
    }),
  );
  document.querySelectorAll("[data-category-disable]").forEach((button) =>
    button.addEventListener("click", () => {
      categories[button.dataset.categoryDisable].forEach((feature) =>
        feature.scopes.forEach((scope) => {
          if (!required.has(scope.scope)) selected.delete(scope.scope);
        }),
      );
      render();
    }),
  );
  document.querySelector("[data-all-enable]").addEventListener("click", () => {
    boxes.forEach((box) => selected.add(box.value));
    render();
  });
  document.querySelector("[data-all-disable]").addEventListener("click", () => {
    selected.clear();
    required.forEach((scope) => selected.add(scope));
    enabledModules.clear();
    synchronizeModules = false;
    render();
    synchronizeModules = true;
  });
  document.querySelector("[data-expand]").addEventListener("click", () =>
    document.querySelectorAll(".category").forEach((category) => {
      category.open = true;
    }),
  );
  document.querySelector("[data-collapse]").addEventListener("click", () =>
    document.querySelectorAll(".category").forEach((category) => {
      category.open = false;
    }),
  );
  document.querySelector("#scope-search").addEventListener("input", (event) => {
    const term = event.target.value.toLowerCase();
    document.querySelectorAll(".category").forEach((category) => {
      const visible = category.textContent.toLowerCase().includes(term);
      category.hidden = !visible;
      if (term && visible) category.open = true;
    });
  });
  render();
})();
