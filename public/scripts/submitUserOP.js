window.handlePostUploadSubmission = async function ({ hashHex, ipfsHash, fileName }) {
  try {
    const cosmosRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/cosmosSubmitDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentHash: hashHex }),
    });

    const { transactionHash } = await cosmosRes.json();

    // Add a delay before checking registration
    await new Promise(r => setTimeout(r, 2000));

    const checkRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/checkRegistration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashHex }),
    });

    const { isRegistered } = await checkRes.json();
    if (!isRegistered) throw new Error("Document not registered yet.");

    const detailsRes = await fetch("https://mylockchaincosmos-85ea963ef0ae.herokuapp.com/getDetails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashHex }),
    });

    const { registrant, timestamp } = await detailsRes.json();
    const readableTime = new Date(timestamp * 1000).toLocaleString();


    // 🧾 Render Cosmos receipt
    const receiptEl = document.getElementById("receipt");
    const contentEl = document.getElementById("receiptContent");
    const qrCodeEl = document.getElementById("qrCode");
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    contentEl.innerHTML = `
      <h2>📄 Your LockChain Registration Receipt</h2>
      <ul>
        <li><strong>File Name:</strong> ${fileName}</li>
        <li><strong>IPFS CID:</strong> ${ipfsHash}</li>
        <li><strong>Document Hash:</strong> ${hashHex}</li>
        <li><strong>Registered By:</strong> ${registrant}</li>
        <li><strong>Timestamp:</strong> ${readableTime}</li>
        <li><strong>Contract:</strong> <a href="https://explorer.ntrn.tech/neutron/account/neutron167ty2yfhcjupcwrqq8zr3cst09zn2t3sfcrhxrhpqcvjexv72ufqe8gckq" target="_blank">View on Neutron Explorer</a></li>
        <li><strong>Transaction:</strong> <a href="https://explorer.ntrn.tech/neutron/tx/${transactionHash.toLowerCase()}" target="_blank">${transactionHash}</a></li>
      </ul>
      <label for="email">📧 Want a copy of this receipt by email?</label>
      <input type="email" id="emailInput" placeholder="you@example.com" />
      <button onclick="sendReceiptByEmail()">Send Receipt</button>
    `;

    qrCodeEl.innerHTML = '';
    new QRCode(qrCodeEl, ipfsLink);
    receiptEl.style.display = 'block';
    receiptEl.scrollIntoView({ behavior: 'smooth' });

    // 📧 Send Receipt Email Function
    window.sendReceiptByEmail = async function () {
      const email = document.getElementById("emailInput").value;
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
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
            timestamp
          })
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
// This function handles the submission of a document hash to the Cosmos blockchain.
// It sends the hash to the backend, waits for confirmation, and then fetches the registration details.
// It also provides a feature to send the receipt via email.
// It uses the Fetch API to communicate with the backend and QRCode.js to generate a QR code for the IPFS link.
