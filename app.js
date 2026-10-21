const categoryList = document.querySelector("#category-list");
const serviceList = document.querySelector("#service-list");
const serviceCount = document.querySelector("#service-count");
const searchInput = document.querySelector("#service-search");
const serviceDialog = document.querySelector("#service-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const allCategoryId = "all";
const feedbackStorageKey = "xizmatlar-feedback-v1";
const ratingLabels = {
  1: "Juda yomon",
  2: "Yomon",
  3: "Qoniqarli",
  4: "Yaxshi",
  5: "A’lo",
};
let activeCategoryId = allCategoryId;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderCategories() {
  categoryList.replaceChildren();

  const allButton = createElement("button", "category-chip is-active");
  allButton.type = "button";
  allButton.dataset.categoryId = allCategoryId;
  allButton.setAttribute("aria-pressed", "true");
  allButton.append(
    createElement("span", "chip-icon all-icon", "⌘"),
    createElement("span", "", "Barcha xizmatlar"),
    createElement("span", "chip-count", String(services.length)),
  );
  categoryList.append(allButton);

  categories.forEach((category) => {
    const button = createElement("button", "category-chip");
    button.type = "button";
    button.dataset.categoryId = category.id;
    button.setAttribute("aria-pressed", "false");
    button.append(
      createElement("span", `chip-icon ${category.color}`, category.icon),
      createElement("span", "", category.shortName),
      createElement(
        "span",
        "chip-count",
        String(services.filter((service) => service.categoryId === category.id).length),
      ),
    );
    categoryList.append(button);
  });
}

function getVisibleServices() {
  const query = searchInput.value.trim().toLocaleLowerCase("uz");
  return services.filter((service) => {
    const matchesCategory =
      activeCategoryId === allCategoryId || service.categoryId === activeCategoryId;
    const searchableText = [
      service.name,
      service.category,
      service.description,
      service.documents || "",
    ]
      .join(" ")
      .toLocaleLowerCase("uz");
    return matchesCategory && (!query || searchableText.includes(query));
  });
}

function renderServices() {
  const visibleServices = getVisibleServices();
  serviceList.replaceChildren();
  serviceCount.textContent = `${visibleServices.length} ta xizmat`;

  if (visibleServices.length === 0) {
    const emptyState = createElement("div", "empty-state");
    emptyState.append(
      createElement("div", "empty-icon", "⌕"),
      createElement("h3", "", "Xizmat topilmadi"),
      createElement("p", "", "Boshqa so‘z bilan qidiring yoki boshqa toifani tanlang."),
    );
    serviceList.append(emptyState);
    return;
  }

  visibleServices.forEach((service) => {
    const category = categories.find((item) => item.id === service.categoryId);
    const card = createElement("article", "service-card");
    const cardTop = createElement("div", "service-card-top");
    cardTop.append(
      createElement("span", `service-icon ${category?.color || ""}`, category?.icon || "•"),
    );
    const verification = createElement("span", "verified-label");
    verification.append(
      createElement("span"),
      document.createTextNode("Rasmiy manbadan tekshiring"),
    );
    cardTop.append(verification);

    card.append(
      cardTop,
      createElement("p", "card-category", service.category),
      createElement("h3", "", service.name),
      createElement("p", "card-description", service.description),
    );
    const detailsButton = createElement("button", "details-button");
    detailsButton.type = "button";
    detailsButton.dataset.serviceId = service.id;
    detailsButton.append(
      document.createTextNode("Batafsil ma’lumot"),
      createElement("span", "", "→"),
    );
    card.append(detailsButton);
    serviceList.append(card);
  });
}

function isPlaceholder(value) {
  return !value || /aniqlashtirilmagan|kiritilmagan|tasdiqlanishi kerak|tekshirilishi kerak|hali tekshirilmagan/i.test(value);
}

function openServiceDetails(service) {
  document.querySelector("#dialog-category").textContent = service.category;
  document.querySelector("#dialog-title").textContent = service.name;
  document.querySelector("#dialog-description").textContent = service.description;

  const detailGrid = document.querySelector("#dialog-fields");
  detailGrid.replaceChildren();
  serviceFields.slice(3).forEach(([label, getValue]) => {
    const value = getValue(service);
    if (isPlaceholder(value)) return;

    const item = createElement("div", "detail-item");
    item.append(createElement("dt", "", label), createElement("dd", "", value));
    detailGrid.append(item);
  });

  const bookingLink = document.querySelector("#booking-link");
  let parsedLink;
  try {
    parsedLink = new URL(service.officialLink);
  } catch {
    parsedLink = null;
  }
  if (parsedLink && ["http:", "https:"].includes(parsedLink.protocol)) {
    bookingLink.href = parsedLink.href;
    bookingLink.hidden = false;
  } else {
    bookingLink.removeAttribute("href");
    bookingLink.hidden = true;
  }

  const bookingPhone = document.querySelector("#booking-phone");
  if (!isPlaceholder(service.phone)) {
    bookingPhone.href = `tel:${service.phone.replace(/[^\d+]/g, "")}`;
    bookingPhone.textContent = service.phone;
    bookingPhone.hidden = false;
  } else {
    bookingPhone.removeAttribute("href");
    bookingPhone.textContent = "";
    bookingPhone.hidden = true;
  }

  const preparationList = document.querySelector("#preparation-list");
  preparationList.replaceChildren();
  const preparationItems = (service.preparation || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  preparationItems.forEach((item) => preparationList.append(createElement("li", "", item)));
  document.querySelector("#preparation-note").textContent = preparationItems.length
    ? ""
    : "Borishdan oldin kerakli hujjatlarni tegishli tashkilotdan aniqlashtiring.";
  feedbackForm.reset();
  document.querySelector("#feedback-service-id").value = service.id;
  document.querySelector("#rating-label").textContent = "Bahoni tanlang";
  document.querySelector("#comment-count").textContent = "0/500";
  document.querySelector("#feedback-status").textContent = "";
  updateRatingStars();
  renderServiceComments(service.id);
  serviceDialog.showModal();
}

function readFeedbackEntries() {
  const storedFeedback = localStorage.getItem(feedbackStorageKey);
  if (!storedFeedback) return [];
  const entries = JSON.parse(storedFeedback);
  if (!Array.isArray(entries)) {
    throw new Error("Feedback storage must contain a list.");
  }
  return entries;
}

function renderServiceComments(serviceId) {
  const commentsContainer = document.querySelector("#service-comments");
  commentsContainer.replaceChildren();
  try {
    const comments = readFeedbackEntries().filter(
      (entry) => entry.serviceId === serviceId && entry.comment,
    );
    if (!comments.length) {
      commentsContainer.append(
        createElement("p", "comment-empty", "Hozircha izohlar yo‘q. Birinchi bo‘lib fikr qoldiring."),
      );
      return;
    }

    comments
      .slice()
      .reverse()
      .forEach((entry) => {
        const comment = createElement("article", "service-comment");
        const header = createElement("div", "service-comment-top");
        const rating = Number(entry.rating);
        header.append(
          createElement(
            "span",
            "service-comment-rating",
            `${"★".repeat(rating)}${"☆".repeat(5 - rating)} ${rating}/5`,
          ),
          createElement(
            "time",
            "",
            new Date(entry.createdAt).toLocaleDateString("uz-UZ"),
          ),
        );
        comment.append(header, createElement("p", "", entry.comment));
        commentsContainer.append(comment);
      });
  } catch (error) {
    console.error("Foydalanuvchi izohlarini yuklab bo‘lmadi.", error);
    commentsContainer.append(
      createElement("p", "comment-empty", "Izohlarni yuklashda xatolik yuz berdi."),
    );
  }
}

function updateRatingStars() {
  const selectedRating = Number(
    feedbackForm.querySelector('input[name="feedback-rating"]:checked')?.value || 0,
  );
  feedbackForm.querySelectorAll(".rating-option").forEach((option) => {
    const value = Number(option.querySelector("input").value);
    option.classList.toggle("is-selected", value <= selectedRating);
  });
  document.querySelector("#rating-label").textContent = selectedRating
    ? `${ratingLabels[selectedRating]} — ${selectedRating}/5`
    : "Bahoni tanlang";
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category-id]");
  if (!button) return;
  activeCategoryId = button.dataset.categoryId;
  categoryList.querySelectorAll("button[data-category-id]").forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
  renderServices();
});

