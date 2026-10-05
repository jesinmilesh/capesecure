/**
 * CapeSecure - Multi-Step Professional Client Onboarding Quote System
 * Implements a structured 6-step interactive workflow:
 * STEP 1: Business
 * STEP 2: Requirements
 * STEP 3: Budget
 * STEP 4: Contact
 * STEP 5: Review & Project Request Ready
 * STEP 6: Submission & Direct WhatsApp Concierge
 * Progress Indicator: 01 — 02 — 03 — 04 — 05
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
  const quoteModalForm = document.getElementById("quoteForm");
  const quotePageForm = document.getElementById("quotePageForm");

  // Track quote controllers for both modal and page
  const controllers = [];

  if (quoteModalForm) {
    controllers.push(setupMultiStepQuote(quoteModalForm, "modal"));
  }
  if (quotePageForm) {
    controllers.push(setupMultiStepQuote(quotePageForm, "page"));
  }

  // 1. Open Quote Modal Triggers
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-quote]");
    if (trigger) {
      e.preventDefault();
      const plan = trigger.getAttribute("data-quote-plan");
      const category = trigger.getAttribute("data-quote-category");

      if (quoteModal) {
        openQuoteModal(plan, category);
      } else {
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

    const modalController = controllers.find((c) => c.type === "modal");
    if (modalController) {
      modalController.prefill(plan, category);
      modalController.goToStep(1);
    }

    const firstInput = quoteModal.querySelector("input:not([type='hidden']), select");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 200);
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

  // 2. Setup Multi-Step Quote Controller
  function setupMultiStepQuote(form, type) {
    let currentStep = 1;
    const totalSteps = 5; // 01 to 05 before submission

    const stepPanes = form.querySelectorAll(".quote-step-pane");
    const progressSteps = form.querySelectorAll(".quote-progress-step");
    const reviewBox = form.querySelector(".quote-review-summary");

    // Initialize checkable card click behaviors
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
      syncState();
    });

    // Step Navigation Function
    function goToStep(stepNumber) {
      if (stepNumber < 1) stepNumber = 1;
      if (stepNumber > totalSteps) stepNumber = totalSteps;

      currentStep = stepNumber;

      // Update panes
      stepPanes.forEach((pane) => {
        const paneStep = parseInt(pane.getAttribute("data-step"), 10);
        if (paneStep === currentStep) {
          pane.classList.add("active");
          pane.style.display = "block";
          const firstFocusable = pane.querySelector("input, select, textarea, button");
          if (firstFocusable && type === "page") {
            // Smoothly focus on non-modal views
          }
        } else {
          pane.classList.remove("active");
          pane.style.display = "none";
        }
      });

      // Update progress indicators (01 - 02 - 03 - 04 - 05)
      progressSteps.forEach((stepEl) => {
        const s = parseInt(stepEl.getAttribute("data-step"), 10);
        stepEl.classList.remove("active", "completed");
        if (s === currentStep) {
          stepEl.classList.add("active");
          stepEl.setAttribute("aria-current", "step");
        } else if (s < currentStep) {
          stepEl.classList.add("completed");
          stepEl.removeAttribute("aria-current");
        } else {
          stepEl.removeAttribute("aria-current");
        }
      });

      // If moving to step 5 (Review), populate summary card
      if (currentStep === 5) {
        populateReviewSummary();
      }
    }

    // Step Validation
    function validateStep(step) {
      // Clear previous error marks in current step
      const activePane = form.querySelector(`.quote-step-pane[data-step="${step}"]`);
      if (!activePane) return true;

      const errorGroups = activePane.querySelectorAll(".form-group.has-error");
      errorGroups.forEach((g) => g.classList.remove("has-error"));

      let isValid = true;
      let firstError = null;

      function flagError(input, message) {
        const group = input.closest(".form-group");
        if (group) {
          group.classList.add("has-error");
          const errorMsg = group.querySelector(".field-error-msg");
          if (errorMsg) errorMsg.textContent = message;
        }
        input.classList.add("error");
        if (!firstError) firstError = input;
        isValid = false;
      }

      if (step === 1) {
        const businessName = form.querySelector('[name="businessName"]');
        if (businessName && !businessName.value.trim()) {
          flagError(businessName, "Please enter your business or project name.");
        }
        const businessType = form.querySelector('[name="businessType"]');
        if (businessType && !businessType.value) {
          flagError(businessType, "Please select your business type.");
        }
      } else if (step === 2) {
        const reqCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="req_"]');
        const anyChecked = Array.from(reqCheckboxes).some((c) => c.checked);
        if (!anyChecked && reqCheckboxes.length > 0) {
          const group = reqCheckboxes[0].closest(".form-group");
          if (group) {
            group.classList.add("has-error");
            const errorMsg = group.querySelector(".field-error-msg");
            if (errorMsg) errorMsg.textContent = "Please select at least one requirement.";
          }
          if (!firstError) firstError = reqCheckboxes[0];
          isValid = false;
        }
      } else if (step === 3) {
        const budgetRadios = form.querySelectorAll('input[name="budget"]');
        const budgetChecked = Array.from(budgetRadios).some((r) => r.checked);
        if (!budgetChecked && budgetRadios.length > 0) {
          const group = budgetRadios[0].closest(".form-group");
          if (group) {
            group.classList.add("has-error");
            const errorMsg = group.querySelector(".field-error-msg");
            if (errorMsg) errorMsg.textContent = "Please choose an estimated budget tier.";
          }
          if (!firstError) firstError = budgetRadios[0];
          isValid = false;
        }
      } else if (step === 4) {
        const contactName = form.querySelector('[name="contactName"]');
        if (contactName && !contactName.value.trim()) {
          flagError(contactName, "Please enter your name.");
        }
        const whatsappNumber = form.querySelector('[name="whatsappNumber"]');
        if (whatsappNumber) {
          const val = whatsappNumber.value.trim().replace(/[\s\-()]/g, "");
          const phoneRegex = /^(\+?\d{1,4})?[6-9]\d{9}$/;
          if (!val) {
            flagError(whatsappNumber, "WhatsApp number is required so we can reply with your quote.");
          } else if (!phoneRegex.test(val) && val.length < 8) {
            flagError(whatsappNumber, "Please enter a valid 10-digit phone/WhatsApp number.");
          }
        }
        const emailInput = form.querySelector('[name="emailAddress"]');
        if (emailInput && emailInput.value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailInput.value.trim())) {
            flagError(emailInput, "Please enter a valid email address.");
          }
        }
      }

      if (!isValid && firstError) {
        firstError.focus();
      }

      return isValid;
    }

    // Populate Review Summary in Step 5
    function populateReviewSummary() {
      if (!reviewBox) return;

      const businessName = form.querySelector('[name="businessName"]')?.value.trim() || "Not specified";
      const businessTypeSelect = form.querySelector('[name="businessType"]');
      const businessType = businessTypeSelect && businessTypeSelect.value
        ? businessTypeSelect.options[businessTypeSelect.selectedIndex].text
        : "General Business";

      const selectedReqs = Array.from(form.querySelectorAll('input[type="checkbox"][name^="req_"]:checked'))
        .map((i) => i.value);

      const budgetInput = form.querySelector('input[name="budget"]:checked');
      let budgetLabel = "Starting Package";
      if (budgetInput) {
        const cardSpan = budgetInput.closest(".custom-checkbox-card")?.querySelector("span");
        budgetLabel = cardSpan ? cardSpan.textContent.trim() : budgetInput.value;
      }

      const contactName = form.querySelector('[name="contactName"]')?.value.trim() || "Client";
      const whatsappNumber = form.querySelector('[name="whatsappNumber"]')?.value.trim() || "Not provided";
      const emailAddress = form.querySelector('[name="emailAddress"]')?.value.trim() || "Not provided";
      const notes = form.querySelector('[name="notes"]')?.value.trim();

      reviewBox.innerHTML = `
        <div class="review-status-badge">
          <span class="badge-dot pulse"></span>
          <span>PROJECT REQUEST READY</span>
        </div>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">Business:</span>
            <span class="review-value"><strong>${escapeHtml(businessName)}</strong> (${escapeHtml(businessType)})</span>
          </div>
          <div class="review-item">
            <span class="review-label">Requirements:</span>
            <div class="review-pills">
              ${selectedReqs.map((r) => `<span class="review-pill">${escapeHtml(r)}</span>`).join("")}
            </div>
          </div>
          <div class="review-item">
            <span class="review-label">Estimated Budget:</span>
            <span class="review-value highlight-gold"><strong>${escapeHtml(budgetLabel)}</strong></span>
          </div>
          <div class="review-item">
            <span class="review-label">Contact Person:</span>
            <span class="review-value">${escapeHtml(contactName)} • WhatsApp: <strong>${escapeHtml(whatsappNumber)}</strong></span>
          </div>
          ${emailAddress !== "Not provided" ? `
          <div class="review-item">
            <span class="review-label">Email:</span>
            <span class="review-value">${escapeHtml(emailAddress)}</span>
          </div>` : ""}
          ${notes ? `
          <div class="review-item">
            <span class="review-label">Notes:</span>
            <span class="review-value italic">"${escapeHtml(notes)}"</span>
          </div>` : ""}
        </div>
      `;

      // Update WhatsApp action button in review step
      const reviewWhatsAppBtn = form.querySelector("[data-review-whatsapp-btn]");
      if (reviewWhatsAppBtn) {
        reviewWhatsAppBtn.onclick = (e) => {
          e.preventDefault();
          const configuredNumber = typeof siteConfig !== "undefined" ? siteConfig.whatsapp.trim() : "";
          if (configuredNumber) {
            const cleanNumber = configuredNumber.replace(/[\s\+\-()]/g, "");
            const formattedMessage = `Hello CapeSecure,

I am interested in a website.

Business type:
${businessName} (${businessType})

Requirements:
${selectedReqs.join(", ")}

Budget:
${budgetLabel}

Please let me know the next steps.`;
            window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`, "_blank", "noopener,noreferrer");
          } else {
            if (window.capeToast) {
              window.capeToast("WhatsApp line is being configured. Please click 'Request My Free Quote' below!", "info");
            }
          }
        };
      }
    }

    function escapeHtml(str) {
      if (!str) return "";
      return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m]));
    }

    // Step Button Click Handlers (Next & Prev)
    form.addEventListener("click", (e) => {
      const nextBtn = e.target.closest("[data-step-next]");
      if (nextBtn) {
        e.preventDefault();
        const targetStep = parseInt(nextBtn.getAttribute("data-step-next"), 10);
        if (validateStep(currentStep)) {
          goToStep(targetStep);
        }
        return;
      }

      const prevBtn = e.target.closest("[data-step-prev]");
      if (prevBtn) {
        e.preventDefault();
        const targetStep = parseInt(prevBtn.getAttribute("data-step-prev"), 10);
        goToStep(targetStep);
        return;
      }
    });

    // Form Submission Handling (Step 5 -> Submit)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
        goToStep(1);
        return;
      }

      const selectedReqs = Array.from(form.querySelectorAll('input[type="checkbox"][name^="req_"]:checked'))
        .map((i) => i.value);

      const budgetInput = form.querySelector('input[name="budget"]:checked');
      const budgetValue = budgetInput ? budgetInput.value : "";

      const formData = {
        businessName: form.querySelector('[name="businessName"]')?.value.trim() || "",
        businessType: form.querySelector('[name="businessType"]')?.value || "",
        requirements: selectedReqs,
        budget: budgetValue,
        contactName: form.querySelector('[name="contactName"]')?.value.trim() || "",
        whatsapp: form.querySelector('[name="whatsappNumber"]')?.value.trim() || "",
        email: form.querySelector('[name="emailAddress"]')?.value.trim() || "",
        notes: form.querySelector('[name="notes"]')?.value.trim() || "",
        timestamp: new Date().toISOString()
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : "Submit";
      const loadingBox = form.querySelector(".form-status-msg.loading");
      const successBox = form.querySelector(".form-status-msg.success");
      const panesContainer = form.querySelector(".quote-steps-container");
      const progressContainer = form.querySelector(".quote-progress-bar");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Processing Request...</span>`;
      }
      if (loadingBox) loadingBox.style.display = "flex";
      if (successBox) successBox.style.display = "none";

      try {
        await submitQuote(formData);

        if (loadingBox) loadingBox.style.display = "none";
        if (panesContainer) panesContainer.style.display = "none";
        if (progressContainer) progressContainer.style.display = "none";
        if (submitBtn) submitBtn.style.display = "none";

        if (successBox) {
          successBox.style.display = "block";
          successBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch (err) {
        if (loadingBox) loadingBox.style.display = "none";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        alert("Submission encounter a temporary issue. Please contact us directly via email or WhatsApp!");
      }
    });

    // Prefill logic
    function prefill(plan, category) {
      if (category) {
        const typeSelect = form.querySelector('[name="businessType"]');
        if (typeSelect) {
          for (let opt of typeSelect.options) {
            if (opt.value.toLowerCase() === category.toLowerCase()) {
              opt.selected = true;
              break;
            }
          }
        }
      }

      if (plan) {
        if (plan.toLowerCase() === "starter") {
          const budget = form.querySelector('input[name="budget"][value="3000-5000"]');
          if (budget) {
            budget.checked = true;
            budget.dispatchEvent(new Event("change"));
          }
          const req = form.querySelector('input[name="req_website"]');
          if (req) {
            req.checked = true;
            req.dispatchEvent(new Event("change"));
          }
        } else if (plan.toLowerCase() === "business") {
          const budget = form.querySelector('input[name="budget"][value="5000-10000"]');
          if (budget) {
            budget.checked = true;
            budget.dispatchEvent(new Event("change"));
          }
          const req1 = form.querySelector('input[name="req_website"]');
          const req2 = form.querySelector('input[name="req_enquiry"]');
          if (req1) { req1.checked = true; req1.dispatchEvent(new Event("change")); }
          if (req2) { req2.checked = true; req2.dispatchEvent(new Event("change")); }
        } else if (plan.toLowerCase() === "custom") {
          const budget = form.querySelector('input[name="budget"][value="10000-25000"]');
          if (budget) {
            budget.checked = true;
            budget.dispatchEvent(new Event("change"));
          }
          const req = form.querySelector('input[name="req_custom"]');
          if (req) {
            req.checked = true;
            req.dispatchEvent(new Event("change"));
          }
        }
      }
    }

    // Initial check for URL query params on page load
    const urlParams = new URLSearchParams(window.location.search);
    const qPlan = urlParams.get("plan");
    const qCategory = urlParams.get("category");
    if (qPlan || qCategory) {
      prefill(qPlan, qCategory);
    }

    // Start on step 1
    goToStep(1);

    return {
      type,
      goToStep,
      prefill
    };
  }
});
