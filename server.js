require("dotenv").config();
const express = require("express");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { fromHex } = require("@cosmjs/encoding");
const cors = require("cors");
const path = require("path");




const app = express(); // ✅ Define app first
app.use(cors({
  origin: 'https://mylockchaincosmos.netlify.app',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

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
    const msg = {
      register: {
        document_hash: fromHex(documentHash.replace(/^0x/, "")),
      },
    };

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
    const result = await client.queryContractSmart(CONTRACT_ADDRESS, {
      is_registered: {
        document_hash: fromHex(hashHex.replace(/^0x/, "")),
      },
    });

    res.json({ isRegistered: result });
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
    const result = await client.queryContractSmart(CONTRACT_ADDRESS, {
      get_details: {
        document_hash: fromHex(hashHex.replace(/^0x/, "")),
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

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 MyLockChain Cosmos API live on port ${PORT}`);
});
