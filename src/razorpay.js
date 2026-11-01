let script;
function loadCheckoutJs() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://checkout.razorpay.com/v1/checkout.js";
    tag.async = true;
    tag.onload = resolve;
    tag.onerror = () => {
      script = undefined;
      tag.remove();
      reject(new Error("The payment window could not load. Check your connection."));
    };
    document.body.appendChild(tag);
  });
  return script;
}

// Resolves with Razorpay's handler payload, which the server re-verifies before
// an order is marked paid. A closed modal is a normal user choice, not a failure.
export async function openRazorpay(params) {
  await loadCheckoutJs();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      ...params,
      handler: resolve,
      modal: {
        ondismiss: () =>
          reject(
            new Error(
              "Payment was not completed. Your order is saved — resume it any time.",
            ),
          ),
      },
    });
    rzp.on("payment.failed", (response) =>
      reject(
        new Error(
          response?.error?.description ||
            "The payment could not be completed. Try again.",
        ),
      ),
    );
    rzp.open();
  });
}
