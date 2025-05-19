window.handlePostUploadSubmission = async function ({ hashHex, ipfsHash, fileName }) {
  try {
    const contractAddress = "neutron1wgcgraqew83d9k2wtkvwldrwml8dg7gpyvf6gymhz2n0x6vrkwjqx2htpr";
    const contractLink = `https://www.mintscan.io/neutron/account/${contractAddress}`;
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    const cosmosRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/cosmosSubmitDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentHash: hashHex }),
    });

    function hexToBase64(hexString) {
      const cleanHex = hexString.replace(/^0x/, '');
      const binary = cleanHex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
      return btoa(binary);
    }

    const { transactionHash } = await cosmosRes.json();
    const txLink = `https://www.mintscan.io/neutron/tx/${transactionHash}`;

    let isRegistered = false;
    for (let i = 0; i < 5; i++) {
      const checkRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/checkRegistration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashHex }),
      });

      const json = await checkRes.json();
      isRegistered = json.isRegistered;
      if (isRegistered) break;

      await new Promise(r => setTimeout(r, 3000));
    }

    if (!isRegistered) throw new Error("Document not registered yet.");

    const detailsRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/getDetails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashHex }),
    });

    const { registrant, timestamp } = await detailsRes.json();
    const readableTime = new Date(timestamp * 1000).toLocaleString();

    const receiptEl = document.getElementById("receipt");
    const contentEl = document.getElementById("receiptContent");
    const qrCodeEl = document.getElementById("qrCode");

    const base64 = hexToBase64(hashHex);
    const contractExplorerUrl = `https://www.mintscan.io/neutron/address/${contractAddress}`;
    const transactionExplorerUrl = `https://www.mintscan.io/neutron/tx/${transactionHash}`;

    contentEl.innerHTML = `
      <h2>📄 Your LockChainCosmos Registration Receipt</h2>
      <p><strong>🚀 File Name:</strong> ${fileName}<br/>
      <em>The title of your cosmic satellite — the original filename that launched this journey.</em></p>
      <p><strong>🛰️ IPFS CID:</strong> ${ipfsHash}<br/>
      <em>This is your satellite’s interplanetary fingerprint...</em></p>
      <p><strong>🔗 Retrieve Link:</strong> <a href="${ipfsLink}" target="_blank">${ipfsLink}</a><br/></p>
      <p><strong>🧬 Document Hash (Hex):</strong> ${hashHex}<br/></p>
      <p><strong>📦 Base64 Format:</strong> ${base64}<br/></p>
      <p><em>💡 Note:</em> CosmWasm requires base64-encoded input...</p>
      <p><strong>👤 Registered By:</strong> ${registrant}<br/></p>
      <p><strong>🕰️ Timestamp:</strong> ${readableTime}<br/></p>
      <p><strong>📡 Contract:</strong> <a href="${contractExplorerUrl}" target="_blank">View on Neutron Explorer</a></p>
      <p><strong>💫 Transaction:</strong> <a href="${transactionExplorerUrl}" target="_blank">${transactionHash}</a></p>
      <label for="email">📧 Want a copy of this receipt by email?</label>
      <input type="email" id="emailInput" placeholder="you@example.com" />
      <button onclick="sendReceiptByEmail()">Send Receipt</button>
    `;

    try {
      qrCodeEl.innerHTML = '';
      new QRCode(qrCodeEl, ipfsLink);
    } catch (qrErr) {
      console.warn("⚠️ QR Code generation failed:", qrErr.message);
    }

    receiptEl.style.display = 'block';
    receiptEl.scrollIntoView({ behavior: 'smooth' });

    // ✅ Limit sendReceiptByEmail to 3 attempts
    let emailSendCount = 0;

    window.sendReceiptByEmail = async function () {
      const emailInput = document.getElementById("emailInput");
      const sendButton = emailInput.nextElementSibling;
      const email = emailInput.value;

      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      if (emailSendCount >= 3) {
        alert("🚫 You’ve reached the maximum number of email sends for this receipt.");
        return;
      }

      try {
        const res = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/sendReceipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            fileName,
            ipfsHash,
            hashHex,
            txHash: transactionHash,
            registrant,
            timestamp,
            contractAddress,
            contractExplorerUrl: contractLink,
            transactionExplorerUrl: txLink
          }),
        });

        const json = await res.json();
        if (json.success) {
          emailSendCount++;
          alert("📩 Receipt sent successfully!");

          if (emailSendCount >= 3) {
            sendButton.disabled = true;
            sendButton.textContent = "Limit Reached (3/3)";
            sendButton.style.backgroundColor = "#ccc";
            sendButton.style.cursor = "not-allowed";
            sendButton.classList.remove("pulse-once");
          }
        } else {
          throw new Error(json.error || "Email send failed");
        }
      } catch (err) {
        console.error("❌ Failed to send email receipt:", err);
        alert("Error sending receipt. Try again later.");
      }
    };

  } catch (err) {
    console.error("❌ Cosmos submit error:", err);
    alert("❌ Submission failed: " + err.message);
  }
}; // <-- ✅ This was missing!
