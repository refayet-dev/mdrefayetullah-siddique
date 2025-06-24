// click the + button to open the modal
function openQuickViewModal(productHandle, bonusProductHandle) {
  const modal = document.querySelector("lookbook-grid-modal");
  fetch(
    `/products/${productHandle}?section_id=lookbook-grid-modal&bonus=${bonusProductHandle}`
  )
    .then((r) => r.text())
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const content = doc.querySelector("lookbook-grid-modal");
      modal.innerHTML = content.innerHTML;
      if (bonusProductHandle) {
        fetch(`/products/${bonusProductHandle}.js`)
          .then((r) => r.json())
          .then((bonusProduct) => {
            // Add the bonus variants data
            const script = document.createElement("script");
            script.id = `LookbookBonusProductVariants`;
            script.type = "application/json";
            script.textContent = JSON.stringify(bonusProduct.variants);
            modal.appendChild(script);
          });
      }
      document.body.style.overflow = "hidden";
      modal.classList.add("is-open");
      initLookbookVariantPicker();
    });
}
// Close the modal
function closeQuickViewModal() {
  let lookbookGridModal = document.querySelector("lookbook-grid-modal");
  lookbookGridModal.classList.remove("is-open");
  lookbookGridModal.innerHTML = "";
  document.body.style.overflow = "";
}
closeQuickViewModal();

// Initialize variant picker to change the variant id when user select the color or size
function initLookbookVariantPicker() {
  document.querySelectorAll("lookbook-grid-modal").forEach(function (modal) {
    const form = modal.querySelector("form");
    if (!form) return;

    const productForm = form.closest("product-form");
    if (!productForm) return;

    const productId = productForm.dataset.productId;
    const variantsJson = document.getElementById(
      `LookbookProductVariants-${productId}`
    );
    if (!variantsJson) return;

    const variants = JSON.parse(variantsJson.textContent);

    let selectedOptions = new Array(variants[0].options.length).fill("");

    // Color buttons
    form.querySelectorAll(".color-swatch").forEach((btn) => {
      btn.addEventListener("click", function () {
        form
          .querySelectorAll(".color-swatch")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const optionIndex = parseInt(btn.dataset.optionIndex);
        const optionValue = btn.dataset.optionValue;
        console.log(optionValue);
        selectedOptions[optionIndex] = optionValue;
        updateVariantId();
      });
    });

    // Size select
    form.querySelectorAll(".size-select").forEach((select) => {
      select.addEventListener("change", function () {
        const optionIndex = parseInt(select.dataset.optionIndex);
        const optionValue = select.value;
        console.log(optionValue);
        selectedOptions[optionIndex] = optionValue;
        updateVariantId();
      });
    });

    if (variants.length > 0) {
      selectedOptions = [...variants[0].options];
    }

    const hiddenInput = form.querySelector(".product-variant-id");

    function updateVariantId() {
      const variant = variants.find((v) => {
        return v.options.every((opt, idx) => selectedOptions[idx] === opt);
      });
      if (variant && hiddenInput) {
        hiddenInput.value = variant.id;
      }
    }

    // Initial variant update
    updateVariantId();

    // Get bonus variants data
    const getBonusVariants = () => {
      const bonusVariantsJson = modal.querySelector(
        "#LookbookBonusProductVariants"
      );
      if (!bonusVariantsJson) return Promise.resolve([]);

      try {
        const bonusVariants = JSON.parse(bonusVariantsJson.textContent);
        return Promise.resolve(bonusVariants);
      } catch (err) {
        console.warn("Bonus variant JSON parsing failed:", err);
        return Promise.resolve([]);
      }
    };

    // Set up form submission handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const loading = form.querySelector(".loading");
      if (btn) btn.disabled = true;
      if (loading) loading.classList.remove("hidden");

      try {
        // Add main product to cart
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: hiddenInput.value, quantity: 1 }),
        });

        const sizeVal = selectedOptions[0];
        const colorVal = selectedOptions[1];

        // Get bonus variants when match the condition
        if (colorVal === "Black" && sizeVal === "M") {
          const bonusVariants = await getBonusVariants();

          if (bonusVariants.length > 0) {
            let matchedBonus =
              bonusVariants.find((v) => {
                return (
                  (v.option1 === "M" || v.option2 === "M") &&
                  (v.option1 === "Black" || v.option2 === "Black")
                );
              }) || bonusVariants[0];

            if (matchedBonus) {
              await fetch("/cart/add.js", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: matchedBonus.id, quantity: 1 }),
              });
            }
          }
        }

        window.location.href = "/cart";
      } catch (err) {
        console.error("Error adding to cart:", err);
      } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.classList.add("hidden");
      }
    });
  });
}