serviceList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-service-id]");
  if (!button) return;
  const service = services.find((item) => item.id === button.dataset.serviceId);
  if (service) openServiceDetails(service);
});

searchInput.addEventListener("input", renderServices);
feedbackForm.addEventListener("change", (event) => {
  if (event.target.matches('input[name="feedback-rating"]')) updateRatingStars();
});
document.querySelector("#feedback-comment").addEventListener("input", (event) => {
  document.querySelector("#comment-count").textContent = `${event.target.value.length}/500`;
});
feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!feedbackForm.reportValidity()) return;

  const status = document.querySelector("#feedback-status");
  const rating = feedbackForm.querySelector('input[name="feedback-rating"]:checked').value;
  const comment = document.querySelector("#feedback-comment").value.trim();
  const entry = {
    serviceId: document.querySelector("#feedback-service-id").value,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  try {
    const entries = readFeedbackEntries();
    entries.push(entry);
    localStorage.setItem(feedbackStorageKey, JSON.stringify(entries));
    status.textContent = "Bahoyingiz va izohingiz saqlandi. Rahmat!";
    renderServiceComments(entry.serviceId);
    feedbackForm.reset();
    document.querySelector("#feedback-service-id").value = entry.serviceId;
    document.querySelector("#rating-label").textContent = "Bahoni tanlang";
    document.querySelector("#comment-count").textContent = "0/500";
    updateRatingStars();
  } catch (error) {
    console.error("Bahoni saqlab bo‘lmadi.", error);
    status.textContent =
      "Saqlashda xatolik yuz berdi. Brauzer xotirasini tekshirib qayta urinib ko‘ring.";
  }
});
document.querySelector(".close-button").addEventListener("click", () => serviceDialog.close());
serviceDialog.addEventListener("click", (event) => {
  if (event.target === serviceDialog) serviceDialog.close();
});

renderCategories();
renderServices();
