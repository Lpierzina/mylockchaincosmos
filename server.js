// server.js
require("dotenv").config();
const express = require("express");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { fromHex, toHex } = require("@cosmjs/encoding");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

  const client = await SigningCosmWasmClient.connectWithSigner(
    COSMOS_RPC,
    wallet
  );

  return { client, sender: account.address };
}

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

    const result = await client.execute(
      sender,
      CONTRACT_ADDRESS,
      msg,
      {
        amount: [{ denom: GAS_DENOM, amount: FEE_AMOUNT }],
        gas: "300000",
      }
    );

    return res.json({ success: true, transactionHash: result.transactionHash });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MyLockChain Cosmos API live on port ${PORT}`);
});
