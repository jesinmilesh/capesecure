/**
 * CapeSecure - FAQ Accordion Controller
 * Implements accessible accordion patterns with keyboard navigation:
 * Enter / Space to toggle, Up/Down arrow cycling, ARIA expanded state.
 */

document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");

  if (!faqItems.length) return;

  faqItems.forEach((item, index) => {
    const trigger = item.querySelector(".faq-trigger");
    const content = item.querySelector(".faq-content");

    if (!trigger || !content) return;

    // Set unique IDs if not already present
    const panelId = content.id || `faq-panel-${index + 1}`;
    const triggerId = trigger.id || `faq-trigger-${index + 1}`;

    content.id = panelId;
    trigger.id = triggerId;
    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-expanded", item.classList.contains("active") ? "true" : "false");
    content.setAttribute("aria-labelledby", triggerId);

    // Click toggle
    trigger.addEventListener("click", () => {
      toggleFaqItem(item, faqItems);
    });

    // Keyboard navigation (Enter, Space, Arrow keys)
    trigger.addEventListener("keydown", (e) => {
      const triggers = Array.from(document.querySelectorAll(".faq-trigger"));
      const currentIndex = triggers.indexOf(trigger);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextTrigger = triggers[(currentIndex + 1) % triggers.length];
        if (nextTrigger) nextTrigger.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevTrigger = triggers[(currentIndex - 1 + triggers.length) % triggers.length];
        if (prevTrigger) prevTrigger.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (triggers[0]) triggers[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        if (triggers[triggers.length - 1]) triggers[triggers.length - 1].focus();
      }
    });
  });

  function toggleFaqItem(selectedItem, allItems) {
    const trigger = selectedItem.querySelector(".faq-trigger");
    const isExpanded = selectedItem.classList.contains("active");

    // Close others for single-open accordion behavior
    allItems.forEach((item) => {
      if (item !== selectedItem) {
        item.classList.remove("active");
        const t = item.querySelector(".faq-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      }
    });

    // Toggle current
    if (isExpanded) {
      selectedItem.classList.remove("active");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    } else {
      selectedItem.classList.add("active");
      if (trigger) trigger.setAttribute("aria-expanded", "true");
    }
  }
});
