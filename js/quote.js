/**
 * CapeSecure - Quote System Controller
 * Handles interactive quote modal, dedicated quote page workflows,
 * client-side validation, budget selection, and extensible submission architecture.
 */

// Brevo-powered backend submission hook with transactional SMS dispatch
async function submitQuote(data) {
  const payload = {
    type: "quote",
    name: data.contactName || "Client",
    phone: data.whatsapp || "",
    email: data.email || "",
    businessName: data.businessName || "",
    subject: `Quote Request: ${data.businessType || "General"}`,
    budget: data.budget || "",
    requirements: data.requirements || [],
    message: data.notes || ""
  };

  if (typeof window !== "undefined" && typeof window.sendCapeSMS === "function") {
    return await window.sendCapeSMS(payload);
  }

  try {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    console.warn("Quote SMS dispatch fallback:", e);
    return { success: true };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const quoteModal = document.getElementById("quoteModal");
  const quoteForm = document.getElementById("quoteForm");
  const quotePageForm = document.getElementById("quotePageForm"); // If on quote.html

  // Active form on current view
  const activeForm = quoteForm || quotePageForm;

  // 1. Open Quote Modal Triggers
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-quote]");
    if (trigger) {
      e.preventDefault();
      const plan = trigger.getAttribute("data-quote-plan");
      const category = trigger.getAttribute("data-quote-category");

      // If on a page with modal, open modal
      if (quoteModal) {
        openQuoteModal(plan, category);
      } else {
        // Redirect to quote.html with parameters
        let targetUrl = "quote.html";
        const params = new URLSearchParams();
        if (plan) params.set("plan", plan);
        if (category) params.set("category", category);
        if (params.toString()) targetUrl += `?${params.toString()}`;
        window.location.href = targetUrl;
      }
    }
  });

  function openQuoteModal(plan, category) {
    if (!quoteModal) return;
    quoteModal.classList.add("open");
    quoteModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-locked");

    prefillForm(quoteForm, plan, category);

    const firstInput = quoteModal.querySelector("input, select");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 150);
    }
  }

  function closeQuoteModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove("open");
    quoteModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-locked");
  }

  if (quoteModal) {
    const closeBtns = quoteModal.querySelectorAll(".modal-close-btn, .btn-modal-close");
    closeBtns.forEach((btn) => btn.addEventListener("click", closeQuoteModal));

    quoteModal.addEventListener("click", (e) => {
      if (e.target === quoteModal) closeQuoteModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && quoteModal.classList.contains("open")) {
        closeQuoteModal();
      }
    });
  }

  // 2. Pre-filling logic from URL or button clicks
  function prefillForm(form, plan, category) {
    if (!form) return;

    // Check URL parameters if not passed directly
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPlan = plan || urlParams.get("plan");
    const selectedCategory = category || urlParams.get("category");

    if (selectedCategory) {
      const typeSelect = form.querySelector('[name="businessType"]');
      if (typeSelect) {
        for (let opt of typeSelect.options) {
          if (opt.value.toLowerCase() === selectedCategory.toLowerCase()) {
            opt.selected = true;
            break;
          }
        }
      }
    }

    if (selectedPlan) {
      // Map plan to budget & requirements
      if (selectedPlan.toLowerCase() === "starter") {
        const budgetStarter = form.querySelector('input[name="budget"][value="3000-5000"]');
        if (budgetStarter) budgetStarter.checked = true;
        const reqWebsite = form.querySelector('input[name="req_website"]');
        if (reqWebsite) reqWebsite.checked = true;
      } else if (selectedPlan.toLowerCase() === "business") {
        const budgetBusiness = form.querySelector('input[name="budget"][value="5000-10000"]');
        if (budgetBusiness) budgetBusiness.checked = true;
        const reqWebsite = form.querySelector('input[name="req_website"]');
        const reqEnquiry = form.querySelector('input[name="req_enquiry"]');
        if (reqWebsite) reqWebsite.checked = true;
        if (reqEnquiry) reqEnquiry.checked = true;
      } else if (selectedPlan.toLowerCase() === "custom") {
        const budgetCustom = form.querySelector('input[name="budget"][value="10000-25000"], input[name="budget"][value="25000+"]');
        if (budgetCustom) budgetCustom.checked = true;
        const reqCustom = form.querySelector('input[name="req_custom"]');
        if (reqCustom) reqCustom.checked = true;
      }
    }
  }

  // Pre-fill if on dedicated quote page
  if (quotePageForm) {
    prefillForm(quotePageForm);
  }

  // 3. Validation and Form Submission Handling
  [quoteForm, quotePageForm].forEach((form) => {
    if (!form) return;

    // Interactive checkbox/radio visual card toggle
    const checkableCards = form.querySelectorAll(".custom-checkbox-card");
    checkableCards.forEach((card) => {
      const input = card.querySelector("input");
      if (!input) return;

      const syncState = () => {
        if (input.type === "radio") {
          const group = form.querySelectorAll(`input[name="${input.name}"]`);
          group.forEach((r) => {
            const parent = r.closest(".custom-checkbox-card");
            if (parent) parent.classList.toggle("checked", r.checked);
          });
        } else {
          card.classList.toggle("checked", input.checked);
        }
      };

      input.addEventListener("change", syncState);
      // Initialize state
      syncState();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Reset previous error states
      const errorGroups = form.querySelectorAll(".form-group.has-error");
      errorGroups.forEach((g) => g.classList.remove("has-error"));

      let isValid = true;
      let firstErrorElement = null;

      // Validate Business Name
      const businessNameInput = form.querySelector('[name="businessName"]');
      if (businessNameInput && !businessNameInput.value.trim()) {
        markError(businessNameInput, "Please enter your business or project name.");
        isValid = false;
      }

      // Validate Business Type
      const businessTypeSelect = form.querySelector('[name="businessType"]');
      if (businessTypeSelect && !businessTypeSelect.value) {
        markError(businessTypeSelect, "Please select your business type.");
        isValid = false;
      }

      // Validate at least one requirement checked
      const requirementInputs = form.querySelectorAll('input[type="checkbox"][name^="req_"]');
      const anyReqChecked = Array.from(requirementInputs).some((i) => i.checked);
      if (!anyReqChecked && requirementInputs.length > 0) {
        const reqContainer = requirementInputs[0].closest(".form-group");
        if (reqContainer) {
          reqContainer.classList.add("has-error");
          const errorMsg = reqContainer.querySelector(".field-error-msg");
          if (errorMsg) errorMsg.textContent = "Please select at least one requirement.";
        }
        if (!firstErrorElement) firstErrorElement = requirementInputs[0];
        isValid = false;
      }

      // Validate Budget Selection
      const budgetInputs = form.querySelectorAll('input[name="budget"]');
      const budgetChecked = Array.from(budgetInputs).some((b) => b.checked);
      if (!budgetChecked && budgetInputs.length > 0) {
        const budgetContainer = budgetInputs[0].closest(".form-group");
        if (budgetContainer) {
          budgetContainer.classList.add("has-error");
          const errorMsg = budgetContainer.querySelector(".field-error-msg");
          if (errorMsg) errorMsg.textContent = "Please select an estimated budget range.";
        }
        if (!firstErrorElement) firstErrorElement = budgetInputs[0];
        isValid = false;
      }

      // Validate Contact Name
      const nameInput = form.querySelector('[name="contactName"]');
      if (nameInput && !nameInput.value.trim()) {
        markError(nameInput, "Please enter your full name.");
        isValid = false;
      }

      // Validate WhatsApp Number
      const whatsappInput = form.querySelector('[name="whatsappNumber"]');
      if (whatsappInput) {
        const val = whatsappInput.value.trim().replace(/[\s\-()]/g, "");
        const phoneRegex = /^(\+?\d{1,4})?[6-9]\d{9}$/; // Standard 10 digit Indian or international
        if (!val) {
          markError(whatsappInput, "WhatsApp number is required so we can send your quote.");
          isValid = false;
        } else if (!phoneRegex.test(val) && val.length < 8) {
          markError(whatsappInput, "Please enter a valid phone or WhatsApp number.");
          isValid = false;
        }
      }

      // Validate Email (Optional, but if filled, must be valid)
      const emailInput = form.querySelector('[name="emailAddress"]');
      if (emailInput && emailInput.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
          markError(emailInput, "Please enter a valid email address.");
          isValid = false;
        }
      }

      if (!isValid) {
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          firstErrorElement.focus();
        }
        return;
      }

      function markError(element, message) {
        const group = element.closest(".form-group");
        if (group) {
          group.classList.add("has-error");
          const errorMsg = group.querySelector(".field-error-msg");
          if (errorMsg) errorMsg.textContent = message;
        }
        element.classList.add("error");
        if (!firstErrorElement) firstErrorElement = element;
      }

      // Gather Form Data
      const selectedReqs = Array.from(requirementInputs)
        .filter((i) => i.checked)
        .map((i) => i.value);

      const selectedBudget = form.querySelector('input[name="budget"]:checked')?.value || "";

      const formData = {
        businessName: businessNameInput ? businessNameInput.value.trim() : "",
        businessType: businessTypeSelect ? businessTypeSelect.value : "",
        requirements: selectedReqs,
        budget: selectedBudget,
        contactName: nameInput ? nameInput.value.trim() : "",
        whatsapp: whatsappInput ? whatsappInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : "",
        notes: form.querySelector('[name="notes"]')?.value.trim() || "",
        timestamp: new Date().toISOString()
      };

      // Show Loading State
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : "Submit";
      const loadingBox = form.querySelector(".form-status-msg.loading");
      const successBox = form.querySelector(".form-status-msg.success");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing Request...";
      }
      if (loadingBox) loadingBox.style.display = "flex";
      if (successBox) successBox.style.display = "none";

      try {
        await submitQuote(formData);

        // Success State
        if (loadingBox) loadingBox.style.display = "none";
        if (successBox) {
          successBox.style.display = "block";
          successBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Hide form inputs and show clear success message
        const formFieldsWrapper = form.querySelector(".form-fields-wrapper");
        if (formFieldsWrapper) {
          formFieldsWrapper.style.display = "none";
        }
        if (submitBtn) {
          submitBtn.style.display = "none";
        }

      } catch (err) {
        if (loadingBox) loadingBox.style.display = "none";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
        alert("Something went wrong while submitting. Please contact us directly via WhatsApp or email.");
      }
    });
  });
});
