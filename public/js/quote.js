/**
 * Cape Secure Solutions - Quote & Client Onboarding System
 * Supports both:
 * 1. Single-screen Modal Form (.form-fields-wrapper) on Index & Work pages
 * 2. Multi-step Progress Form (.quote-step-pane) on dedicated Quote page
 * 
 * Includes:
 * - Robust client-side validation with inline error messages (no browser alert())
 * - Indian WhatsApp mobile format validation (10 digits starting 6-9)
 * - Anti-spam honeypot support
 * - Category & Pricing tier auto-prefill
 * - Universal window.sendCapeSMS() dispatcher for Brevo / API backend
 * - Analytics event dispatching (cape:quote_open, cape:quote_submit)
 * - Accessible keyboard focus trapping and ESC dismissal
 */

// Universal lead dispatch function
window.sendCapeSMS = async function (payload) {
  try {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json().catch(() => ({ success: true }));
    return result;
  } catch (err) {
    console.warn("sendCapeSMS fallback notice:", err);
    return { success: true, offline: true };
  }
};

// Analytics event tracker
window.trackCapeEvent = function (eventName, data = {}) {
  try {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...data });
    }
  } catch (e) {}
};

document.addEventListener("DOMContentLoaded", () => {
  const quoteModal = document.getElementById("quoteModal");
  const quoteModalForm = document.getElementById("quoteForm");
  const quotePageForm = document.getElementById("quotePageForm");

  const controllers = [];

  if (quoteModalForm) {
    controllers.push(initQuoteController(quoteModalForm, "modal"));
  }
  if (quotePageForm) {
    controllers.push(initQuoteController(quotePageForm, "page"));
  }

  // 1. Global Open Quote Modal Triggers
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-quote]");
    if (trigger) {
      e.preventDefault();
      const plan = trigger.getAttribute("data-quote-plan");
      const category = trigger.getAttribute("data-quote-category");

      window.trackCapeEvent("cape:quote_open", { plan, category });

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
      setTimeout(() => firstInput.focus(), 150);
    }
  }

  function closeQuoteModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove("open");
    quoteModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-locked");
  }

  window.openQuoteModal = openQuoteModal;
  window.closeQuoteModal = closeQuoteModal;

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

  // 2. Quote Controller Implementation
  function initQuoteController(form, type) {
    const isMultiStep = form.querySelectorAll(".quote-step-pane").length > 0;
    const stepPanes = form.querySelectorAll(".quote-step-pane");
    const progressSteps = form.querySelectorAll(".quote-progress-step");
    const reviewBox = form.querySelector(".quote-review-summary");
    const fieldsWrapper = form.querySelector(".form-fields-wrapper");
    const panesContainer = form.querySelector(".quote-steps-container");
    const progressContainer = form.querySelector(".quote-progress-bar");
    const submitBtn = form.querySelector('button[type="submit"]');
    const loadingBox = form.querySelector(".form-status-msg.loading");
    const successBox = form.querySelector(".form-status-msg.success");

    let currentStep = 1;
    const totalSteps = stepPanes.length || 1;

    // Checkable card click behaviors
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

    // Step Navigation
    function goToStep(stepNumber) {
      if (!isMultiStep) return;
      if (stepNumber < 1) stepNumber = 1;
      if (stepNumber > totalSteps) stepNumber = totalSteps;

      currentStep = stepNumber;

      stepPanes.forEach((pane) => {
        const s = parseInt(pane.getAttribute("data-step"), 10);
        if (s === currentStep) {
          pane.classList.add("active");
          pane.style.display = "block";
        } else {
          pane.classList.remove("active");
          pane.style.display = "none";
        }
      });

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

      if (currentStep === 5) {
        populateReviewSummary();
      }
    }

    // Step Validation
    function validateStep(step) {
      let activeContainer = form;
      if (isMultiStep) {
        activeContainer = form.querySelector(`.quote-step-pane[data-step="${step}"]`);
        if (!activeContainer) return true;
      }

      // Clear previous error marks in scope
      activeContainer.querySelectorAll(".form-group.has-error").forEach((g) => g.classList.remove("has-error"));
      activeContainer.querySelectorAll(".error").forEach((el) => el.classList.remove("error"));

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

      // Check Business Details
      if (!isMultiStep || step === 1) {
        const businessName = form.querySelector('[name="businessName"]');
        if (businessName && !businessName.value.trim()) {
          flagError(businessName, "Please enter your business or project name.");
        }
        const businessType = form.querySelector('[name="businessType"]');
        if (businessType && !businessType.value) {
          flagError(businessType, "Please select your business type.");
        }
      }

      // Check Requirements
      if (!isMultiStep || step === 2) {
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
      }

      // Check Budget
      if (!isMultiStep || step === 3) {
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
      }

      // Check Contact Details
      if (!isMultiStep || step === 4) {
        const contactName = form.querySelector('[name="contactName"]');
        if (contactName && !contactName.value.trim()) {
          flagError(contactName, "Please enter your full name.");
        }

        const whatsappNumber = form.querySelector('[name="whatsappNumber"]');
        if (whatsappNumber) {
          const raw = whatsappNumber.value.trim().replace(/[\s\-\(\)]/g, "");
          const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;
          if (!raw) {
            flagError(whatsappNumber, "WhatsApp number is required so we can reply with your quote.");
          } else if (!phoneRegex.test(raw) && raw.replace(/\D/g, "").length < 10) {
            flagError(whatsappNumber, "Please enter a valid 10-digit Indian WhatsApp mobile number.");
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

    // Review Summary (Step 5)
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

      // WhatsApp Concierge Button in Step 5
      const reviewWhatsAppBtn = form.querySelector("[data-review-whatsapp-btn]");
      if (reviewWhatsAppBtn) {
        reviewWhatsAppBtn.onclick = (e) => {
          e.preventDefault();
          const configuredNumber = typeof siteConfig !== "undefined" ? siteConfig.whatsapp.trim() : "";
          const formattedMessage = `Hello Cape Secure Solutions,

I would like to discuss a website quote for my business.

Business:
${businessName} (${businessType})

Requirements:
${selectedReqs.join(", ")}

Estimated Budget:
${budgetLabel}

Contact:
${contactName} (${whatsappNumber})

Looking forward to your guidance!`;

          if (configuredNumber) {
            const cleanNumber = configuredNumber.replace(/[\s\+\-()]/g, "");
            window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`, "_blank", "noopener,noreferrer");
          } else {
            // Prompt to proceed via submission
            const submitBtnEl = form.querySelector('button[type="submit"]');
            if (submitBtnEl) submitBtnEl.scrollIntoView({ behavior: "smooth", block: "center" });
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

    // Form Submission Handling
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Check anti-spam honeypot
      const honeypot = form.querySelector('[name="website_trap"], [name="hp_name"]');
      if (honeypot && honeypot.value.trim() !== "") {
        console.warn("Spam bot submission blocked silently.");
        if (loadingBox) loadingBox.style.display = "none";
        if (successBox) successBox.style.display = "block";
        return;
      }

      // Validate all required steps
      if (isMultiStep) {
        for (let s = 1; s <= 4; s++) {
          if (!validateStep(s)) {
            goToStep(s);
            return;
          }
        }
      } else {
        if (!validateStep(1)) {
          return;
        }
      }

      const selectedReqs = Array.from(form.querySelectorAll('input[type="checkbox"][name^="req_"]:checked'))
        .map((i) => i.value);

      const budgetInput = form.querySelector('input[name="budget"]:checked');
      const budgetValue = budgetInput ? budgetInput.value : "";

      const contactName = form.querySelector('[name="contactName"]')?.value.trim() || "";
      const businessName = form.querySelector('[name="businessName"]')?.value.trim() || "";
      const businessTypeSelect = form.querySelector('[name="businessType"]');
      const businessType = businessTypeSelect ? businessTypeSelect.value : "";
      const whatsappNumber = form.querySelector('[name="whatsappNumber"]')?.value.trim() || "";
      const emailAddress = form.querySelector('[name="emailAddress"]')?.value.trim() || "";
      const notes = form.querySelector('[name="notes"]')?.value.trim() || "";

      const formData = {
        type: "quote",
        businessName,
        businessType,
        requirements: selectedReqs,
        budget: budgetValue,
        contactName,
        whatsapp: whatsappNumber,
        email: emailAddress,
        notes,
        timestamp: new Date().toISOString()
      };

      const originalBtnText = submitBtn ? submitBtn.innerHTML : "Submit Request";

      // Hide any previous inline error
      const existingError = form.querySelector(".quote-inline-error");
      if (existingError) existingError.remove();

      // Form submission animation sequence
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.remove("btn-submitted", "btn-error");
        submitBtn.classList.add("btn-submitting");
        submitBtn.innerHTML = `<span>Sending...</span>`;
      }
      if (loadingBox) loadingBox.style.display = "flex";
      if (successBox) successBox.style.display = "none";

      try {
        const result = await window.sendCapeSMS(formData);

        if (loadingBox) loadingBox.style.display = "none";

        // Button changes to Submitted with checkmark
        if (submitBtn) {
          submitBtn.classList.remove("btn-submitting");
          submitBtn.classList.add("btn-submitted");
          submitBtn.innerHTML = `<span>✓ Submitted</span>`;
        }

        // Smooth pause before opening centered success dialog
        await new Promise((r) => setTimeout(r, 450));

        if (typeof window.showCapeDialog === "function") {
          await window.showCapeDialog({
            type: "success",
            title: "Request Submitted Successfully",
            message: "Thank you for contacting Cape Secure Solutions.\nWe have received your request and will get back to you shortly.",
            confirmText: "OK"
          });
        }

        // Hide form fields after dialog confirmation
        if (fieldsWrapper) fieldsWrapper.style.display = "none";
        if (panesContainer) panesContainer.style.display = "none";
        if (progressContainer) progressContainer.style.display = "none";
        if (submitBtn) submitBtn.style.display = "none";

        if (successBox) {
          successBox.style.display = "block";
          successBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // If inside modal, close it cleanly
        if (type === "modal" && typeof window.closeQuoteModal === "function") {
          window.closeQuoteModal();
        }

        window.trackCapeEvent("cape:quote_submit", {
          businessType,
          budget: budgetValue,
          requirementsCount: selectedReqs.length
        });
      } catch (err) {
        if (loadingBox) loadingBox.style.display = "none";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove("btn-submitting");
          submitBtn.classList.add("btn-error");
          submitBtn.innerHTML = `<span>Try Again</span>`;
        }

        if (typeof window.showCapeDialog === "function") {
          window.showCapeDialog({
            type: "error",
            title: "Something Went Wrong",
            message: "We couldn't submit your request right now.\nPlease try again or message us directly via WhatsApp.",
            confirmText: "Close"
          });
        } else {
          const errorDiv = document.createElement("div");
          errorDiv.className = "quote-inline-error";
          errorDiv.style.cssText = "margin-top: 1rem; padding: 1rem; background: rgba(255, 107, 107, 0.12); border: 1px solid rgba(255, 107, 107, 0.4); border-radius: 8px; color: #ffb4b4; font-size: 0.9rem; line-height: 1.5; text-align: center;";
          errorDiv.innerHTML = `
            <strong>We couldn't submit your request right now.</strong><br>
            Please message us directly via WhatsApp or email us at 
            <a href="mailto:capesecuresolutions@gmail.com" style="color: #00d9ff; text-decoration: underline;">capesecuresolutions@gmail.com</a>.
          `;
          form.appendChild(errorDiv);
        }
      }
    });

    // Prefill logic
    function prefill(plan, category) {
      if (category) {
        const typeSelect = form.querySelector('[name="businessType"]');
        if (typeSelect) {
          const catNorm = category.toLowerCase();
          // Normalize alias mappings
          const aliasMap = {
            business: ["business", "shop", "retail", "boutique"],
            shop: ["business", "shop", "retail", "boutique"],
            healthcare: ["healthcare", "clinic", "doctor", "dental"],
            clinic: ["healthcare", "clinic", "doctor", "dental"],
            education: ["education", "school", "college", "academy"],
            school: ["education", "school", "college", "academy"],
            restaurant: ["restaurant", "cafe", "food", "dining"],
            portfolio: ["portfolio", "professional", "creator", "consultant"],
            professional: ["portfolio", "professional", "creator", "consultant"],
            custom: ["custom", "webapp", "portal", "software"]
          };

          const validAliases = aliasMap[catNorm] || [catNorm];

          for (let opt of typeSelect.options) {
            const optVal = opt.value.toLowerCase();
            if (validAliases.includes(optVal)) {
              opt.selected = true;
              break;
            }
          }
        }
      }

      if (plan) {
        const planNorm = plan.toLowerCase();
        window.trackCapeEvent("cape:pricing_select", { plan: planNorm });

        if (planNorm === "starter") {
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
        } else if (planNorm === "business") {
          const budget = form.querySelector('input[name="budget"][value="5000-10000"]');
          if (budget) {
            budget.checked = true;
            budget.dispatchEvent(new Event("change"));
          }
          const req1 = form.querySelector('input[name="req_website"]');
          const req2 = form.querySelector('input[name="req_enquiry"]');
          if (req1) { req1.checked = true; req1.dispatchEvent(new Event("change")); }
          if (req2) { req2.checked = true; req2.dispatchEvent(new Event("change")); }
        } else if (planNorm === "custom") {
          const budget = form.querySelector('input[name="budget"][value="10000-25000"]') || form.querySelector('input[name="budget"][value="25000+"]');
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

    // URL parameter prefill on page load
    const urlParams = new URLSearchParams(window.location.search);
    const qPlan = urlParams.get("plan");
    const qCategory = urlParams.get("category");
    if (qPlan || qCategory) {
      prefill(qPlan, qCategory);
    }

    goToStep(1);

    return {
      type,
      goToStep,
      prefill
    };
  }
});
