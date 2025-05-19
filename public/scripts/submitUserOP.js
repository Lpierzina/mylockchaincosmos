window.handlePostUploadSubmission = async function ({ hashHex, ipfsHash, fileName }) {
  try {
    const contractAddress = "neutron1wgcgraqew83d9k2wtkvwldrwml8dg7gpyvf6gymhz2n0x6vrkwjqx2htpr"; // latest from deployment
    const contractLink = `https://www.mintscan.io/neutron/account/${contractAddress}`;
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    // 1. Submit the document hash to your backend
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

    // 2. Wait up to 15 seconds for registration confirmation
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

      console.warn(`⏳ Not registered yet, retrying... (${i + 1}/5)`);
      await new Promise(r => setTimeout(r, 3000)); // wait 3s
    }

    if (!isRegistered) throw new Error("Document not registered yet.");
    console.log("✅ Document registered successfully.");

    // 3. Fetch registration details
    const detailsRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/getDetails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashHex }),
    });

    const { registrant, timestamp } = await detailsRes.json();
    const readableTime = new Date(timestamp * 1000).toLocaleString();

    // 4. Render receipt
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
  <em>This is your satellite’s interplanetary fingerprint — the IPFS Content Identifier that ensures it never drifts from orbit.</em></p>

  <p><strong>🔗 Retrieve Link:</strong> <a href="${ipfsLink}" target="_blank">${ipfsLink}</a><br/>
  <em>Beam it back from the InterPlanetary File System any time. Your document is now decentralized and always retrievable.</em></p>

  <p><strong>🧬 Document Hash (Hex):</strong> ${hashHex}<br/>
  <em>This hex string is your file’s cryptographic DNA — a tamper-proof proof-of-existence forged at the edge of the Interchain.</em></p>

  <p><strong>📦 Base64 Format:</strong> ${base64}<br/>
  <em>This is how your file’s essence travels through the Cosmos. CosmWasm contracts speak Base64 — it’s the lingua franca of smart contracts on Neutron.</em></p>

  <p><em>💡 Note:</em> CosmWasm requires base64-encoded input for binary data. That’s how we store your digital footprint in orbit.</p>

  <p><strong>👤 Registered By:</strong> ${registrant}<br/>
  <em>This is the identity that signed your cosmic ledger — the wallet that etched your hash into the stars.</em></p>

  <p><strong>🕰️ Timestamp:</strong> ${readableTime}<br/>
  <em>Temporal coordinates of your launch — the precise Earth time your document entered the blockchain constellations.</em></p>

  <p><strong>📡 Contract:</strong> <a href="${contractExplorerUrl}" target="_blank">View on Neutron Explorer</a><br/>
  <em>This smart contract is your ground station — it holds the registration beacon forever on the Neutron chain.</em></p>

  <p><strong>💫 Transaction:</strong> <a href="${transactionExplorerUrl}" target="_blank">${transactionHash}</a><br/>
  <em>The rocket that carried your hash into orbit. This transaction is your immutable trail across the Cosmos.</em></p>

  <label for="email">📧 Want a copy of this receipt by email?</label>
  <input type="email" id="emailInput" placeholder="you@example.com" />
  <button onclick="sendReceiptByEmail()">Send Receipt</button>
`;

    // QR code safely
    try {
      qrCodeEl.innerHTML = '';
      new QRCode(qrCodeEl, ipfsLink);
    } catch (qrErr) {
      console.warn("⚠️ QR Code generation failed:", qrErr.message);
    }

    receiptEl.style.display = 'block';
    receiptEl.scrollIntoView({ behavior: 'smooth' });

    // 5. Optional email receipt
    window.sendReceiptByEmail = async function () {
      const email = document.getElementById("emailInput").value;
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      localStorage.setItem("email", email); // store for later

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
          alert("📩 Receipt sent successfully!");
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
};
