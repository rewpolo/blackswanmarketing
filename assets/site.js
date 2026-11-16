document.querySelectorAll("form[data-endpoint]").forEach(function (form) {
  var status = form.querySelector(".status");
  var button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    status.className = "status";
    status.textContent = "Sending...";
    button.disabled = true;
    try {
      var res = await fetch(form.dataset.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      var out = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again.");
      form.reset();
      status.textContent = form.dataset.success;
      status.classList.add("ok");
    } catch (err) {
      status.textContent = err.message;
      status.classList.add("err");
    } finally {
      button.disabled = false;
      var widget = form.querySelector(".cf-turnstile");
      if (window.turnstile && widget) window.turnstile.reset(widget);
    }
  });
});
