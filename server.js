require("dotenv").config();
const express = require("express");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { fromHex } = require("@cosmjs/encoding");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");



const app = express();
const allowedOrigins = [
  "https://mylockchaincosmos.netlify.app",
  "https://mylockchain.io"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Explicitly handle preflight OPTIONS
app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS (preflight)"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


// ✅ Define app first
// globally enable CORS on all methods
/*
app.use(cors()); // Allow all for now to isolate the issue
app.options('*', cors());*/
app.use(express.json());


// ✅ Serve static frontend from ./public
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// Load config from .env
const {
  COSMOS_MNEMONIC,
  COSMOS_RPC,
  COSMOS_CHAIN_ID,
  CONTRACT_ADDRESS,
  GAS_DENOM,
  FEE_AMOUNT,
  WALLET_ADDRESS
} = process.env;

async function getClient() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(COSMOS_MNEMONIC, {
    prefix: "neutron",
  });
  const [account] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(COSMOS_RPC, wallet);
  return { client, sender: account.address };
}

// ✅ Serve the frontend
// config endpoint
app.get('/config', (req, res) => {
  res.json({
    COSMOS_CONFIG: {
      CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
      CHAIN_ID: process.env.COSMOS_CHAIN_ID,
      RPC: process.env.COSMOS_RPC,
      FEE_AMOUNT: process.env.FEE_AMOUNT,
      GAS_DENOM: process.env.GAS_DENOM,
      WALLET_ADDRESS: process.env.WALLET_ADDRESS
    }
  });
});




// 🔐 /cosmosSubmitDocument
// convert hex to base64 for the Rust contract

app.post("/cosmosSubmitDocument", async (req, res) => {
  try {
    const { documentHash } = req.body;
    if (!documentHash) throw new Error("Missing documentHash");

    const { client, sender } = await getClient();
    const hashHex = documentHash.replace(/^0x/, '');
const hashBase64 = Buffer.from(hashHex, 'hex').toString('base64');

const msg = {
  Register: {
    document_hash: hashBase64,
  },
};
    console.log("📤 Executing register() on Cosmos contract with base64:", hashBase64);

    const result = await client.execute(sender, CONTRACT_ADDRESS, msg, {
      amount: [{ denom: GAS_DENOM, amount: FEE_AMOUNT }],
      gas: "300000",
    });

    res.json({ success: true, transactionHash: result.transactionHash });
  } catch (err) {
    console.error("/cosmosSubmitDocument error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔎 /checkRegistration
// this endpoint checks if a document is registered
// it returns a boolean isRegistered
// it also returns the hashHex
app.post("/checkRegistration", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex || typeof hashHex !== 'string' || !hashHex.startsWith('0x')) {
      throw new Error("Invalid or missing hashHex");
    }

    const client = await SigningCosmWasmClient.connect(COSMOS_RPC);
    const hashBase64 = Buffer.from(hashHex.replace(/^0x/, ''), 'hex').toString('base64');

    let isRegistered = false;

    try {
      const result = await client.queryContractSmart(CONTRACT_ADDRESS, {
        IsRegistered: {
          document_hash: hashBase64,
        },
      });

      console.log("✅ Query result for checkRegistration:", result);

      isRegistered = result?.is_registered ?? false;
    } catch (queryErr) {
      console.warn("ℹ️ Contract returned empty or invalid response:", queryErr.message);
      isRegistered = false;
    }

    res.json({ isRegistered });

  } catch (err) {
    console.error("/checkRegistration error:", err);
    res.status(500).json({ error: err.message });
  }
});


// 📋 /getDetails
// 📋 /getDetails
// this endpoint checks if a document is registered
// it returns a boolean isRegistered
// it also returns the hashHex
// it also returns the registrant and timestamp
// it also returns the contract address
// it also returns the transaction hash
// it also returns the contract explorer url
// it also returns the transaction explorer url


app.post("/getDetails", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex || typeof hashHex !== 'string' || !hashHex.startsWith('0x')) {
      throw new Error("Invalid or missing hashHex");
    }

    const client = await SigningCosmWasmClient.connect(COSMOS_RPC);
    const hashBase64 = Buffer.from(hashHex.replace(/^0x/, ''), 'hex').toString('base64');

    let result;
    try {
      result = await client.queryContractSmart(CONTRACT_ADDRESS, {
        GetDetails: {
          document_hash: hashBase64,
        },
      });
    } catch (innerErr) {
      console.warn("ℹ️ Document not found or invalid response in getDetails:", innerErr.message);
      return res.status(404).json({ error: "Document not found in contract." });
    }

    if (!result || typeof result !== 'object' || !result.registrant || !result.timestamp) {
      throw new Error("Incomplete document details from contract");
    }

    res.json({
      registrant: result.registrant,
      timestamp: result.timestamp,
    });

  } catch (err) {
    console.error("/getDetails error:", err);
    res.status(500).json({ error: err.message });
  }
});


// 📧 /sendReceipt
// this endpoint sends an email receipt to the user

app.post("/sendReceipt", async (req, res) => {
  try {
    const {
      email,
      fileName,
      ipfsHash,
      hashHex,
      txHash,
      registrant,
      timestamp,
      contractAddress,
      contractExplorerUrl,
      transactionExplorerUrl,
    } = req.body;

    const readableTime = new Date(timestamp * 1000).toLocaleString();

    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
const base64 = Buffer.from(hashHex.replace(/^0x/, ""), "hex").toString("base64");
const transactionUrl = transactionExplorerUrl || `https://www.mintscan.io/neutron/txs/${txHash}`;


const htmlBody = `
  <h2>📄 Your LockChainCosmos Registration Receipt</h2>

<p><strong>🚀 File Name:</strong> ${fileName}<br/>
<em>The title of your cosmic satellite — the original filename that launched this journey.</em></p>

<p><strong>🛰️ IPFS CID:</strong> ${ipfsHash}<br/>
<em>This is your satellite’s interplanetary fingerprint — the IPFS Content Identifier that ensures it never drifts from orbit.</em></p>

<p><strong>🔗 Retrieve Link:</strong> <a href="${ipfsLink}">${ipfsLink}</a><br/>
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

<p><strong>💫 Transaction:</strong> <a href="${transactionUrl}" target="_blank">${txHash}</a><br/>
<em>The rocket that carried your hash into orbit. This transaction is your immutable trail across the Cosmos.</em></p>

`;


    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // e.g. 'luke@mylockchain.io'
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your LockChain Receipt for "${fileName}"`,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Email send error:", err);
    res.status(500).json({ error: err.message });
  }
});




console.log("✅ Loaded all routes. Server about to start...");

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 MyLockChain Cosmos API live on port ${PORT}`);
});
