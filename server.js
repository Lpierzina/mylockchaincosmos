require("dotenv").config();
const express = require("express");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { fromHex } = require("@cosmjs/encoding");
const cors = require("cors");
const path = require("path");




const app = express(); // ✅ Define app first
// globally enable CORS on all methods
/*
app.use(cors({
  origin: 'https://mylockchaincosmos.netlify.app',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// explicitly handle preflight
app.options('*', cors({
  origin: 'https://mylockchaincosmos.netlify.app',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type']
}));  */
// ✅ Fix crash: use only relative path for CORS origin (not absolute URL)
app.use(cors()); // Allow all for now to isolate the issue
app.options('*', cors());
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
app.post("/checkRegistration", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex) throw new Error("Missing hashHex");

    const client = await SigningCosmWasmClient.connect(COSMOS_RPC);
    const hashBase64 = Buffer.from(hashHex.replace(/^0x/, ''), 'hex').toString('base64');

const result = await client.queryContractSmart(CONTRACT_ADDRESS, {
  IsRegistered: {
    document_hash: hashBase64,
  },
});

    console.log("✅ Query result for checkRegistration:", result);

    res.json({ isRegistered: result.is_registered ?? false }); // <-- fix

  } catch (err) {
    console.error("/checkRegistration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📋 /getDetails
app.post("/getDetails", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex) throw new Error("Missing hashHex");

    const client = await SigningCosmWasmClient.connect(COSMOS_RPC);
    const hashBase64 = Buffer.from(hashHex.replace(/^0x/, ''), 'hex').toString('base64');

const result = await client.queryContractSmart(CONTRACT_ADDRESS, {
  GetDetails: {
    document_hash: hashBase64,
  },
});


    res.json({
      registrant: result.registrant,
      timestamp: result.timestamp,
    });
  } catch (err) {
    console.error("/getDetails error:", err);
    res.status(500).json({ error: err.message });
  }
});
console.log("✅ Loaded all routes. Server about to start...");

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 MyLockChain Cosmos API live on port ${PORT}`);
});
