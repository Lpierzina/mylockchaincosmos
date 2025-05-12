const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');

router.post('/getDetails', async (req, res) => {
  try {
    const { hashHex } = req.body;

    if (!hashHex || !/^0x[a-fA-F0-9]{64}$/.test(hashHex)) {
      return res.status(400).json({ error: 'Invalid hashHex (must be 0x-prefixed Keccak256)' });
    }

    const base64Hash = Buffer.from(hashHex.slice(2), 'hex').toString('base64');

    const queryMsg = JSON.stringify({
      get_details: {
        document_hash: base64Hash
      }
    });

    const CONTRACT_ADDR = process.env.COSMOS_CONTRACT_ADDRESS;
    if (!CONTRACT_ADDR) throw new Error("Missing COSMOS_CONTRACT_ADDRESS");

    const cmd = `neutrond query wasm contract-state smart ${CONTRACT_ADDR} '${queryMsg}' --output json`;
    const stdout = execSync(cmd, { encoding: 'utf8' });
    const result = JSON.parse(stdout);

    if (!result.data || !result.data.registrant || !result.data.timestamp) {
      return res.json({ isRegistered: false });
    }

    const { registrant, timestamp } = result.data;

    return res.json({
      isRegistered: true,
      registrant,
      timestamp,
      hashHex,
    });

  } catch (err) {
    console.error('❌ Error in /getDetails:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// This code defines an Express.js route for handling POST requests to the "/getDetails" endpoint.
// It retrieves the document details based on a provided hashHex, which is expected to be a 0x-prefixed Keccak256 hash.
