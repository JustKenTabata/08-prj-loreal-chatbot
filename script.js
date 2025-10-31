/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
// Minimal system prompt restricting the assistant to L'Oréal products and routines.
const SYSTEM_PROMPT = `You are a helpful assistant that ONLY answers questions related to L'Oréal products, skincare and haircare routines, product recommendations, ingredients, usage instructions, and store/online availability for L'Oréal-branded products. If a user asks something outside that scope, politely reply that you can only assist with L'Oréal products and offer to help with product recommendations or routine advice. Do not provide medical diagnoses or prescriptions; instead, recommend consulting a professional when necessary. Keep answers friendly and concise.`;

// Small utility to append messages to the chat window
function appendMessage(who, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${who}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  // scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initial greeting
chatWindow.innerHTML = "";
appendMessage(
  "bot",
  "👋 Hello! I'm your L'Oréal product advisor. Ask me about L'Oréal products, routines or recommendations."
);

// Helper to toggle UI state while fetching
function setLoading(isLoading) {
  userInput.disabled = isLoading;
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = isLoading;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // show user's message
  appendMessage("user", text);
  userInput.value = "";

  // show a loading placeholder from bot
  appendMessage("bot", "Thinking...");
  setLoading(true);

  // Build messages array for the Chat Completions API
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: text },
  ];

  try {
    if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not defined. Add it to secrets.js or configure a server-side proxy."
      );
    }

    // Direct browser call to OpenAI's Chat Completions endpoint. Note: many browsers
    // will block this due to CORS unless the server allows it. If you hit CORS
    // errors, use a server-side proxy or Cloudflare Worker.
    // `secrets.js` declares `ALLOW_DIRECT_BROWSER_CALLS` with `const`, which does
    // not create a `window.` property. Check the variable directly instead of
    // `window.ALLOW_DIRECT_BROWSER_CALLS` so the flag in `secrets.js` is respected.
    if (
      typeof ALLOW_DIRECT_BROWSER_CALLS === "undefined" ||
      !ALLOW_DIRECT_BROWSER_CALLS
    ) {
      throw new Error(
        "Direct browser calls are disabled. Use a server-side proxy or enable ALLOW_DIRECT_BROWSER_CALLS in secrets.js."
      );
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    // remove last 'Thinking...' message
    const lastBot = chatWindow.querySelectorAll(".message.bot");
    if (lastBot && lastBot.length) {
      const last = lastBot[lastBot.length - 1];
      // if it contains exactly 'Thinking...' replace it, otherwise keep
      if (last.textContent === "Thinking...") last.remove();
    }

    if (!resp.ok) {
      const errText = await resp.text();
      appendMessage(
        "bot",
        `Error: ${resp.status} ${resp.statusText} - ${errText}`
      );
      setLoading(false);
      return;
    }

    const data = await resp.json();

    // Chat Completions returns: data.choices[0].message.content
    const assistant = data?.choices?.[0]?.message?.content;
    if (assistant) {
      appendMessage("bot", assistant);
    } else {
      appendMessage("bot", "No response from the API.");
    }
  } catch (err) {
    console.error(err);
    appendMessage("bot", `Request failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
});
